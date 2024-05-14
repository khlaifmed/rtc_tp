const client_socket = new WebSocket('ws://localhost:8082');
let userid=0;
client_socket.onopen = async () => {
    console.log("Connected to server");

    client_socket.onmessage = async function incoming(message) {
        let msg_server = JSON.parse(message.data);

        console.log("Received icecandidate:", msg_server);
        
        if (msg_server.type === 'offer') {
            console.log("Offer received");
            createAnswer(msg_server);
        }
        
        if (msg_server.type === 'answer') {
            console.log("Answer received");
            await peerconnection.setRemoteDescription(msg_server);
            console.log("remote description set");
        }

        if (msg_server.type === 'icecandidate') {
            console.log("Ice candidate received");
            await peerconnection.addIceCandidate(msg_server.icecandidate);
            console.log("candidate added");
        }

        if(msg_server.type==='chat_message'){
            let chat_messages=document.getElementById('chat-messages');
            chat_messages.innerHTML+=`<div class="message user2">
            <div class="first">User2</div>
            <div class="message-content ">${msg_server.message}</div> 
            </div>`;
        }
    };
};

let local_videoElm = document.getElementById('local-video');
let remoteVideoElm = document.getElementById('remote-video');
let start_btn = document.getElementById('start');
let chat_btn = document.getElementById('chat');
let close= document.getElementById('close');
let send=document.getElementById('send');


let local_stream;
let peerconnection;
let remote_stream;

const stun_servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
};

const init = async () => {
    try {
        local_stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        local_videoElm.srcObject = local_stream;
    } catch (err) {
        console.error("Error accessing media devices:", err);
    }
};

const createPeerConnection = async (offer) => {
    try {
        peerconnection = new RTCPeerConnection(stun_servers);
        
        remote_stream = new MediaStream();
        remoteVideoElm.srcObject = remote_stream;
        remoteVideoElm.style.display = "block";

        local_videoElm.classList.add('smallFrame');

        local_stream.getTracks().forEach(track => peerconnection.addTrack(track, local_stream));

        peerconnection.ontrack = (event) => {
            event.streams[0].getTracks().forEach(track => remote_stream.addTrack(track));
        };

        peerconnection.onicecandidate = (event) => {
            if (event.candidate) {
                client_socket.send(JSON.stringify({"type":"icecandidate","icecandidate":event.candidate}));
            }
        };

    } catch (err) {
        console.error("Error creating peer connection:", err);
    }
};

const start = async () => {
    await createPeerConnection();
    createOffer();

};

const createOffer = async () => {
    try {
        let offer = await peerconnection.createOffer();
        await peerconnection.setLocalDescription(offer);
        console.log("Offer created:", offer);
        client_socket.send(JSON.stringify(offer));
    } catch (err) {
        console.error("Error creating offer:", err);
    }
};

const createAnswer = async (offer) => {
    await createPeerConnection();
    userid=1;
    peerconnection.setRemoteDescription(offer);
    try {
        let answer = await peerconnection.createAnswer();
        await peerconnection.setLocalDescription(answer);
        console.log("Answer created:", answer);
        client_socket.send(JSON.stringify(answer));
    } catch (err) {
        console.error("Error creating answer:", err);
    }
};

init();


let show_chat=()=>{
    document.getElementById('chat-box').style.display='block'

}

let send_message=()=>{
    let message=document.getElementById('chat-input').value;
    client_socket.send(JSON.stringify({"type":"chat_message","message":message,"userid":userid}));
    let chat_messages=document.getElementById('chat-messages');

    
    chat_messages.innerHTML+=`<div class="message user1">
        <div class="first">Moi</div>
        <div class="message-content ">${message}</div> 
        </div>`;
    document.getElementById('chat-input').value="";

    chat_messages.scrollTop=chat_messages.scrollHeight;
    
    

}

chat_btn.addEventListener('click', show_chat);
start_btn.addEventListener('click', start);
close.addEventListener('click',()=>{
    document.getElementById('chat-box').style.display='none'
});
send.addEventListener("click",send_message)

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("id");
const clientId = urlParams.get("client");
console.log(`Room ${roomId}, Client ${clientId}`);
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

const streamConstraints = {
  video: true,
  audio: true,
};

const iceServers = {
  iceServers: [
    {
      url: "stun:stun.l.google.com:19302",
    },
    {
      url: "stun:stun.services.mozilla.com",
    }
  ],
};

let isCaller = false;
let peerConnection;
const socket = io("http://localhost:3001");

socket.emit("join", {roomId, clientId});

socket.on("joined", (shouldInitiate) => {
  navigator.mediaDevices
  .getUserMedia(streamConstraints)
  .then((stream) => {
    if (localVideo) localVideo.srcObject = stream;
    isCaller = shouldInitiate;
    if (!shouldInitiate) socket.emit("ready", roomId);
  })
  .catch((error) => {
    console.log("Error accessing media devices.", error);
  });
});

socket.on("ready", () => {
  if (isCaller) {
    peerConnection = new RTCPeerConnection(iceServers);
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("candidate", {
          type: "candidate",
          candidate: event.candidate.candidate,
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          room: roomId,
        });
      }
    };
    peerConnection.onaddstream = (event) => {
      if (remoteVideo) remoteVideo.srcObject = event.stream;
    };
    peerConnection.addStream(localVideo.srcObject);

    peerConnection.createOffer((sessionDescription) => {
      peerConnection.setLocalDescription(sessionDescription);
      socket.emit("offer", {
        type: "offer",
        sdp: sessionDescription,
        room: roomId,
      });
    }, (error) => {
      console.log("Error creating offer", error);
    });
  }
});

socket.on("offer", (event) => {
  if (!isCaller) {
    peerConnection = new RTCPeerConnection(iceServers);
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("candidate", {
          type: "candidate",
          candidate: event.candidate.candidate,
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          room: roomId,
        });
      }
    };
    peerConnection.onaddstream = (event) => {
      if (remoteVideo) remoteVideo.srcObject = event.stream;
    };
    peerConnection.addStream(localVideo.srcObject);

    peerConnection.setRemoteDescription(new RTCSessionDescription(event));

    peerConnection.createAnswer((sessionDescription) => {
      peerConnection.setLocalDescription(sessionDescription);
      socket.emit("answer", {
        type: "answer",
        sdp: sessionDescription,
        room: roomId,
      });
    }, (error) => {
      console.log("Error creating answer", error);
    });
  }
});

socket.on("answer", (event) => {
  peerConnection.setRemoteDescription(new RTCSessionDescription(event));
});

socket.on("disconnected", (socketId) => {
  if (peerConnection) {
    peerConnection.close();
    window.close();
  }
});

socket.on("candidate", (event) => {
  const candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  });
  peerConnection.addIceCandidate(candidate);
});

socket.on("message", (event) => {
  const messages = document.getElementsByClassName("messages")[0];
  const message = document.createElement("li");
  message.appendChild(
    document.createTextNode(`${event.name}: ${event.message}`)
  );
  messages.appendChild(message);
});

function sendMessage() {
  const message = document.getElementById("message").value;
  socket.emit("message", {clientId, message, room: roomId});
  const messages = document.getElementsByClassName("messages")[0];
  const message1 = document.createElement("li");
  message1.appendChild(
    document.createTextNode(`You: ${message}`)
  );
  messages.appendChild(message1); 
  document.getElementById("message").value = "";
}

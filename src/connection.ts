
const peerConnectionConfig = {
    'iceServers': [
      { 'urls': 'stun:stun.stunprotocol.org:3478' },
      { 'urls': 'stun:stun.l.google.com:19302' },
    ]
}
export abstract class Connection {
    private uuid: string;
    private name: string;
    private server_socket: WebSocket;
    protected peer_connection: RTCPeerConnection;
    private ice_candidates: RTCIceCandidate[];
    abstract data_channel: RTCDataChannel;
    private remote_video: HTMLVideoElement;
    constructor(name : string) {
        this.uuid = createUUID();
        this.name = name;
        this.server_socket = new WebSocket('wss://' + window.location.host + '/');
        this.server_socket.onmessage = this.onMessage;
        this.peer_connection = new RTCPeerConnection(peerConnectionConfig);
        this.ice_candidates = [];
        this.peer_connection.onicecandidate = this.onIceCandidate;
        this.peer_connection.ontrack = this.gotRemoteStream;
        this.remote_video = document.createElement('video');
    }

    private onMessage(event: MessageEvent) {
        let data = JSON.parse(event.data);

        if (data.uuid !== this.uuid) {
            return;
        }

        switch (data.type) {
            case "offer_removed":
                break;
            case "spd":
                if (data.type === "offer") {
                    this.on_spd_offer(data.data);
                } else if (data.type === "answer") {
                    this.on_spd_answer(data.data);
                }
                break;
            case "ice":
                this.peer_connection.addIceCandidate(new RTCIceCandidate(data.data));
                break;
            default:
                console.log("Unknown message type: " + data.type);
                break;
        }
    }

    protected abstract on_spd_offer(data: any): void;
    protected abstract on_spd_answer(data: any): void;
    public abstract start(): void;

    private onIceCandidate(event: RTCPeerConnectionIceEvent) {
        if (event.candidate) {
            this.ice_candidates.push(event.candidate);
        }
    }

    private gotRemoteStream(event: RTCTrackEvent) {
        console.log("Got remote stream");
        this.remote_video.srcObject = event.streams[0];
    }

    protected send_message_to_server(type: string, data: any) {
        this.server_socket.send(JSON.stringify({
            'uuid': this.uuid,
            'name': this.name,
            'type': type,
            'data': data,
        }));
    }

    protected abstract on_data_channel_message(event: MessageEvent): void;
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
  
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
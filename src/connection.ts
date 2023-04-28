const peerConnectionConfig = {
    'iceServers': [
      { 'urls': 'stun:stun.stunprotocol.org:3478' },
      { 'urls': 'stun:stun.l.google.com:19302' },
    ]
}

export type PeerToPeerConnection =
{
    peer_connection: RTCPeerConnection;
    data_channel: RTCDataChannel;
    uuid: string;
    name: string;
    ice_candidates: RTCIceCandidate[];
}

export abstract class Connection {
    private uuid: string;
    private name: string;
    private server_socket: WebSocket;
    protected peer_connections: Map<string, PeerToPeerConnection>;
    protected unconnected_peers: PeerToPeerConnection[];
    protected remote_video: HTMLVideoElement;

    constructor(name : string, websocket : WebSocket) {
        this.uuid = createUUID();
        console.log('https://' + window.location.host + '/?' + this.uuid); 
        this.name = name;
        this.server_socket = websocket;//new WebSocket('wss://' + window.location.host + '/');
        this.server_socket.onmessage = this.onMessage;

        this.peer_connections = new Map<string, PeerToPeerConnection>();
        this.unconnected_peers = [];
        this.remote_video = document.createElement('video');
        this.remote_video.autoplay = true;
        document.body.appendChild(this.remote_video);
    }

    protected is_socket_connected() {
        return this.server_socket.readyState === WebSocket.OPEN;
    }

    protected addPeerConnection() {
        const peer = new RTCPeerConnection(peerConnectionConfig)
        
        peer.ontrack = this.gotRemoteStream;
        const data_channel = peer.createDataChannel("data", { negotiated: true, id: 0 });
        data_channel.onopen = this.on_data_channel_open;
        data_channel.onmessage = this.on_data_channel_message;
        const p2p :PeerToPeerConnection = {
            peer_connection: peer,
            data_channel: data_channel,
            uuid: this.uuid,
            name: this.name,
            ice_candidates: [],
        }

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                p2p.ice_candidates.push(event.candidate);
            }
        };

        this.unconnected_peers.push(p2p);
        
        return peer;
    }

    private onMessage = async (event: MessageEvent) => {
        let data = JSON.parse(event.data);

        if (data.uuid === this.uuid) {
            return;
        }
        let payload;

        switch (data.type) {
            case "offer_removed":
                break;
            case "sdp":
                payload = JSON.parse(data["data"]);
                if (payload["sdp"]["type"] === "offer") {
                    console.log("Got SDP offer");
                    // log type of on sdp offer
                    this.on_sdp_offer(data.uuid, payload);
                } else if (payload["sdp"]["type"]=== "answer") {
                    console.log("Got SDP answer");
                    this.on_sdp_answer(data.uuid, payload);
                }
                break;
            case "ice":
                payload = JSON.parse(data["data"]);
                const peer = this.peer_connections.get(data.uuid)!;
                let n = 0;
                // wait for peer to be added
                while (!peer) {
                    n++;
                    if (n > 100) {
                        console.error("Peer not found");
                        return;
                    }
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                const ice = new RTCIceCandidate(payload["ice"]);
                peer.peer_connection.addIceCandidate(ice);
                console.log("Added ICE candidate");
                break;
            default:
                console.log("Unknown message type: " + data.type);
                break;
        }
    }

    private gotRemoteStream = (event: RTCTrackEvent) => {
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

    protected abstract on_data_channel_message : (event: MessageEvent) => void;
    protected abstract on_data_channel_open : (event: Event) => void;
    protected abstract on_sdp_offer : (uuid: string, data: any) => void;
    protected abstract on_sdp_answer : (uuid: string, data: any) => void;
    public abstract start(): void;
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
  
    return s4() + '-' + s4();
}
import { Connection } from "../connection";

export class RemoteUser extends Connection {
    private constructor(name: string, host_uuid: string, websocket: WebSocket) {
        super(name, websocket);
        navigator.mediaDevices.getUserMedia({video: true, audio: true}).then((stream) => {
            stream.getTracks().forEach( async track => {
                if (track.kind === "video")
                {
                    await track.applyConstraints({
                        width: 640,
                        height: 480,
                        frameRate: 15,
                    })
                }
                this.peer_connections.forEach(connection => connection.peer_connection.addTrack(track, stream))
            });
        });
        this.addPeerConnection();

        this.remote_video.style.height = "100vh";
        this.remote_video.onclick = (e: MouseEvent) => {
            
            for (const peer of this.peer_connections.values()) {
                this.send_message_to_peer(peer, "click", {clicking: true});
            }
        }

        this.remote_video.onmouseover = (e: MouseEvent) => {
            // @ts-ignore
            const rect = e.target!.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1; //x position within the element.
            const y = ((e.clientY - rect.top) / rect.height) * 2 - 1; //y position within the element.

            for (const peer of this.peer_connections.values()) {
                this.send_message_to_peer(peer, "mouse_position", {x: x, y: y});
            }
        }
    }

    public static async create(name: string, host_uuid: string, websocket: WebSocket): Promise<RemoteUser | null>{

        let result : RemoteUser | null = null;
        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.exists == false) {
                console.log("host does not exist")
                return result;
            }
            else{
                result = new RemoteUser(name, host_uuid, websocket);
                result.start();
                console.log("found host")
                return result;
            }
        }

        websocket.onopen = () =>
        {
            websocket.send(JSON.stringify({
                type: "join",
                uuid: host_uuid,
                name: name,
                data: "{}",
            }));
        }

        // wait 5s for response from server and return null if no response
        return new Promise<RemoteUser | null>((resolve, reject) => {
            setTimeout(() => resolve(result), 5000);
        }
        );
    }

    on_sdp_offer = (uuid: string, data: any) => {
        const peer = this.unconnected_peers.pop();
        if (peer) {
            this.peer_connections.set(uuid, peer);
            peer.peer_connection.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(() => {
                peer.peer_connection.createAnswer().then((answer) => {
                    peer.peer_connection.setLocalDescription(answer).then(async () => {
                        this.send_message_to_server("sdp", JSON.stringify({target_uuid: uuid,
                            sdp: peer.peer_connection.localDescription, 
                        }));

                                    // wait for ice candidates to be added
                        while (peer.ice_candidates.length == 0) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }

                        for (const ice of peer.ice_candidates) {
                            this.send_message_to_server("ice", JSON.stringify({target_uuid: uuid, ice: ice}));
                        }
                    });
                });
            });
            
            
        }
    }

    on_sdp_answer = (uuid:string, data: any) => {
    }

    public start() {
    }

    on_data_channel_message = (event: MessageEvent<any>) => {
        
    }

    on_data_channel_open = (event: Event) => {
        // send height of screen to host
        (event.currentTarget as RTCDataChannel).send(JSON.stringify({type: "height", height: window.innerHeight}));
    }
}
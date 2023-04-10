import { Connection } from "../connection";

export class RemoteUser extends Connection {
    constructor(name: string) {
        super(name);
        navigator.mediaDevices.getUserMedia({video: true, audio: true}).then((stream) => {
            stream.getTracks().forEach(track => {
                this.peer_connections.forEach(connection => connection.peer_connection.addTrack(track, stream))
            });
        });
    }

    on_sdp_offer(data: any) {
    }

    on_sdp_answer(data: any) {
    }

    public start() {
    }

    on_data_channel_message(event: MessageEvent<any>): void {
        
    }
}
import { Connection } from "../connection";

export class RemoteUser extends Connection {
    data_channel: RTCDataChannel;
    constructor(name: string) {
        super(name);
        this.data_channel = this.peer_connection.createDataChannel("data");
        navigator.mediaDevices.getUserMedia({video: true, audio: true}).then((stream) => {
            stream.getTracks().forEach(track => this.peer_connection.addTrack(track, stream));
        });
    }

    on_spd_offer(data: any) {
    }

    on_spd_answer(data: any) {
    }

    public start() {
    }

    on_data_channel_message(event: MessageEvent<any>): void {
        
    }
}
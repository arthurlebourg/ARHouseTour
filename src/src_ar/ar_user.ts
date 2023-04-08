import { Connection } from "../connection";

export class ArUser extends Connection {
    data_channel: RTCDataChannel;
    constructor(name: string) {
        super(name);

        this.data_channel = this.peer_connection.createDataChannel("data");
        
    }

    on_spd_offer(data: any) {
    }

    on_spd_answer(data: any) {
    }

    public start() {
        this.peer_connection.createOffer().then((offer) => {
            this.peer_connection.setLocalDescription(offer).then(() => {
                const msg = JSON.stringify({ 'sdp': this.peer_connection.localDescription});
                this.send_message_to_server("spd", msg)
            });
        });
    }

    on_data_channel_message(event: MessageEvent<any>): void {
        
    }
}
import express from 'express';
import path, { resolve } from 'path';
import serveStatic from 'serve-static';
import * as WebSocket from 'ws';
import { createServer } from 'https';
import fs from 'fs';

const app = express();

const __dirname = path.resolve();

// config TLS for https
const TLSconfig = {
    key: fs.readFileSync(resolve(__dirname, 'certs', 'privkey.pem')),
    cert: fs.readFileSync(resolve(__dirname, 'certs', 'fullchain.pem'))
};

app.use(serveStatic(__dirname + "/dist"));

const server = createServer(TLSconfig, app);

const wss = new WebSocket.WebSocketServer({ server });

const clients = new Map();

wss.on('connection', function (ws) {
    console.log('client connected');

    for (const [key, value] of clients) {
        const save_msg = JSON.parse(key);
        const payload = JSON.parse(save_msg["data"]);
        if (payload['sdp']['type'] == 'offer') {
            ws.send(key.toString());
        }
    }

    ws.on('open', function () {
        console.log("socket opened");
    });

    ws.on('close', function () {
        console.log('client disconnected');
        for (const [key, value] of clients) {
            if (value == ws) {
                clients.delete(key);
                const msg = JSON.stringify({ 'uuid': JSON.parse(key)['uuid'], 'type': 'offer_removed' });
                console.log('Offer removed from ' + JSON.parse(key)['uuid'] + ' by disconnection');
                wss.broadcast(msg);
                break;
            }
        }
    });

    ws.on('message', function (message) {
        const msg = JSON.parse(message);
        const payload = JSON.parse(msg["data"]);

        if (msg['type'] == 'join') {
            for (const [key, value] of clients) {
                const data2 = JSON.parse(key);
                if (data2['uuid'] == msg['uuid']) {
                    const tmp = key;
                    tmp['exists'] = true;
                    ws.send(key.toString());
                    return;
                }
            }
            ws.send("{\"exists\": false}");
        }

        if (msg['type'] == 'offer_removed') {
            console.log('Offer removed from ' + msg['uuid']);
            for (const [key, value] of clients) {
                if (value == ws) {
                    clients.delete(key);
                    wss.broadcast(message);
                    console.log('Offer removed from ' + JSON.parse(key)['uuid'] + ' by offer_removed');
                    break;
                }
            }
        }
        else if (msg["type"] === 'sdp') {
            if (payload['sdp']['type'] === 'offer') {
                console.log('Received offer from ' + msg['uuid']);
                clients.set(message, ws);
                //wss.broadcast(message);
            }
            else if (payload['sdp']['type'] === 'answer') {
                console.log('Received answer from ' + msg['uuid']);
                clients.set(message, ws);
                for (const [key, value] of clients) {
                    const data2 = JSON.parse(key);
                    if (data2['uuid'] == payload['target_uuid']) {
                        value.send(message.toString());
                        //clients.delete(key);
                        break;
                    }
                }
            }
        }
        else if (msg["type"] == 'ice') {
            for (const [key, value] of clients) {
                const data2 = JSON.parse(key);
                if (data2['uuid'] == payload['target_uuid']) {
                    console.log('Send ICE to ' + payload['target_uuid']);
                    value.send(message.toString());
                    break;
                }
            }
        }
        else if (msg["type"] === 'log') {
            console.log(data['log'])
        }
    });
});

wss.broadcast = function (data) {
    this.clients.forEach(function (client) {
        if (client.readyState === 1) {
            client.send(data.toString());
        }
    });
};

server.listen(process.env.PORT || 3000, () => {
    console.log(`Server running at https://127.0.0.1:${server.address().port}/`);
});

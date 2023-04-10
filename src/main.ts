import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { ArUser } from './src_ar/ar_user';
import { RemoteUser } from './src_remote/remote_user';

//createApp(App).mount('#app')

document.addEventListener('DOMContentLoaded', async () => {
    const host = window.location.search;
    const socket = new WebSocket('wss://' + window.location.host + '/')
    console.log("host: {"+host+"}")
    if (host)
    {
        const user = RemoteUser.create('bite', host.slice(1), socket).then(user => {
            if (user)
            {
                user.start();
            }

        });
    }
    if (navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')) {
        const button = document.createElement('button');
        button.textContent = 'Start';
        button.addEventListener('click', () => {
            ArUser.create('bite', socket).then(user => user.start());
        });

        document.body.appendChild(button);
        
        }
        else
        {
            const text = document.createElement('p');
            text.textContent = 'AR not supported';
            document.body.appendChild(text);
        }
    }
);
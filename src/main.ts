import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { ArUser } from './src_ar/ar_user';

createApp(App).mount('#app')

document.addEventListener('DOMContentLoaded', async () => {
    if (navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')) {
        const button = document.createElement('button');
        button.textContent = 'Start';
        button.addEventListener('click', () => {
            ArUser.create('bite').then(user => user.start());
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
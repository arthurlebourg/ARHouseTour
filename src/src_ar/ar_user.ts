import { Scene, Vector2, Camera, Renderer, WebGLRenderer, PerspectiveCamera } from "three";
import { createApp } from "vue";
import { VideoResizer } from 'mediastream-video-resizer';

import { Connection } from "../connection";
import { pipe } from "./pipeline";
import { RenderPipeline, ScreenSharePipeline } from "../pipelines/render";
import { TouchscreenPipeline } from "../pipelines/touchscreen";
import AROverlay from "../AROverlay.vue";
import { ReticlePipeline } from "../pipelines/reticle";

export type ARWorld = {
    xr_session: XRSession,
    xr_frame: XRFrame,
    xr_reference_space: XRReferenceSpace,
    xr_viewer_space: XRSpace,
    xr_context: WebGL2RenderingContext,
    xr_binding: XRWebGLBinding,
    xr_hit_test_source: XRHitTestSource,
    xr_transient_input_hit_test_source: XRTransientInputHitTestSource,
    xr_views: XRView[],
    camera: Camera,
    renderer: Renderer,
    scene: Scene,
    is_finger_down: boolean,
    finger_position: Vector2,
    canvas: HTMLCanvasElement;

}

export class ArUser extends Connection {    
    private world: ARWorld;
    private pipeline: any;
    private FullSizeStream : MediaStream;
    private stream: MediaStream;
    private videoResizer: VideoResizer;
    private senders : RTCRtpSender[];

    private constructor(name: string, world: ARWorld, stream: MediaStream, socket: WebSocket) {
        super(name, socket);
        
        this.world = world;

        this.FullSizeStream = stream;

        this.videoResizer = new VideoResizer();

        const resizedStream = this.videoResizer.start(stream, "video", 100, 100, 25);

        this.stream = resizedStream;

        this.senders = [];

        world.xr_session.addEventListener('selectstart', (event) => {
            this.world.is_finger_down = true;
            this.world.finger_position.set(event.inputSource.gamepad!.axes[0], event.inputSource.gamepad!.axes[1]);
        })

        world.xr_session.addEventListener('selectend', (event) => {
            this.world.is_finger_down = false;
        })
        this.pipeline = pipe(ReticlePipeline, TouchscreenPipeline, RenderPipeline, ScreenSharePipeline);
    }

    public static async create(name: string, socket : WebSocket): Promise<ArUser> {
        const overlay = document.createElement("div")

        createApp(AROverlay).mount('#ar_overlay')!;
        document.body.appendChild(overlay);
        const xr_session = await navigator.xr!.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test', 'dom-overlay', 'camera-access', 'depth-sensing'],
            domOverlay: { root: overlay },
            // @ts-ignore
            depthSensing: {
                usagePreference: ["cpu-optimized", "gpu-optimized"],
                dataFormatPreference: ["luminance-alpha", "float32"],
            },
        });

        const canvas = document.createElement('canvas');

        const xr_context = canvas.getContext('webgl2', { xrCompatible: true, antialias: false })!;

        xr_session.updateRenderState({ baseLayer: new XRWebGLLayer(xr_session, xr_context) });

        const xr_reference_space = await xr_session.requestReferenceSpace('local');
        const xr_viewer_space = await xr_session.requestReferenceSpace('viewer');

        const hitTestSource = await xr_session.requestHitTestSource!({ space: xr_viewer_space })!;
        const transientInputHitTestSource  = await xr_session.requestHitTestSourceForTransientInput!({ profile: 'generic-touchscreen' })!;

        const renderer = new WebGLRenderer({
            alpha: true,
            preserveDrawingBuffer: true,
            canvas: canvas,
            context: xr_context
        });
        renderer.autoClear = false;
        //document.body.appendChild(canvas);

        const camera = new PerspectiveCamera();
        camera.matrixAutoUpdate = false;
        camera.matrixWorldAutoUpdate = false;
        const world: ARWorld = {
            xr_session: xr_session,
            xr_frame : null!,
            xr_reference_space: xr_reference_space,
            xr_viewer_space: xr_viewer_space,
            xr_context: xr_context,
            xr_binding: new XRWebGLBinding(xr_session, xr_context),
            xr_hit_test_source: hitTestSource,
            xr_transient_input_hit_test_source: transientInputHitTestSource,
            xr_views: [],
            camera: camera,
            renderer: renderer,
            scene: new Scene(),
            is_finger_down: false,
            finger_position: new Vector2(),
            canvas: canvas,
        };

        const stream = canvas.captureStream(25);


        const ar_user = new ArUser(name, world, stream, socket);

        // wait for socker to connect
        while (!ar_user.is_socket_connected()) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return ar_user;
    }

    on_sdp_offer = (uuid: string, data: any) => {
    }

    on_sdp_answer = (uuid: string, data: any) => {
        const peer = this.unconnected_peers[0];
        peer.peer_connection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        this.peer_connections.set(uuid, peer);
        for (const ice of peer.ice_candidates) {
            this.send_message_to_server("ice", JSON.stringify({target_uuid: uuid, ice: ice}));
        }
    }

    public start() {
        const peer = this.addPeerConnection();
        this.stream.getTracks().forEach((track) => {
            this.senders.push(peer.addTrack(track, this.stream));
            console.log("added track");
        });

        peer.createOffer().then((offer) => {
            peer.setLocalDescription(offer).then(() => {
                const msg = JSON.stringify({ 'sdp': peer.localDescription});
                this.send_message_to_server("sdp", msg)
            });
        });

        this.world.xr_session.requestAnimationFrame(this.on_frame);
    }

    on_data_channel_message = (event: MessageEvent<any>) => {
        console.log("received message: " + event.data);
        const data = JSON.parse(event.data)
        if (data["type"] == "height")
        {
            // @ts-ignore
            this.stream = this.videoResizer.start(this.FullSizeStream, "video", data["height"] * this.world.xr_views[0].camera.width / this.world.xr_views[0].camera.height, data["height"], 25);

            this.senders.forEach((sender) => {
                this.stream.getTracks().forEach((track) => {
                    sender.replaceTrack(track)
                });
            });

            console.log("size changed")
        }
        
    }

    on_data_channel_open = (event: Event) => {
        console.log("data channel opened");
    }

    private on_frame = (time: number, xr_frame: XRFrame) => {
        this.world.xr_session.requestAnimationFrame(this.on_frame);

        const pose = xr_frame.getViewerPose(this.world.xr_reference_space);
        this.world.xr_frame = xr_frame;
        if (pose) {
            this.world.xr_views = [];
            for (let i = 0; i < pose.views.length; i++) {
                this.world.xr_views.push(pose.views[i]);
            }

            this.pipeline(this.world);
            
        }
    }
}
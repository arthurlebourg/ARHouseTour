import { Scene, Vector2, Camera, Renderer, WebGLRenderer, PerspectiveCamera, Mesh, RingGeometry, MeshBasicMaterial } from "three";
import { createApp } from "vue";

import { Connection } from "../connection";
import { pipe } from "./pipeline";
import { RenderPipeline, ScreenSharePipeline } from "../pipelines/render";
import { TouchscreenPipeline } from "../pipelines/touchscreen";
import AROverlay from "../AROverlay.vue";
import { ReticlePipeline } from "../pipelines/reticle";
import { RemoteInputPipeline } from "../pipelines/remote_inputs";

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
    canvas: HTMLCanvasElement,
    screenshare_canvas : HTMLCanvasElement,
    screenshare_context : CanvasRenderingContext2D,
    remote_input: { x: number, y: number, is_down: boolean },
    reticle: Mesh,
}

export class ArUser extends Connection {    
    private world: ARWorld;
    private pipeline: any;
    private stream: MediaStream;

    private constructor(name: string, world: ARWorld, stream: MediaStream, socket: WebSocket) {
        super(name, socket);
        
        this.world = world;

        this.stream = stream;

        if (this.object_list.length > 0)
        {
            document.getElementById("obj_name")!.textContent = this.object_list[this.current_selected_object].name;
        }
        else
        {
            document.getElementById("obj_name")!.textContent = "No objects";
        }
        
        document.getElementById("left_arrow")!.onclick = () => {
            this.current_selected_object = (this.current_selected_object - 1) % this.object_list.length;
            document.getElementById("obj_name")!.textContent = this.object_list[this.current_selected_object].name;
        }

        document.getElementById("right_arrow")!.onclick = () => {
            this.current_selected_object = (this.current_selected_object + 1) % this.object_list.length;
            document.getElementById("obj_name")!.textContent = this.object_list[this.current_selected_object].name;
        }

        world.xr_session.addEventListener('selectstart', (event) => {
            this.world.is_finger_down = true;
            this.world.finger_position.set(event.inputSource.gamepad!.axes[0], event.inputSource.gamepad!.axes[1]);
        })

        world.xr_session.addEventListener('selectend', (event) => {
            this.world.is_finger_down = false;
            const obj = this.object_list[this.current_selected_object].clone();
            obj.matrix.copy(this.world.reticle.matrix);
            obj.matrix.decompose(obj.position, obj.quaternion, obj.scale);
            this.world.scene.add(obj);
        })

        this.pipeline = pipe(ReticlePipeline, TouchscreenPipeline, RemoteInputPipeline, RenderPipeline, ScreenSharePipeline);
    }


    public static async create(name: string, socket : WebSocket): Promise<ArUser> {
        const overlay = document.createElement("div")
        overlay.id = "overlay";
        overlay.className = "ARoverlay";
        document.body.appendChild(overlay);

        createApp(AROverlay).mount('#overlay');
        const xr_session = await navigator.xr!.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test', 'dom-overlay', 'camera-access', 'depth-sensing'],
            domOverlay: { root: overlay },
            // @ts-ignore
            depthSensing: {
                usagePreference: ["cpu-optimized"],
                dataFormatPreference: ["luminance-alpha"],
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

        const screenshare_canvas = document.createElement('canvas');

        const screenshare_context = screenshare_canvas.getContext('2d')!;

        const camera = new PerspectiveCamera();
        camera.matrixAutoUpdate = false;
        camera.matrixWorldAutoUpdate = false;

        const reticle = new Mesh( new RingGeometry( 0.1, 0.2, 32 ).rotateX( - Math.PI / 2 ), new MeshBasicMaterial( {
            color: 0xffffff,
            opacity: 1.0,
            transparent: true
        } ) );
        reticle.matrixAutoUpdate = false;

        const scene = new Scene();
        scene.add(reticle);

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
            scene: scene,
            is_finger_down: false,
            finger_position: new Vector2(),
            canvas: canvas,
            screenshare_canvas: screenshare_canvas,
            screenshare_context: screenshare_context,
            remote_input: { x: 0, y: 0, is_down: false },
            reticle: reticle,
        };

        const stream = screenshare_canvas.captureStream(20);

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

        for (const track of this.stream.getTracks())
        {

            peer.addTrack(track, this.stream);
        }

        peer.createOffer().then((offer) => {
            peer.setLocalDescription(offer).then(() => {
                const msg = JSON.stringify({ 'sdp': peer.localDescription});
                this.send_message_to_server("sdp", msg)
            });
        });

        this.add_object("chair/scene.gltf", "chair");

        this.world.xr_session.requestAnimationFrame(this.on_frame);
    }

    on_data_channel_message = (message : any) => {
        switch (message.type) {
            case "mouse_position":
                this.world.remote_input.x = message.data.x;
                this.world.remote_input.y = message.data.y;
                this.world.remote_input.is_down = message.data.is_down;
                break;
            default:
                console.log("unknown data channel message type", message.type);
                break;
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
import { Texture } from 'three';
import { ARWorld } from '../src_ar/ar_user';

export const RenderPipeline = (world: ARWorld) => {
    world.xr_context.bindFramebuffer(world.xr_context.FRAMEBUFFER, world.xr_session.renderState.baseLayer!.framebuffer)
    for (let view of world.xr_views) {

        const viewport = world.xr_session.renderState.baseLayer!.getViewport(view)!;
        world.xr_context.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

        world.camera.matrix.fromArray(view.transform.matrix);
        world.camera.projectionMatrix.fromArray(view.projectionMatrix);
        world.camera.updateMatrixWorld(true);

        world.renderer.render(world.scene, world.camera);
    }
    return world;
}

export const ScreenSharePipeline = (world: ARWorld) => {
    // render the scene with raw camera texture as backaground to CPU canvas
    world.xr_context.bindFramebuffer(world.xr_context.FRAMEBUFFER, null);

    //const view = world.xr_views[0];
    for (let view of world.xr_views) {

        // @ts-ignore
        const raw_camera_texture = world.xr_binding.getCameraImage(view.camera)
        const viewport = world.xr_session.renderState.baseLayer!.getViewport(view)!;
        //world.xr_context.viewport(0,0, viewport.width, viewport.width);

        /*console.log("viewport: ", viewport.width, viewport.height);
        console.log("drawing buffer: ", world.xr_context.drawingBufferWidth, world.xr_context.drawingBufferHeight);
        console.log("raw camera texture: ", raw_camera_texture.width, raw_camera_texture.height);
        console.log("world canvas: ", world.canvas.width, world.canvas.height)*/


        world.scene.background = new Texture(raw_camera_texture);

        //const viewport = world.xr_session.renderState.baseLayer!.getViewport(view)!;
        //world.xr_context.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

        // @ts-ignore
        //world.xr_context.viewport(0, 0, view.camera.width, view.camera.height);
        world.renderer.setSize(view.camera.width, view.camera.height);
        


        world.camera.matrix.fromArray(view.transform.matrix);
        world.camera.projectionMatrix.fromArray(view.projectionMatrix);
        world.camera.updateMatrixWorld(true);

        world.renderer.render(world.scene, world.camera);

    }
    return world;
}
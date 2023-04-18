import { CanvasTexture, Texture } from 'three';
import { ARWorld } from '../src_ar/ar_user';

export const RenderPipeline = (world: ARWorld) => {
    world.xr_context.bindFramebuffer(world.xr_context.FRAMEBUFFER, world.xr_session.renderState.baseLayer!.framebuffer)

    world.renderer.setSize(world.canvas.width, world.canvas.height)
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

    const view = world.xr_views[0];

    // @ts-ignore
    const raw_camera_texture = world.xr_binding.getCameraImage(view.camera)

    //create texture with background + obejcts

    world.scene.background = new Texture(raw_camera_texture);

    //world.scene.background.repeat.set(5,5);
    // @ts-ignore
    world.renderer.setSize(view.camera.width, view.camera.height);
    
    world.camera.matrix.fromArray(view.transform.matrix);
    world.camera.projectionMatrix.fromArray(view.projectionMatrix);
    world.camera.updateMatrixWorld(true);

    world.renderer.render(world.scene, world.camera);

    world.scene.background.dispose()
    world.scene.background = null;

    // render for sharing

    world.screenshare_scene.background = new CanvasTexture(world.canvas);

    //world.screenshare_scene.background.repeat.set(5,5);

    world.screenshare_renderer.setSize(world.canvas.width / 3, world.canvas.height / 3);

    world.screenshare_renderer.render(world.screenshare_scene, world.camera);

    world.screenshare_scene.background.dispose()
    world.screenshare_scene.background = null;

    return world;
}
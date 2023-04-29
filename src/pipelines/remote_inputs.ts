import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from "three";
import { ARWorld } from "../src_ar/ar_user";
import { get_ray } from "../utils";


const place_object = (x: number, y : number, world : ARWorld) => {
    const view = world.xr_views[0];
    const dir = get_ray(x, y, view);
    const position = new Vector3(view.transform.position.x, view.transform.position.y, view.transform.position.z);
    
    // @ts-ignore
    const depthInfo = world.xr_frame.getDepthInformation(view);

    const depthInMeters = depthInfo.getDepthInMeters((x + 1) / 2, (y + 1) / 2);
    
    position.add(dir.multiplyScalar(depthInMeters));

    const box = new Mesh(new BoxGeometry( 0.1, 0.1, 0.1 ), new MeshBasicMaterial({ color: 0x0000ff }));
    box.position.copy(position);
    return box;
}

export const RemoteInputPipeline = (world : ARWorld) => {
    if (world.remote_input.is_down)
    {
        const box = place_object(world.remote_input.x, world.remote_input.y, world);
        world.scene.add(box);
        world.remote_input.is_down = false;
    }

    return world;
}
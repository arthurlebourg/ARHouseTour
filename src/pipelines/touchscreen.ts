import { BoxGeometry, Mesh, MeshBasicMaterial } from "three";
import { ARWorld } from "../src_ar/ar_user";

export const TouchscreenPipeline = (world: ARWorld) => {
    if (world.is_finger_down)
    {
        const hitResults = world.xr_frame.getHitTestResultsForTransientInput(world.xr_transient_input_hit_test_source);
        if (hitResults.length > 0)
        {
            for (const result of hitResults)
            {
                const res = result.results;
                if (res.length > 0)
                {
                    const hitPose = res[0].getPose(world.xr_reference_space);
                    if (hitPose)
                    {
                        const box = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), new MeshBasicMaterial({ color: 0xff0000 }));
                        box.matrix.fromArray(hitPose.transform.matrix);
                        box.updateMatrixWorld(true);
                        world.scene.add(box);
                    }
                }

            }
        }
    }
    return world;
}
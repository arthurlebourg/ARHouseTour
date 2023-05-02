import { ARWorld } from "../src_ar/ar_user";

export const ReticlePipeline = (world: ARWorld) => {
    if (!world.is_finger_down)
    {
        const hitResults = world.xr_frame.getHitTestResults(world.xr_hit_test_source);
        if (hitResults.length > 0 && world.reticle)
        {
            const hitPose = hitResults[0].getPose(world.xr_reference_space);
            if (hitPose)
            {
                world.reticle.matrix.fromArray(hitPose.transform.matrix);
                world.reticle.updateMatrixWorld(true);
            }
        }
    }

    return world;
}
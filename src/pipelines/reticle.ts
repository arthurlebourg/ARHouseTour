import { Mesh, MeshBasicMaterial, RingGeometry } from "three";
import { ARWorld } from "../src_ar/ar_user";

const reticle = new Mesh( new RingGeometry( 0.1, 0.2, 32 ).rotateX( - Math.PI / 2 ), new MeshBasicMaterial( {
    color: 0xffffff,
    opacity: 0.5,
    transparent: true
} ) );
reticle.matrixAutoUpdate = false;
reticle.visible = false;

export const ReticlePipeline = (world: ARWorld) => {

    const hitResults = world.xr_frame.getHitTestResults(world.xr_hit_test_source);
    if (hitResults.length > 0 && reticle)
    {
        const hitPose = hitResults[0].getPose(world.xr_reference_space);
        if (hitPose)
        {
            if (!reticle.visible)
            {
                world.scene.add(reticle);
                reticle.visible = true;
            }
            reticle.matrix.fromArray(hitPose.transform.matrix);
            reticle.updateMatrixWorld(true);
        }
    }

    return world;
}
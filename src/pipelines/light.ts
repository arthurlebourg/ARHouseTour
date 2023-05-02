import { ARWorld } from "../src_ar/ar_user";

export const LightPipeline = (world: ARWorld) => {
    // @ts-ignore
    const lightEstimate = world.xr_frame.getLightEstimate(world.xr_light_probe);

    const intensity = Math.max(1.0, Math.max(lightEstimate.primaryLightIntensity.x, Math.max(lightEstimate.primaryLightIntensity.y, lightEstimate.primaryLightIntensity.z)));

    world.directional_light.position.set(lightEstimate.primaryLightDirection.x, lightEstimate.primaryLightDirection.y, lightEstimate.primaryLightDirection.z);
    world.directional_light.color.setRGB(lightEstimate.primaryLightIntensity.x / intensity, lightEstimate.primaryLightIntensity.y / intensity, lightEstimate.primaryLightIntensity.z / intensity);
    world.directional_light.intensity = intensity;

    world.light_probe.sh.fromArray(lightEstimate.sphericalHarmonicsCoefficients);

    if (world.shadow_plane.position.y > world.reticle.position.y)
    {
        world.shadow_plane.position.y = world.reticle.position.y;
    }

    return world;
}
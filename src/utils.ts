import { Matrix4, Vector3, Vector4 } from "three";

export function get_ray(x : number, y : number, view : any) : Vector3
{
    const vec4 = new Vector4(x, -y, 0.5, 1.0);
    const projection: THREE.Matrix4 = new Matrix4().fromArray(view.projectionMatrix);
    const viewmat: THREE.Matrix4 = new Matrix4().fromArray(view.transform.inverse.matrix);

    projection.multiply(viewmat).invert();
    vec4.applyMatrix4(projection);

    let vec = new Vector3(vec4.x / vec4.w, vec4.y / vec4.w, vec4.z / vec4.w);

    vec.sub(view.transform.position).normalize();

    return vec;
}
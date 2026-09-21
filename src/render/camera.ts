import { MathUtils, PerspectiveCamera, Vector3, type Mesh } from 'three';
import type { CameraPreset } from '../data/cameras';

const tmp = new Vector3();

/** World-space direction from the target toward the camera for a preset. */
export function presetDirection(preset: CameraPreset): Vector3 {
  const yaw = MathUtils.degToRad(preset.yaw);
  const pitch = MathUtils.degToRad(preset.pitch);
  return new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
}

/** Looks at `target` from the camera's position, tilted by `roll` degrees around the viewing axis. */
function aim(camera: PerspectiveCamera, target: Vector3, dir: Vector3, roll = 0): void {
  // Rotating clockwise on screen = rotating "up" around the axis pointing from target to camera.
  camera.up.set(0, 1, 0).applyAxisAngle(dir.clone().normalize(), -MathUtils.degToRad(roll));
  camera.lookAt(target);
}

/**
 * Positions a square-aspect camera along the preset direction so that every mesh vertex
 * fits inside the central `fill` fraction of the frame, as tightly as possible.
 */
export function fitCamera(camera: PerspectiveCamera, preset: CameraPreset, meshes: Mesh[], fill: number): void {
  const points: Vector3[] = [];
  for (const mesh of meshes) {
    const position = mesh.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      points.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
    }
  }

  const target = new Vector3();
  for (const p of points) target.add(p);
  target.divideScalar(points.length);

  const dir = presetDirection(preset);
  let radius = 0;
  for (const p of points) radius = Math.max(radius, p.distanceTo(target));

  camera.fov = preset.fov;
  camera.aspect = 1;
  camera.near = 0.1;
  camera.far = 5000;
  let distance = radius / Math.sin(MathUtils.degToRad(preset.fov) / 2);

  // Refine: re-center on the projected bounds and scale distance until the silhouette fills the frame.
  for (let iter = 0; iter < 6; iter++) {
    camera.position.copy(target).addScaledVector(dir, distance);
    aim(camera, target, dir, preset.roll);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      tmp.copy(p).project(camera);
      minX = Math.min(minX, tmp.x);
      maxX = Math.max(maxX, tmp.x);
      minY = Math.min(minY, tmp.y);
      maxY = Math.max(maxY, tmp.y);
    }

    // Shift target so projected bounds are centered (NDC half-height at the target plane = tan(fov/2) * distance).
    const halfHeight = Math.tan(MathUtils.degToRad(preset.fov) / 2) * distance;
    const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    target.addScaledVector(right, ((minX + maxX) / 2) * halfHeight);
    target.addScaledVector(up, ((minY + maxY) / 2) * halfHeight);

    const extent = Math.max(maxX - minX, maxY - minY) / 2;
    distance *= extent / fill;
  }

  camera.position.copy(target).addScaledVector(dir, distance);
  aim(camera, target, dir, preset.roll);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
}

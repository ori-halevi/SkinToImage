import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { Character } from '../../render/rig/character';
import { POSES } from '.';

/** Lowest world-space Y of a posed character (no rendering needed, so this runs in Node). */
function lowestPoint(poseId: string): number {
  const character = new Character({} as ImageBitmap, { model: 'classic', lighting: 'flat' });
  character.applyPose(POSES.find((p) => p.id === poseId)!);
  let min = Infinity;
  const v = new Vector3();
  for (const mesh of character.meshes) {
    const position = mesh.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) min = Math.min(min, v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).y);
  }
  return min;
}

/** Poses that are airborne or lift a leg on purpose. */
const AIRBORNE = new Set(['fly', 'jump', 'fall', 'run', 'ninjaRun', 'kick', 'chicken', 'cheer', 'sprint', 'jumpKick', 'climb']);

describe('pose grounding', () => {
  it.each(POSES.filter((p) => !AIRBORNE.has(p.id)).map((p) => p.id))('%s touches the ground without sinking into it', (id) => {
    const y = lowestPoint(id);
    expect(y).toBeGreaterThan(-1);
    expect(y).toBeLessThan(1);
  });
});

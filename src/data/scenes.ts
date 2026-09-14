import type { Vec3 } from '../render/rig/layout';
import type { ItemId } from '../render/props/items';
import type { PropId } from '../render/props/meshes';

export interface SceneSlot {
  poseId: string;
  position: Vec3;
  /** Degrees. 90 = facing +X (toward the viewer's right). */
  rotationY: number;
  items?: { right?: ItemId; left?: ItemId };
}

export interface ScenePropPlacement {
  propId: PropId;
  position: Vec3;
  rotationY?: number;
}

/** A composed shot with 1–4 characters and optional props. The display name comes from i18n (`scenes.<id>`). */
export interface Scene {
  id: string;
  slots: SceneSlot[];
  props?: ScenePropPlacement[];
}

const B = 16; // one block

export const SCENES: Scene[] = [
  {
    id: 'faceOff',
    slots: [
      { poseId: 'angry', position: [-11, 0, 0], rotationY: 55 },
      { poseId: 'angry', position: [11, 0, 0], rotationY: -55 },
    ],
  },
  {
    id: 'fight',
    slots: [
      { poseId: 'swordSwing', position: [-12, 0, 0], rotationY: 65, items: { right: 'sword' } },
      { poseId: 'guard', position: [12, 0, 0], rotationY: -65 },
    ],
  },
  {
    id: 'chase',
    slots: [
      { poseId: 'run', position: [-20, 0, 4], rotationY: -70 },
      { poseId: 'zombie', position: [18, 0, -4], rotationY: -70 },
    ],
  },
  {
    id: 'backToBack',
    slots: [
      { poseId: 'armsCrossed', position: [-6, 0, 0], rotationY: -45 },
      { poseId: 'armsCrossed', position: [6, 0, 0], rotationY: 45 },
    ],
  },
  {
    id: 'squad',
    slots: [
      { poseId: 'cheer', position: [-20, 0, -2], rotationY: 15 },
      { poseId: 'victory', position: [0, 0, 4], rotationY: 0 },
      { poseId: 'flex', position: [20, 0, -2], rotationY: -15 },
    ],
  },
  {
    id: 'squad4',
    slots: [
      { poseId: 'armsCrossed', position: [-30, 0, -4], rotationY: 20 },
      { poseId: 'thumbsUp', position: [-10, 0, 2], rotationY: 8 },
      { poseId: 'wave', position: [10, 0, 2], rotationY: -8 },
      { poseId: 'handsBehind', position: [30, 0, -4], rotationY: -20 },
    ],
  },
  {
    id: 'treasure',
    slots: [
      // The pointing (right) arm is on the character's -X side, so the pointer stands to the right of the chest.
      { poseId: 'shocked', position: [-18, 0, 0], rotationY: 30 },
      { poseId: 'pointSide', position: [18, 0, 0], rotationY: -30 },
    ],
    props: [{ propId: 'chest', position: [0, 0, 6], rotationY: 0 }],
  },
  {
    id: 'onChair',
    // `sit` rests its legs at y=0; lift the character so the legs lie on the seat (top at y=12),
    // and push the chair back so the leaning head clears the backrest.
    slots: [{ poseId: 'sit', position: [0, 12, 0], rotationY: 0 }],
    props: [{ propId: 'chair', position: [0, 0, -2] }],
  },
  {
    id: 'kingOfTheHill',
    slots: [{ poseId: 'victory', position: [0, 2 * B, 0], rotationY: 0 }],
    props: [
      { propId: 'stone', position: [-B, 0, 0] },
      { propId: 'grass', position: [0, 0, 0] },
      { propId: 'stone', position: [B, 0, 0] },
      { propId: 'gold', position: [0, B, 0] },
    ],
  },
  {
    id: 'explosivePanic',
    slots: [{ poseId: 'shocked', position: [-12, 0, 4], rotationY: 25 }],
    props: [
      { propId: 'explosive', position: [14, 0, -6] },
      { propId: 'explosive', position: [14, B, -6] },
      { propId: 'explosive', position: [30, 0, -6] },
    ],
  },
  {
    id: 'diamondFind',
    slots: [{ poseId: 'victory', position: [-12, 0, 4], rotationY: 20, items: { right: 'pickaxe' } }],
    props: [
      { propId: 'diamondOre', position: [14, 0, -6] },
      { propId: 'stone', position: [14, B, -6] },
      { propId: 'diamondOre', position: [30, 0, -6] },
    ],
  },
  {
    id: 'campfire',
    slots: [
      { poseId: 'sitGround', position: [-24, 0, 0], rotationY: 60 },
      { poseId: 'sitGround', position: [24, 0, 0], rotationY: -60 },
    ],
    props: [{ propId: 'planks', position: [0, 0, 6] }],
  },
];

export function getScene(id: string): Scene | undefined {
  return SCENES.find((s) => s.id === id);
}

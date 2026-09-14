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

/** A composed shot with 1–6 characters and optional props. The display name comes from i18n (`scenes.<id>`). */
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

  // ---------- Solo ----------
  {
    id: 'miner',
    slots: [{ poseId: 'swordSwing', position: [-12, 0, 6], rotationY: 55, items: { right: 'pickaxe' } }],
    props: [
      { propId: 'stone', position: [10, 0, -6] },
      { propId: 'stone', position: [10, B, -6] },
      { propId: 'diamondOre', position: [26, 0, -6] },
      { propId: 'stone', position: [26, B, -6] },
    ],
  },
  {
    id: 'lumberjack',
    slots: [{ poseId: 'swordSwing', position: [-12, 0, 6], rotationY: 55, items: { right: 'axe' } }],
    props: [
      { propId: 'planks', position: [10, 0, -6] },
      { propId: 'planks', position: [10, B, -6] },
      { propId: 'planks', position: [10, 2 * B, -6] },
    ],
  },
  {
    id: 'archer',
    slots: [{ poseId: 'aim', position: [0, 0, 0], rotationY: 0, items: { left: 'bow' } }],
  },
  {
    id: 'goldHero',
    slots: [{ poseId: 'victory', position: [0, B, 0], rotationY: 0, items: { right: 'sword' } }],
    props: [{ propId: 'gold', position: [0, 0, 0] }],
  },
  {
    id: 'caveExplorer',
    slots: [{ poseId: 'pointSide', position: [10, 0, 6], rotationY: -25, items: { right: 'torch' } }],
    props: [
      { propId: 'stone', position: [-16, 0, -8] },
      { propId: 'stone', position: [-16, B, -8] },
      { propId: 'diamondOre', position: [-32, 0, -8] },
    ],
  },

  // ---------- Duos ----------
  {
    id: 'danceDuo',
    slots: [
      { poseId: 'floss', position: [-17, 0, 0], rotationY: 20 },
      { poseId: 'dab', position: [17, 0, 0], rotationY: -20 },
    ],
  },
  {
    id: 'lookAtThis',
    slots: [
      { poseId: 'confused', position: [-14, 0, 0], rotationY: 30 },
      // The pointing (right) arm is on the character's -X side, toward the friend.
      { poseId: 'pointSide', position: [14, 0, 0], rotationY: -20 },
    ],
  },
  {
    id: 'knockout',
    slots: [
      { poseId: 'punch', position: [-12, 0, 0], rotationY: 70 },
      { poseId: 'fall', position: [12, 0, 0], rotationY: -70 },
    ],
  },
  {
    id: 'photobomb',
    slots: [
      { poseId: 'selfie', position: [-6, 0, 6], rotationY: 10 },
      { poseId: 'wave', position: [12, 0, -8], rotationY: -10 },
    ],
  },
  {
    id: 'archeryDuel',
    slots: [
      { poseId: 'aim', position: [-18, 0, 0], rotationY: 90, items: { left: 'bow' } },
      { poseId: 'guard', position: [18, 0, 0], rotationY: -70, items: { right: 'sword' } },
    ],
  },

  // ---------- Trios ----------
  {
    id: 'dancers',
    slots: [
      { poseId: 'floss', position: [-20, 0, -2], rotationY: 15 },
      { poseId: 'dab', position: [0, 0, 6], rotationY: 0 },
      { poseId: 'chicken', position: [20, 0, -2], rotationY: -15 },
    ],
  },
  {
    id: 'podium',
    slots: [
      { poseId: 'cheer', position: [-B, B, 0], rotationY: 10 },
      { poseId: 'victory', position: [0, 2 * B, 0], rotationY: 0 },
      { poseId: 'thumbsUp', position: [18, 0, 4], rotationY: -10 },
    ],
    props: [
      { propId: 'stone', position: [-B, 0, 0] },
      { propId: 'gold', position: [0, 0, 0] },
      { propId: 'gold', position: [0, B, 0] },
    ],
  },
  {
    id: 'argument',
    slots: [
      { poseId: 'angry', position: [-16, 0, 4], rotationY: 55 },
      { poseId: 'facepalm', position: [0, 0, -12], rotationY: 0 },
      { poseId: 'angry', position: [16, 0, 4], rotationY: -55 },
    ],
  },
  {
    id: 'runaway',
    slots: [
      { poseId: 'run', position: [-34, 0, 6], rotationY: -70 },
      { poseId: 'scared', position: [-14, 0, -4], rotationY: -60 },
      { poseId: 'zombie', position: [20, 0, 2], rotationY: -70 },
    ],
  },

  // ---------- Four ----------
  {
    id: 'zombieHorde',
    slots: [
      { poseId: 'scared', position: [-26, 0, 8], rotationY: 60 },
      { poseId: 'zombie', position: [6, 0, -6], rotationY: -65 },
      { poseId: 'zombie', position: [20, 0, 8], rotationY: -70 },
      { poseId: 'zombie', position: [32, 0, -10], rotationY: -65 },
    ],
  },
  {
    id: 'swordSquad',
    slots: [
      { poseId: 'guard', position: [-30, 0, -4], rotationY: 20, items: { right: 'sword' } },
      { poseId: 'victory', position: [-10, 0, 4], rotationY: 8, items: { right: 'sword' } },
      { poseId: 'swordSwing', position: [10, 0, 4], rotationY: -8, items: { right: 'sword' } },
      { poseId: 'aim', position: [30, 0, -4], rotationY: -20, items: { left: 'bow' } },
    ],
  },

  // ---------- Five ----------
  {
    id: 'party',
    slots: [
      { poseId: 'cheer', position: [-36, 0, -2], rotationY: 18 },
      { poseId: 'dab', position: [-18, 0, 6], rotationY: 8 },
      { poseId: 'jump', position: [0, 0, 0], rotationY: 0 },
      { poseId: 'floss', position: [18, 0, 6], rotationY: -8 },
      { poseId: 'flex', position: [36, 0, -2], rotationY: -18 },
    ],
  },
  {
    id: 'crew',
    slots: [
      { poseId: 'handsBehind', position: [-36, 0, -6], rotationY: 18 },
      { poseId: 'armsCrossed', position: [-18, 0, 0], rotationY: 10 },
      { poseId: 'thumbsUp', position: [0, 0, 6], rotationY: 0 },
      { poseId: 'armsCrossed', position: [18, 0, 0], rotationY: -10 },
      { poseId: 'handsBehind', position: [36, 0, -6], rotationY: -18 },
    ],
  },

  // ---------- Six ----------
  {
    id: 'teamPhoto',
    slots: [
      { poseId: 'armsCrossed', position: [-20, 0, -10], rotationY: 10 },
      { poseId: 'thumbsUp', position: [0, 0, -12], rotationY: 0 },
      { poseId: 'flex', position: [20, 0, -10], rotationY: -10 },
      { poseId: 'sitGround', position: [-22, 0, 10], rotationY: 12 },
      { poseId: 'sitGround', position: [0, 0, 12], rotationY: 0 },
      { poseId: 'sitGround', position: [22, 0, 10], rotationY: -12 },
    ],
  },
  {
    id: 'bigBattle',
    slots: [
      { poseId: 'guard', position: [-36, 0, -8], rotationY: 70, items: { right: 'sword' } },
      { poseId: 'swordSwing', position: [-26, 0, 10], rotationY: 70, items: { right: 'sword' } },
      { poseId: 'punch', position: [-14, 0, 0], rotationY: 75 },
      { poseId: 'guard', position: [14, 0, 0], rotationY: -75, items: { right: 'sword' } },
      { poseId: 'kick', position: [26, 0, 10], rotationY: -70 },
      { poseId: 'swordSwing', position: [36, 0, -8], rotationY: -70, items: { right: 'axe' } },
    ],
  },
  {
    id: 'celebration',
    slots: [
      { poseId: 'victory', position: [-40, 0, -6], rotationY: 20 },
      { poseId: 'cheer', position: [-24, 0, 6], rotationY: 12 },
      { poseId: 'jump', position: [-8, 0, -4], rotationY: 4 },
      { poseId: 'dab', position: [8, 0, 6], rotationY: -4 },
      { poseId: 'wave', position: [24, 0, -4], rotationY: -12 },
      { poseId: 'victory', position: [40, 0, 6], rotationY: -20 },
    ],
  },
];

/** Number of characters in a scene, for filtering. */
export const sceneSize = (scene: Scene) => scene.slots.length;
export const SCENE_SIZES = [...new Set(SCENES.map(sceneSize))].sort((a, b) => a - b);

export function getScene(id: string): Scene | undefined {
  return SCENES.find((s) => s.id === id);
}

import {
  DoubleSide,
  FrontSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  NearestFilter,
  SRGBColorSpace,
  Texture,
  type Material,
} from 'three';
import type { SkinModel } from '../../features/skins/types';
import type { Pose } from '../../data/poses/types';
import { createItemObject } from '../props/meshes';
import type { ItemId } from '../props/items';
import { createSkinBoxGeometry } from './boxGeometry';
import { getPartLayouts, type PartId } from './layout';

export type Lighting = 'flat' | 'shaded';

export interface CharacterOptions {
  model: SkinModel;
  lighting: Lighting;
  /** Second layer (hat/jacket/sleeves/pants) per body part. Parts not listed are shown. */
  overlay?: Partial<Record<PartId, boolean>>;
  /** Render the whole character flat black (a "mystery" silhouette), keeping the skin's cut-outs. */
  silhouette?: boolean;
}

export interface HeldItems {
  right?: ItemId | null;
  left?: ItemId | null;
}

export class Character {
  readonly root = new Group();
  readonly meshes: Mesh[] = [];
  readonly headMeshes: Mesh[] = [];
  private readonly hands: Record<'right' | 'left', Group> = { right: new Group(), left: new Group() };
  private readonly lighting: Lighting;
  private readonly joints = new Map<PartId, Group>();
  private readonly texture: Texture;
  private readonly materials: Material[];

  constructor(skin: ImageBitmap, options: CharacterOptions) {
    this.lighting = options.lighting;
    this.texture = new Texture(skin);
    this.texture.flipY = false;
    this.texture.magFilter = NearestFilter;
    this.texture.minFilter = NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.needsUpdate = true;

    // A silhouette ignores lighting: black times any texel is black, while the texture's alpha still
    // cuts out transparent overlay pixels.
    const Mat = options.lighting === 'shaded' && !options.silhouette ? MeshLambertMaterial : MeshBasicMaterial;
    const tint = options.silhouette ? { color: 0x000000 } : {};
    // The base layer is always opaque, like in-game; the overlay layer supports (semi-)transparency.
    const baseMaterial = new Mat({ map: this.texture, side: FrontSide, ...tint });
    const overlayMaterial = new Mat({ map: this.texture, side: DoubleSide, transparent: true, alphaTest: 0.01, ...tint });
    this.materials = [baseMaterial, overlayMaterial];

    for (const part of getPartLayouts(options.model)) {
      const joint = new Group();
      joint.name = part.id;
      joint.position.set(...part.pivot);

      const layers = [new Mesh(createSkinBoxGeometry(part.size, part.uv), baseMaterial)];
      if (options.overlay?.[part.id] !== false) {
        const overlay = new Mesh(createSkinBoxGeometry(part.size, part.overlayUv, part.overlayInflate), overlayMaterial);
        overlay.renderOrder = 1;
        layers.push(overlay);
      }
      for (const mesh of layers) {
        mesh.position.set(...part.offset);
        joint.add(mesh);
        this.meshes.push(mesh);
        if (part.id === 'head') this.headMeshes.push(mesh);
      }

      if (part.id === 'rightArm' || part.id === 'leftArm') {
        // Grip point: inside the fist, near the bottom of the arm.
        const side = part.id === 'rightArm' ? 'right' : 'left';
        const hand = this.hands[side];
        hand.position.set(part.offset[0], -9, 0);
        // Turn the item's flat side partly toward the viewer; held perfectly edge-on (as in-game)
        // a sword reads as a thin stick in a front or 3/4 shot.
        hand.rotation.y = MathUtils.degToRad(side === 'right' ? -40 : 40);
        joint.add(hand);
      }

      this.joints.set(part.id, joint);
      (part.parent === 'body' ? this.joints.get('body')! : this.root).add(joint);
    }
  }

  /** @param bigHead head scale multiplier (1 = normal). */
  applyPose(pose: Pose, bigHead = 1): void {
    for (const [id, joint] of this.joints) {
      const [x, y, z] = pose.bones[id] ?? [0, 0, 0];
      joint.rotation.set(MathUtils.degToRad(x), MathUtils.degToRad(y), MathUtils.degToRad(z), 'XYZ');
    }
    this.joints.get('head')!.scale.setScalar(bigHead);

    const [px, py, pz] = pose.root?.position ?? [0, 0, 0];
    const [rx, ry, rz] = pose.root?.rotation ?? [0, 0, 0];
    this.root.position.set(px, py, pz);
    this.root.rotation.set(MathUtils.degToRad(rx), MathUtils.degToRad(ry), MathUtils.degToRad(rz), 'XYZ');
    this.root.updateMatrixWorld(true);
  }

  /** Replaces whatever the character is holding. Item geometry/materials are shared and not disposed here. */
  setHeldItems(items: HeldItems = {}): void {
    for (const side of ['right', 'left'] as const) {
      const hand = this.hands[side];
      hand.clear();
      const id = items[side];
      if (id) hand.add(createItemObject(id, this.lighting));
    }
    this.root.updateMatrixWorld(true);
  }

  dispose(): void {
    for (const mesh of this.meshes) mesh.geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.texture.dispose();
  }
}

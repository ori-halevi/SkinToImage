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
import { createSkinBoxGeometry } from './boxGeometry';
import { getPartLayouts, type PartId } from './layout';

export type Lighting = 'flat' | 'shaded';

export interface CharacterOptions {
  model: SkinModel;
  lighting: Lighting;
}

export class Character {
  readonly root = new Group();
  readonly meshes: Mesh[] = [];
  private readonly joints = new Map<PartId, Group>();
  private readonly texture: Texture;
  private readonly materials: Material[];

  constructor(skin: ImageBitmap, options: CharacterOptions) {
    this.texture = new Texture(skin);
    this.texture.flipY = false;
    this.texture.magFilter = NearestFilter;
    this.texture.minFilter = NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.needsUpdate = true;

    const Mat = options.lighting === 'shaded' ? MeshLambertMaterial : MeshBasicMaterial;
    // The base layer is always opaque, like in-game; the overlay layer supports (semi-)transparency.
    const baseMaterial = new Mat({ map: this.texture, side: FrontSide });
    const overlayMaterial = new Mat({ map: this.texture, side: DoubleSide, transparent: true, alphaTest: 0.01 });
    this.materials = [baseMaterial, overlayMaterial];

    for (const part of getPartLayouts(options.model)) {
      const joint = new Group();
      joint.name = part.id;
      joint.position.set(...part.pivot);

      const base = new Mesh(createSkinBoxGeometry(part.size, part.uv), baseMaterial);
      const overlay = new Mesh(createSkinBoxGeometry(part.size, part.overlayUv, part.overlayInflate), overlayMaterial);
      overlay.renderOrder = 1;
      for (const mesh of [base, overlay]) {
        mesh.position.set(...part.offset);
        joint.add(mesh);
        this.meshes.push(mesh);
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

  dispose(): void {
    for (const mesh of this.meshes) mesh.geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.texture.dispose();
  }
}

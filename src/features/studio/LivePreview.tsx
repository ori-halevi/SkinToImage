import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Group, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { POSES } from '../../data/poses';
import { fitCamera } from '../../render/camera';
import type { ItemId } from '../../render/props/items';
import { addLights } from '../../render/renderShot';
import { Character, type Lighting } from '../../render/rig/character';
import type { Skin } from '../skins/types';

interface Props {
  skin: Skin;
  lighting: Lighting;
  bigHead: number;
  heldItem: ItemId | 'none';
}

const STAND = POSES.find((p) => p.id === 'stand')!;
const AUTO_ROTATE_SPEED = 0.6; // radians per second

interface Stage {
  renderer: WebGLRenderer;
  scene: Scene;
  lights: Group;
  camera: PerspectiveCamera;
  character: Character | null;
  /** Rotation of the character, kept across skin/setting changes. */
  angle: number;
  draw: () => void;
}

/**
 * Interactive 3D preview with drag-to-rotate. Owns one extra WebGL context for its whole lifetime;
 * setting changes update the scene in place instead of recreating the renderer.
 */
export function LivePreview({ skin, lighting, bigHead, heldItem }: Props) {
  const { t } = useTranslation();
  const { bitmap, model, overlay, silhouette } = skin; // renaming the skin shouldn't rebuild the scene
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | null>(null);

  // Renderer, camera, input and animation loop: created once per mount.
  useEffect(() => {
    // A fresh canvas per mount: a canvas whose context was lost can't host a new renderer.
    const container = containerRef.current!;
    const canvas = document.createElement('canvas');
    canvas.className = 'block size-full';
    container.appendChild(canvas);
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new Scene();
    const lights = new Group();
    scene.add(lights);

    const stage: Stage = {
      renderer,
      scene,
      lights,
      camera: new PerspectiveCamera(),
      character: null,
      angle: -0.5,
      draw: () => {
        const { clientWidth: w, clientHeight: h } = canvas;
        if (!w || !h) return;
        if (canvas.width !== Math.round(w * renderer.getPixelRatio())) renderer.setSize(w, h, false);
        if (stage.character) {
          stage.character.root.rotation.y = stage.angle;
          stage.character.root.updateMatrixWorld(true);
        }
        renderer.render(scene, stage.camera);
      },
    };
    stageRef.current = stage;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let autoRotate = !reducedMotion;
    let dragging: { x: number; angle: number } | null = null;
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      if (autoRotate && !dragging) stage.angle += ((now - last) / 1000) * AUTO_ROTATE_SPEED;
      last = now;
      stage.draw();
      if (autoRotate || dragging) frame = requestAnimationFrame(tick);
    };

    const onDown = (e: PointerEvent) => {
      dragging = { x: e.clientX, angle: stage.angle };
      autoRotate = false;
      canvas.setPointerCapture(e.pointerId);
      cancelAnimationFrame(frame);
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (dragging) stage.angle = dragging.angle + (e.clientX - dragging.x) * 0.012;
    };
    const onUp = () => {
      dragging = null;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      autoRotate = false;
      stage.angle += e.key === 'ArrowRight' ? 0.3 : -0.3;
      stage.draw();
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    container.addEventListener('keydown', onKey);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      container.removeEventListener('keydown', onKey);
      stage.character?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      stageRef.current = null;
    };
  }, []);

  // Skin texture, arm model, second layer or lighting changed: rebuild the character model.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.character?.root.removeFromParent();
    stage.character?.dispose();
    const character = new Character(bitmap, { model, lighting, overlay, silhouette });
    stage.scene.add(character.root);
    stage.character = character;

    stage.lights.clear();
    if (lighting === 'shaded') addLights(stage.lights, new Vector3(0, 0.1, 1));
  }, [bitmap, model, overlay, silhouette, lighting]);

  // Cheap changes (and after a rebuild): pose, head size and item update the existing model in place.
  useEffect(() => {
    const stage = stageRef.current;
    const character = stage?.character;
    if (!stage || !character) return;
    character.applyPose(STAND, bigHead);
    character.setHeldItems(heldItem === 'none' ? {} : { right: heldItem });
    // Frame a front view with extra margin so the character stays in frame while spinning.
    fitCamera(stage.camera, { id: 'front', yaw: 0, pitch: 8, fov: 30 }, character.meshes, 0.7);
    stage.draw();
  }, [bitmap, model, overlay, silhouette, lighting, bigHead, heldItem]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="img"
      aria-label={t('studio.preview')}
      title={t('studio.preview')}
      className="checker aspect-square w-full cursor-grab touch-none rounded-lg active:cursor-grabbing"
    />
  );
}

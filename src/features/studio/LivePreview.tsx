import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
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

/** Interactive 3D preview with drag-to-rotate. Owns its own (second) WebGL context. */
export function LivePreview({ skin, lighting, bigHead, heldItem }: Props) {
  const { t } = useTranslation();
  const { bitmap, model, overlay } = skin; // renaming the skin shouldn't rebuild the scene
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A fresh canvas per effect run: a canvas whose context was lost can't host a new renderer.
    const container = containerRef.current!;
    const canvas = document.createElement('canvas');
    canvas.className = 'block size-full';
    container.appendChild(canvas);
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new Scene();
    const character = new Character(bitmap, { model, lighting, overlay });
    character.applyPose(STAND, bigHead);
    character.setHeldItems(heldItem === 'none' ? {} : { right: heldItem });
    scene.add(character.root);
    if (lighting === 'shaded') addLights(scene, new Vector3(0, 0.1, 1));

    // Frame a front view with extra margin so the character stays in frame while spinning.
    const camera = new PerspectiveCamera();
    fitCamera(camera, { id: 'front', yaw: 0, pitch: 8, fov: 30 }, character.meshes, 0.7);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let angle = -0.5;
    let autoRotate = !reducedMotion;
    let dragging: { x: number; angle: number } | null = null;
    let frame = 0;
    let last = performance.now();

    const draw = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      if (canvas.width !== Math.round(w * renderer.getPixelRatio())) renderer.setSize(w, h, false);
      character.root.rotation.y = angle;
      character.root.updateMatrixWorld(true);
      renderer.render(scene, camera);
    };

    const tick = (now: number) => {
      if (autoRotate && !dragging) angle += ((now - last) / 1000) * AUTO_ROTATE_SPEED;
      last = now;
      draw();
      if (autoRotate || dragging) frame = requestAnimationFrame(tick);
    };

    const onDown = (e: PointerEvent) => {
      dragging = { x: e.clientX, angle };
      autoRotate = false;
      canvas.setPointerCapture(e.pointerId);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (dragging) angle = dragging.angle + (e.clientX - dragging.x) * 0.012;
    };
    const onUp = () => {
      dragging = null;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      autoRotate = false;
      angle += e.key === 'ArrowRight' ? 0.3 : -0.3;
      draw();
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
      character.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [bitmap, model, overlay, lighting, bigHead, heldItem]);

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

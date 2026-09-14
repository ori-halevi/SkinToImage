import type { TFunction } from 'i18next';
import { renderShot } from '../../render/renderShot';
import { addImagesToEditor } from '../composer/addToEditor';
import { shotName } from './Gallery';
import { buildShot, type ShotContext, type ShotRef } from './shots';

/** Characters for the editor are rendered large enough for a 1920px canvas. */
const EDITOR_RENDER_SIZE = 2048;

/**
 * Renders shots as transparent, tightly cropped images (the editor has its own background)
 * and adds them to the open editor project. Doesn't load the editor's canvas library.
 */
export async function addShotsToEditor(shots: ShotRef[], ctx: ShotContext, t: TFunction, onProgress?: (done: number) => void): Promise<void> {
  const editorCtx: ShotContext = { ...ctx, settings: { ...ctx.settings, background: { type: 'transparent' }, frame: 'fit' } };
  const images: { blob: Blob; label: string }[] = [];
  for (const shot of shots) {
    const spec = buildShot(shot, editorCtx, EDITOR_RENDER_SIZE);
    if (!spec) continue;
    images.push({ blob: await renderShot(spec), label: shotName(t, shot) });
    onProgress?.(images.length);
  }
  await addImagesToEditor(images, t('composer.untitled'));
}

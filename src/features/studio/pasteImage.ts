import { registerBackgroundImage } from '../../render/postprocess/frame';
import { useStudio } from '../../store/studio';
import { loadSkinFromBlob } from '../skins/loadSkin';
import { validateDimensions } from '../skins/validation';

/**
 * A pasted image becomes a skin when it's shaped like one (square PNG, multiple of 64),
 * otherwise the background. A background needs a frame, so a tight frame switches to 16:9.
 */
export async function pasteIntoStudio(image: Blob): Promise<'skin' | 'background'> {
  const bitmap = await createImageBitmap(image);
  const skinShaped = image.type === 'image/png' && validateDimensions(bitmap.width, bitmap.height) === null;
  bitmap.close();

  const store = useStudio.getState();
  if (skinShaped) {
    store.addSkin(await loadSkinFromBlob(image, 'pasted-skin.png'));
    return 'skin';
  }
  const imageId = await registerBackgroundImage(image);
  store.updateSettings({ background: { type: 'image', imageId }, frame: store.settings.frame === 'fit' ? '16:9' : store.settings.frame });
  return 'background';
}

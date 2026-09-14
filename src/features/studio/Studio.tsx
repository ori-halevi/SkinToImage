import { useEffect } from 'react';
import { getCamera } from '../../data/cameras';
import { pasteIntoStudio } from './pasteImage';
import { imageFromPaste, isEditingText } from '../export/clipboard';
import { useStudio } from '../../store/studio';
import { AddSkinDialog } from '../skins/UploadPanel';
import type { Skin } from '../skins/types';
import { Gallery } from './Gallery';
import { ShotDialog } from './ShotDialog';
import { Sidebar } from './Sidebar';

export function Studio({ skin }: { skin: Skin }) {
  const cameraId = useStudio((s) => s.cameraId);
  const openShot = useStudio((s) => s.openShot);
  const addSkinOpen = useStudio((s) => s.addSkinOpen);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isEditingText(e) || document.querySelector('dialog[open]')) return;
      const image = imageFromPaste(e);
      if (!image) return;
      e.preventDefault();
      void pasteIntoStudio(image);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-[300px_1fr]">
      <Sidebar skin={skin} />
      <Gallery skin={skin} cameraId={getCamera(cameraId).id} />
      {openShot && <ShotDialog skin={skin} shot={openShot} />}
      {addSkinOpen && <AddSkinDialog />}
    </div>
  );
}

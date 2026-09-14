import { CAMERAS } from '../../data/cameras';
import { useStudio } from '../../store/studio';
import type { Skin } from '../skins/types';
import { Gallery } from './Gallery';
import { ShotDialog } from './ShotDialog';
import { Sidebar } from './Sidebar';

export function Studio({ skin }: { skin: Skin }) {
  const cameraId = useStudio((s) => s.cameraId);
  const openShot = useStudio((s) => s.openShot);
  const camera = CAMERAS.find((c) => c.id === cameraId) ?? CAMERAS[0];

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      <Sidebar key={skin.id} skin={skin} />
      <Gallery skin={skin} camera={camera} />
      {openShot && <ShotDialog skin={skin} shot={openShot} />}
    </div>
  );
}

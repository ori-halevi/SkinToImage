import { navigate } from '../../app/route';
import { createImageLayer } from './docOps';
import { assetSize, listProjects, saveAsset } from './storage';
import { useComposer } from './store';

/** Makes sure a project is open: the one already in memory, the most recent saved one, or a new one. */
export async function ensureProject(defaultName: string) {
  const state = useComposer.getState();
  if (state.project) return state.project;
  const [latest] = await listProjects();
  if (latest) {
    state.openProject(latest);
    return latest;
  }
  return state.newProject(defaultName);
}

/** Stores rendered images as assets, adds them to the open project and switches to the editor. */
export async function addImagesToEditor(images: { blob: Blob; label: string }[], defaultProjectName: string): Promise<void> {
  await ensureProject(defaultProjectName);
  for (const { blob, label } of images) {
    const [assetId, size] = await Promise.all([saveAsset(blob), assetSize(blob)]);
    const { project, addLayer } = useComposer.getState();
    if (!project) return;
    addLayer(createImageLayer(project, { assetId, label, ...size }));
  }
  navigate('editor');
}

import { createStore, del, entries, get, set } from 'idb-keyval';
import type { Project } from './types';

// Separate databases: idb-keyval's createStore opens one object store per database.
const projectsDb = createStore('sti-composer-projects', 'projects');
const assetsDb = createStore('sti-composer-assets', 'assets');

// ---------- Assets (character renders and uploaded images) ----------

export async function saveAsset(blob: Blob): Promise<string> {
  const id = crypto.randomUUID();
  await set(id, blob, assetsDb);
  return id;
}

const loaded = new Map<string, Promise<HTMLImageElement>>();

/** Decodes an asset once and shares the image element between the editor and exports. */
export function loadAssetImage(id: string): Promise<HTMLImageElement> {
  let promise = loaded.get(id);
  if (!promise) {
    promise = (async () => {
      const blob = await get<Blob>(id, assetsDb);
      if (!blob) throw new Error(`Missing asset ${id}`);
      const image = new Image();
      image.src = URL.createObjectURL(blob);
      await image.decode();
      return image;
    })();
    promise.catch(() => loaded.delete(id));
    loaded.set(id, promise);
  }
  return promise;
}

export async function assetSize(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

function releaseAsset(id: string) {
  const promise = loaded.get(id);
  loaded.delete(id);
  void promise?.then((image) => URL.revokeObjectURL(image.src)).catch(() => undefined);
}

// ---------- Projects ----------

export async function listProjects(): Promise<Project[]> {
  try {
    const all = (await entries<string, Project>(projectsDb)).map(([, p]) => p);
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function saveProject(project: Project): Promise<void> {
  try {
    await set(project.id, project, projectsDb);
  } catch {
    // Storage full or unavailable: editing still works for this visit.
  }
}

/**
 * Copies a project under a new name so the original stays untouched. Images are shared: they're
 * only deleted once no project uses them.
 */
export async function duplicateProject(project: Project, name: string): Promise<Project> {
  const now = Date.now();
  const copy: Project = { ...project, id: crypto.randomUUID(), name, createdAt: now, updatedAt: now };
  await saveProject(copy);
  return copy;
}

export function projectAssetIds(project: Pick<Project, 'layers' | 'background'>): string[] {
  const ids = project.layers.flatMap((l) => (l.type === 'image' ? [l.assetId] : []));
  if (project.background.type === 'image') ids.push(project.background.imageId);
  return ids;
}

/** Deletes a project and the images only it uses. */
export async function deleteProject(id: string): Promise<void> {
  const all = await listProjects();
  const target = all.find((p) => p.id === id);
  await del(id, projectsDb);
  if (!target) return;
  const stillUsed = new Set(all.filter((p) => p.id !== id).flatMap(projectAssetIds));
  for (const assetId of projectAssetIds(target)) {
    if (stillUsed.has(assetId)) continue;
    releaseAsset(assetId);
    await del(assetId, assetsDb);
  }
}

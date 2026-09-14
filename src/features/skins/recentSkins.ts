import { createStore, del, entries, set } from 'idb-keyval';
import { loadSkinFromBlob } from './loadSkin';
import type { OverlayParts, Skin, SkinModel } from './types';

export const MAX_RECENT_SKINS = 10;

const NO_OVERLAY: OverlayParts = { head: false, body: false, rightArm: false, leftArm: false, rightLeg: false, leftLeg: false };

interface StoredSkin {
  id: string;
  name: string;
  model: SkinModel;
  overlay?: OverlayParts;
  /** Saved by older versions, before per-part layers. */
  showOverlay?: boolean;
  blob: Blob;
  lastUsedAt: number;
}

const store = createStore('skin-to-image', 'skins');

/** Newest first. Silently returns [] when IndexedDB is unavailable. */
export async function listRecentSkins(): Promise<Skin[]> {
  try {
    const stored = (await entries<string, StoredSkin>(store)).map(([, s]) => s);
    stored.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    const skins = await Promise.all(
      stored.slice(0, MAX_RECENT_SKINS).map(async (s) => {
        try {
          const skin = await loadSkinFromBlob(s.blob, s.name, {
            id: s.id,
            model: s.model,
            overlay: s.overlay ?? (s.showOverlay === false ? NO_OVERLAY : undefined),
          });
          return { ...skin, lastUsedAt: s.lastUsedAt };
        } catch {
          await del(s.id, store);
          return null;
        }
      }),
    );
    return skins.filter((s): s is Skin => s !== null);
  } catch {
    return [];
  }
}

export async function saveRecentSkin(skin: Skin): Promise<void> {
  try {
    const stored: StoredSkin = {
      id: skin.id,
      name: skin.name,
      model: skin.model,
      overlay: skin.overlay,
      blob: skin.blob,
      lastUsedAt: skin.lastUsedAt,
    };
    await set(skin.id, stored, store);
    const all = (await entries<string, StoredSkin>(store)).map(([, s]) => s).sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    await Promise.all(all.slice(MAX_RECENT_SKINS).map((s) => del(s.id, store)));
  } catch {
    // Persistence is a convenience; the app keeps working without it.
  }
}

export async function removeRecentSkin(id: string): Promise<void> {
  try {
    await del(id, store);
  } catch {
    // Ignore.
  }
}

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CameraId } from '../data/cameras';
import type { PoseCategory } from '../data/poses/types';
import { saveRecentSkin } from '../features/skins/recentSkins';
import type { Skin } from '../features/skins/types';
import { castForScene, shotKey, swapCast, type ShotKind, type ShotRef } from '../features/studio/shots';
import { getScene, SCENES } from '../data/scenes';
import { releaseBackgroundImages } from '../render/postprocess/frame';
import { forgetSkin, type RenderSettings } from '../render/renderShot';
import { DEFAULT_SETTINGS, sanitizeCameraId, sanitizeOneOf, sanitizeSettings } from './sanitize';

export { DEFAULT_SETTINGS };

export const EXPORT_SIZES = [1024, 2048, 4096] as const;
export type ExportSize = (typeof EXPORT_SIZES)[number];
export const MAX_ACTIVE_SKINS = 6;
export const DEFAULT_CAMERA_ID: CameraId = 'left';
export const DEFAULT_EXPORT_SIZE: ExportSize = 2048;

type SkinPatch = Partial<Pick<Skin, 'name' | 'model' | 'overlay' | 'silhouette'>>;

interface StudioState {
  /** Skins in this session, up to MAX_ACTIVE_SKINS. */
  skins: Skin[];
  activeSkinId: string | null;
  sceneCast: Record<string, string[]>;
  settings: RenderSettings;
  cameraId: CameraId;
  exportSize: ExportSize;
  mode: ShotKind;
  category: PoseCategory | 'all';
  /** Scenes filter: number of characters, or all. */
  sceneSize: number | 'all';
  /** Selected shot keys, in selection order. */
  selection: string[];
  openShot: ShotRef | null;
  addSkinOpen: boolean;

  addSkin: (skin: Skin) => void;
  removeSkin: (id: string) => void;
  clearSkins: () => void;
  setActiveSkin: (id: string) => void;
  updateSkin: (id: string, patch: SkinPatch) => void;
  /** Stores the full cast (skin id per slot) for a scene. */
  setSceneCast: (sceneId: string, skinIds: string[]) => void;
  /** Swaps who plays which character in one scene, or in every scene when no id is given. */
  swapCast: (sceneId?: string) => void;
  updateSettings: (patch: Partial<RenderSettings>) => void;
  resetSettings: () => void;
  setCamera: (cameraId: CameraId) => void;
  setExportSize: (size: ExportSize) => void;
  setMode: (mode: ShotKind) => void;
  setCategory: (category: PoseCategory | 'all') => void;
  setSceneSize: (size: number | 'all') => void;
  toggleSelected: (shot: ShotRef) => void;
  setSelection: (keys: string[]) => void;
  setOpenShot: (shot: ShotRef | null) => void;
  setAddSkinOpen: (open: boolean) => void;
}


export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      skins: [],
      activeSkinId: null,
      sceneCast: {},
      settings: DEFAULT_SETTINGS,
      cameraId: DEFAULT_CAMERA_ID,
      exportSize: DEFAULT_EXPORT_SIZE,
      mode: 'pose',
      category: 'all',
      sceneSize: 'all',
      selection: [],
      openShot: null,
      addSkinOpen: false,

      addSkin: (skin) => {
        void saveRecentSkin(skin);
        set((s) => {
          const all = [...s.skins.filter((k) => k.id !== skin.id), skin];
          // Over the limit: the oldest skins make room (and free their cached 3D models).
          for (const evicted of all.slice(0, -MAX_ACTIVE_SKINS)) forgetSkin(evicted.id);
          // Swaps and manual picks pin each scene's cast to the skins that existed then; go back to
          // automatic casting so the new skin shows up in every scene (led by the new active skin).
          const isNew = !s.skins.some((k) => k.id === skin.id);
          return {
            skins: all.slice(-MAX_ACTIVE_SKINS),
            activeSkinId: skin.id,
            addSkinOpen: false,
            sceneCast: isNew ? {} : s.sceneCast,
          };
        });
      },
      removeSkin: (id) => {
        forgetSkin(id);
        set((s) => {
          const skins = s.skins.filter((k) => k.id !== id);
          const activeSkinId = s.activeSkinId === id ? (skins.at(-1)?.id ?? null) : s.activeSkinId;
          return { skins, activeSkinId, selection: skins.length ? s.selection : [], openShot: skins.length ? s.openShot : null };
        });
      },
      clearSkins: () => {
        for (const skin of get().skins) forgetSkin(skin.id);
        set({ skins: [], activeSkinId: null, selection: [], openShot: null });
      },
      setActiveSkin: (activeSkinId) => set({ activeSkinId }),
      updateSkin: (id, patch) => {
        const skin = get().skins.find((k) => k.id === id);
        if (!skin) return;
        const next = { ...skin, ...patch };
        void saveRecentSkin(next);
        set((s) => ({ skins: s.skins.map((k) => (k.id === id ? next : k)) }));
      },
      setSceneCast: (sceneId, skinIds) => set((s) => ({ sceneCast: { ...s.sceneCast, [sceneId]: skinIds } })),
      swapCast: (sceneId) =>
        set((s) => {
          const activeSkin = s.skins.find((k) => k.id === s.activeSkinId) ?? s.skins[0];
          if (!activeSkin) return {};
          const ctx = { skins: s.skins, activeSkin, sceneCast: s.sceneCast };
          const scenes = sceneId ? [getScene(sceneId)].filter((x) => !!x) : SCENES;
          const sceneCast = { ...s.sceneCast };
          for (const scene of scenes) {
            sceneCast[scene.id] = swapCast(castForScene(scene, ctx), (k) => k.id).map((k) => k.id);
          }
          return { sceneCast };
        }),
      updateSettings: (patch) => {
        // Leaving the image background frees the decoded photo.
        if (patch.background && patch.background.type !== 'image') releaseBackgroundImages();
        set((s) => ({ settings: { ...s.settings, ...patch } }));
      },
      resetSettings: () => {
        releaseBackgroundImages();
        set({ settings: DEFAULT_SETTINGS, cameraId: DEFAULT_CAMERA_ID, exportSize: DEFAULT_EXPORT_SIZE });
      },
      setCamera: (cameraId) => set({ cameraId }),
      setExportSize: (exportSize) => set({ exportSize }),
      setMode: (mode) => set({ mode }),
      setCategory: (category) => set({ category }),
      setSceneSize: (sceneSize) => set({ sceneSize }),
      toggleSelected: (shot) =>
        set((s) => {
          const key = shotKey(shot);
          return { selection: s.selection.includes(key) ? s.selection.filter((k) => k !== key) : [...s.selection, key] };
        }),
      setSelection: (selection) => set({ selection }),
      setOpenShot: (openShot) => set({ openShot }),
      setAddSkinOpen: (addSkinOpen) => set({ addSkinOpen }),
    }),
    {
      name: 'studio-prefs',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        // Uploaded background images live in memory only, so don't persist a reference to one.
        settings: s.settings.background.type === 'image' ? { ...s.settings, background: DEFAULT_SETTINGS.background } : s.settings,
        cameraId: s.cameraId,
        exportSize: s.exportSize,
      }),
      migrate: (persisted) => persisted as Partial<StudioState>,
      // Saved data may come from older versions: validate every field instead of trusting it.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Record<'settings' | 'cameraId' | 'exportSize', unknown>>;
        return {
          ...current,
          settings: sanitizeSettings(p.settings),
          cameraId: sanitizeCameraId(p.cameraId, DEFAULT_CAMERA_ID),
          exportSize: sanitizeOneOf(p.exportSize, EXPORT_SIZES, DEFAULT_EXPORT_SIZE),
        };
      },
    },
  ),
);

export function useActiveSkin(): Skin | null {
  return useStudio((s) => s.skins.find((k) => k.id === s.activeSkinId) ?? s.skins[0] ?? null);
}

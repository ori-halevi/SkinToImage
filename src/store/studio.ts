import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CameraId } from '../data/cameras';
import type { PoseCategory } from '../data/poses/types';
import { saveRecentSkin } from '../features/skins/recentSkins';
import type { Skin } from '../features/skins/types';
import type { RenderSettings } from '../render/renderPose';

export const EXPORT_SIZES = [1024, 2048, 4096] as const;
export type ExportSize = (typeof EXPORT_SIZES)[number];

/** A gallery item: one pose seen from one camera. */
export interface ShotId {
  poseId: string;
  cameraId: CameraId;
}

export const shotKey = (shot: ShotId) => `${shot.poseId}|${shot.cameraId}`;

export function parseShotKey(key: string): ShotId {
  const [poseId, cameraId] = key.split('|');
  return { poseId, cameraId: cameraId as CameraId };
}

interface StudioState {
  skin: Skin | null;
  settings: RenderSettings;
  cameraId: CameraId;
  exportSize: ExportSize;
  category: PoseCategory | 'all';
  /** Selected shot keys, in selection order. */
  selection: string[];
  openShot: ShotId | null;

  setSkin: (skin: Skin | null) => void;
  updateSkin: (patch: Partial<Pick<Skin, 'name' | 'model'>>) => void;
  updateSettings: (patch: Partial<RenderSettings>) => void;
  setCamera: (cameraId: CameraId) => void;
  setExportSize: (size: ExportSize) => void;
  setCategory: (category: PoseCategory | 'all') => void;
  toggleSelected: (shot: ShotId) => void;
  setSelection: (keys: string[]) => void;
  setOpenShot: (shot: ShotId | null) => void;
}

export const DEFAULT_SETTINGS: RenderSettings = {
  lighting: 'shaded',
  bigHead: 1,
  outline: { enabled: true, width: 16, color: '#ffffff' },
};

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      skin: null,
      settings: DEFAULT_SETTINGS,
      cameraId: 'left',
      exportSize: 2048,
      category: 'all',
      selection: [],
      openShot: null,

      setSkin: (skin) => {
        if (skin) void saveRecentSkin(skin);
        set({ skin, selection: [], openShot: null });
      },
      updateSkin: (patch) => {
        const skin = get().skin;
        if (!skin) return;
        const next = { ...skin, ...patch };
        void saveRecentSkin(next);
        set({ skin: next });
      },
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setCamera: (cameraId) => set({ cameraId }),
      setExportSize: (exportSize) => set({ exportSize }),
      setCategory: (category) => set({ category }),
      toggleSelected: (shot) =>
        set((s) => {
          const key = shotKey(shot);
          return { selection: s.selection.includes(key) ? s.selection.filter((k) => k !== key) : [...s.selection, key] };
        }),
      setSelection: (selection) => set({ selection }),
      setOpenShot: (openShot) => set({ openShot }),
    }),
    {
      name: 'studio-prefs',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ settings: s.settings, cameraId: s.cameraId, exportSize: s.exportSize }),
    },
  ),
);

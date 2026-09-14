import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CAMERAS, type CameraPreset } from '../../data/cameras';
import { POSE_CATEGORIES, POSES } from '../../data/poses';
import type { Pose } from '../../data/poses/types';
import { renderPose } from '../../render/renderPose';
import { isAbortError } from '../../render/renderer';
import { parseShotKey, shotKey, useStudio } from '../../store/studio';
import { buttonPrimary, buttonSecondary } from '../../ui/controls';
import { downloadBlob, exportFilename } from '../export/exportImage';
import { buildZip, type ZipEntry } from '../export/zip';
import type { Skin } from '../skins/types';
import { useRenderUrl } from './useRenderUrl';

const THUMB_SIZE = 512;

export function Gallery({ skin, camera }: { skin: Skin; camera: CameraPreset }) {
  const { t } = useTranslation();
  const category = useStudio((s) => s.category);
  const setCategory = useStudio((s) => s.setCategory);
  const selection = useStudio((s) => s.selection);
  const setSelection = useStudio((s) => s.setSelection);

  const poses = category === 'all' ? POSES : POSES.filter((p) => p.category === category);
  const visibleKeys = poses.map((p) => shotKey({ poseId: p.id, cameraId: camera.id }));

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div role="tablist" className="flex flex-wrap gap-2">
        {(['all', ...POSE_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={category === c}
            onClick={() => setCategory(c)}
            className={`rounded-full border px-3 py-1 text-sm ${
              category === c ? 'border-grass bg-grass/15 text-white' : 'border-edge text-slate-400 hover:text-white'
            }`}
          >
            {c === 'all' ? t('gallery.all') : t(`categories.${c}`)}
          </button>
        ))}
      </div>

      <SelectionBar
        skin={skin}
        onSelectAll={() => setSelection([...new Set([...selection, ...visibleKeys])])}
      />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {poses.map((pose) => (
          <li key={pose.id}>
            <ShotCard skin={skin} pose={pose} camera={camera} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ShotCard({ skin, pose, camera }: { skin: Skin; pose: Pose; camera: CameraPreset }) {
  const { t } = useTranslation();
  const settings = useStudio((s) => s.settings);
  const shot = { poseId: pose.id, cameraId: camera.id };
  const selected = useStudio((s) => s.selection.includes(shotKey(shot)));
  const toggleSelected = useStudio((s) => s.toggleSelected);
  const setOpenShot = useStudio((s) => s.setOpenShot);
  const { url, pending, failed } = useRenderUrl({ skin, pose, camera, settings, size: THUMB_SIZE });
  const name = t(`poses.${pose.id}`);

  return (
    <div
      data-testid={`shot-${pose.id}`}
      className={`group relative overflow-hidden rounded-lg border-2 bg-panel transition-colors ${
        selected ? 'border-grass' : 'border-edge hover:border-slate-500'
      }`}
    >
      <button onClick={() => setOpenShot(shot)} className="block w-full text-start" aria-label={t('gallery.open', { name })}>
        <div className="checker flex aspect-square items-center justify-center p-3">
          {url ? (
            <img src={url} alt="" className={`max-h-full max-w-full object-contain transition-opacity ${pending ? 'opacity-60' : ''}`} />
          ) : failed ? (
            <span className="text-xs text-red-300">{t('errors.render')}</span>
          ) : (
            <span className="size-6 animate-pulse rounded bg-edge" />
          )}
        </div>
        <div className="truncate px-2 py-1.5 text-sm">{name}</div>
      </button>
      <label className="absolute end-2 top-2 flex size-7 cursor-pointer items-center justify-center rounded-md bg-ink/80">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => toggleSelected(shot)}
          aria-label={t('gallery.select', { name })}
          className="size-4 cursor-pointer accent-grass"
        />
      </label>
    </div>
  );
}

function SelectionBar({ skin, onSelectAll }: { skin: Skin; onSelectAll: () => void }) {
  const { t } = useTranslation();
  const selection = useStudio((s) => s.selection);
  const setSelection = useStudio((s) => s.setSelection);
  const settings = useStudio((s) => s.settings);
  const exportSize = useStudio((s) => s.exportSize);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const downloadZip = async () => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(false);
    const shots = selection.map(parseShotKey);
    setProgress({ done: 0, total: shots.length });
    try {
      const entries: ZipEntry[] = [];
      for (const [i, shot] of shots.entries()) {
        const pose = POSES.find((p) => p.id === shot.poseId);
        const camera = CAMERAS.find((c) => c.id === shot.cameraId);
        if (!pose || !camera) continue;
        const blob = await renderPose({ skin, pose, camera, settings, size: exportSize, signal: controller.signal });
        entries.push({ filename: exportFilename(skin.name, pose.id, camera.id), data: new Uint8Array(await blob.arrayBuffer()) });
        setProgress({ done: i + 1, total: shots.length });
      }
      downloadBlob(buildZip(entries), `${skin.name}_poses.zip`);
    } catch (e) {
      if (!isAbortError(e)) {
        console.error(e);
        setError(true);
      }
    } finally {
      setProgress(null);
      controllerRef.current = null;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-edge bg-panel px-3 py-2 text-sm">
      <span className="me-auto text-slate-300" role="status">
        {progress
          ? t('gallery.zipProgress', progress)
          : error
            ? t('errors.render')
            : t('gallery.selected', { count: selection.length })}
      </span>
      {progress ? (
        <button onClick={() => controllerRef.current?.abort()} className={`${buttonSecondary} py-1`}>
          {t('gallery.cancel')}
        </button>
      ) : (
        <>
          <button onClick={onSelectAll} className={`${buttonSecondary} py-1`}>
            {t('gallery.selectAll')}
          </button>
          <button onClick={() => setSelection([])} disabled={selection.length === 0} className={`${buttonSecondary} py-1`}>
            {t('gallery.clear')}
          </button>
          <button onClick={downloadZip} disabled={selection.length === 0} className={`${buttonPrimary} py-1`}>
            {t('gallery.downloadZip')}
          </button>
        </>
      )}
    </div>
  );
}

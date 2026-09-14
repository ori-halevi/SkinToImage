import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CameraId } from '../../data/cameras';
import { POSE_CATEGORIES, POSES } from '../../data/poses';
import { SCENES } from '../../data/scenes';
import { renderShot } from '../../render/renderShot';
import { isAbortError } from '../../render/renderer';
import { useStudio } from '../../store/studio';
import { buttonPrimary, buttonSecondary } from '../../ui/controls';
import { downloadBlob } from '../export/exportImage';
import { buildZip, type ZipEntry } from '../export/zip';
import type { Skin } from '../skins/types';
import { buildShot, parseShotKey, shotFilename, shotKey, type ShotContext, type ShotRef } from './shots';
import { useRenderUrl } from './useRenderUrl';

const THUMB_SIZE = 512;

export function useShotContext(activeSkin: Skin): ShotContext {
  const skins = useStudio((s) => s.skins);
  const sceneCast = useStudio((s) => s.sceneCast);
  const settings = useStudio((s) => s.settings);
  return { skins, activeSkin, sceneCast, settings };
}

export function Gallery({ skin, cameraId }: { skin: Skin; cameraId: CameraId }) {
  const { t } = useTranslation();
  const mode = useStudio((s) => s.mode);
  const setMode = useStudio((s) => s.setMode);
  const category = useStudio((s) => s.category);
  const setCategory = useStudio((s) => s.setCategory);
  const skinCount = useStudio((s) => s.skins.length);

  const shots: ShotRef[] =
    mode === 'pose'
      ? (category === 'all' ? POSES : POSES.filter((p) => p.category === category)).map((p) => ({ kind: 'pose', id: p.id, cameraId }))
      : SCENES.map((s) => ({ kind: 'scene', id: s.id, cameraId }));

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" className="flex rounded-lg border border-edge p-0.5">
          {(['pose', 'scene'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold ${mode === m ? 'bg-grass text-ink' : 'text-slate-300 hover:text-white'}`}
            >
              {t(m === 'pose' ? 'gallery.posesTab' : 'gallery.scenesTab')}
            </button>
          ))}
        </div>

        {mode === 'pose' && (
          <div className="flex flex-wrap gap-2">
            {(['all', ...POSE_CATEGORIES] as const).map((c) => (
              <button
                key={c}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  category === c ? 'border-grass bg-grass/15 text-white' : 'border-edge text-slate-400 hover:text-white'
                }`}
              >
                {c === 'all' ? t('gallery.all') : t(`categories.${c}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === 'scene' && skinCount < 2 && <p className="text-sm text-slate-400">{t('gallery.scenesHint')}</p>}

      <SelectionBar skin={skin} visible={shots} />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shots.map((shot) => (
          <li key={shotKey(shot)}>
            <ShotCard skin={skin} shot={shot} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function shotName(t: (key: string) => string, shot: ShotRef): string {
  return t(shot.kind === 'pose' ? `poses.${shot.id}` : `scenes.${shot.id}`);
}

function ShotCard({ skin, shot }: { skin: Skin; shot: ShotRef }) {
  const { t } = useTranslation();
  const ctx = useShotContext(skin);
  const selected = useStudio((s) => s.selection.includes(shotKey(shot)));
  const toggleSelected = useStudio((s) => s.toggleSelected);
  const setOpenShot = useStudio((s) => s.setOpenShot);
  const { url, pending, failed } = useRenderUrl(buildShot(shot, ctx, THUMB_SIZE));
  const name = shotName(t, shot);

  return (
    <div
      data-testid={`shot-${shot.id}`}
      className={`group relative overflow-hidden rounded-lg border-2 bg-panel transition-colors ${
        selected ? 'border-grass' : 'border-edge hover:border-slate-500'
      }`}
    >
      <button onClick={() => setOpenShot(shot)} className="block w-full text-start" aria-label={t('gallery.open', { name })}>
        <div className="checker flex aspect-square items-center justify-center p-3">
          {url ? (
            <img src={url} alt="" className={`fade-in max-h-full max-w-full object-contain transition-opacity duration-200 ${pending ? 'opacity-60' : ''}`} />
          ) : failed ? (
            <span className="text-xs text-red-300">{t('errors.render')}</span>
          ) : (
            <span className="size-6 animate-pulse rounded bg-edge" />
          )}
        </div>
        <div className="truncate px-2 py-1.5 text-sm">{name}</div>
      </button>
      <label className="absolute inset-e-2 top-2 flex size-7 cursor-pointer items-center justify-center rounded-md bg-ink/80">
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

function SelectionBar({ skin, visible }: { skin: Skin; visible: ShotRef[] }) {
  const { t } = useTranslation();
  const ctx = useShotContext(skin);
  const selection = useStudio((s) => s.selection);
  const setSelection = useStudio((s) => s.setSelection);
  const exportSize = useStudio((s) => s.exportSize);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const downloadZip = async (shots: ShotRef[]) => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(false);
    setProgress({ done: 0, total: shots.length });
    try {
      const entries: ZipEntry[] = [];
      for (const [i, shot] of shots.entries()) {
        const spec = buildShot(shot, ctx, exportSize);
        if (!spec) continue;
        const blob = await renderShot({ ...spec, signal: controller.signal });
        entries.push({ filename: shotFilename(shot, ctx), data: new Uint8Array(await blob.arrayBuffer()) });
        setProgress({ done: i + 1, total: shots.length });
      }
      downloadBlob(buildZip(entries), `${skin.name}_images.zip`);
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

  const visibleKeys = visible.map(shotKey);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-edge bg-panel px-3 py-2 text-sm">
      <span className="me-auto text-slate-300" role="status">
        {progress ? t('gallery.zipProgress', progress) : error ? t('errors.render') : t('gallery.selected', { count: selection.length })}
      </span>
      {progress ? (
        <button onClick={() => controllerRef.current?.abort()} className={`${buttonSecondary} py-1`}>
          {t('gallery.cancel')}
        </button>
      ) : (
        <>
          <button onClick={() => setSelection([...new Set([...selection, ...visibleKeys])])} className={`${buttonSecondary} py-1`}>
            {t('gallery.selectAll')}
          </button>
          <button onClick={() => setSelection([])} disabled={selection.length === 0} className={`${buttonSecondary} py-1`}>
            {t('gallery.clear')}
          </button>
          <button onClick={() => downloadZip(visible)} className={`${buttonSecondary} py-1`}>
            {t('gallery.downloadAll')}
          </button>
          <button onClick={() => downloadZip(selection.map(parseShotKey))} disabled={selection.length === 0} className={`${buttonPrimary} py-1`}>
            {t('gallery.downloadZip')}
          </button>
        </>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CAMERAS } from '../../data/cameras';
import { POSES } from '../../data/poses';
import { getScene, SCENES } from '../../data/scenes';
import { renderShot } from '../../render/renderShot';
import { useStudio } from '../../store/studio';
import { buttonPrimary, buttonSecondary, Chips } from '../../ui/controls';
import { canCopyImage, canShareFiles, copyImage, downloadBlob, shareImage } from '../export/exportImage';
import type { Skin } from '../skins/types';
import { shotName, useShotContext } from './Gallery';
import { buildShot, castForScene, shotFilename, shotKey, type ShotRef } from './shots';
import { useRenderUrl } from './useRenderUrl';

const PREVIEW_SIZE = 1024;

export function ShotDialog({ skin, shot }: { skin: Skin; shot: ShotRef }) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const ctx = useShotContext(skin);
  const exportSize = useStudio((s) => s.exportSize);
  const setOpenShot = useStudio((s) => s.setOpenShot);
  const toggleSelected = useStudio((s) => s.toggleSelected);
  const setCastSlot = useStudio((s) => s.setCastSlot);
  const selected = useStudio((s) => s.selection.includes(shotKey(shot)));
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const spec = buildShot(shot, ctx, PREVIEW_SIZE);
  const { url, pending } = useRenderUrl(spec, 0);
  const name = shotName(t, shot);
  const filename = shotFilename(shot, ctx);
  const scene = shot.kind === 'scene' ? getScene(shot.id) : undefined;

  useEffect(() => {
    const dialog = dialogRef.current!;
    if (!dialog.open) dialog.showModal();
    return () => dialog.close();
  }, []);

  useEffect(() => setStatus(null), [shot.kind, shot.id, shot.cameraId]);

  const ids = shot.kind === 'pose' ? POSES.map((p) => p.id) : SCENES.map((s) => s.id);
  const go = (delta: number) => {
    const index = ids.indexOf(shot.id);
    setOpenShot({ ...shot, id: ids[(index + delta + ids.length) % ids.length] });
  };

  const renderExport = () => renderShot(buildShot(shot, ctx, exportSize)!);

  const run = async (action: () => Promise<void>, done: string) => {
    setBusy(true);
    setStatus(null);
    try {
      await action();
      setStatus(done);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setStatus(t('errors.action'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={name}
      onClose={() => setOpenShot(null)}
      onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
      onKeyDown={(e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
        const rtl = document.documentElement.dir === 'rtl';
        if (e.key === 'ArrowRight') go(rtl ? -1 : 1);
        if (e.key === 'ArrowLeft') go(rtl ? 1 : -1);
      }}
      className="m-auto w-[min(94vw,760px)] rounded-xl border border-edge bg-panel p-0 text-slate-100 backdrop:bg-black/70"
    >
      <div className="flex items-center gap-2 border-b border-edge px-4 py-3">
        <h2 className="me-auto text-lg font-semibold">{name}</h2>
        <button onClick={() => dialogRef.current?.close()} className="rounded px-2 py-1 text-slate-400 hover:text-white" aria-label={t('dialog.close')}>
          ✕
        </button>
      </div>

      <div className="relative">
        <div className="checker flex aspect-square max-h-[55vh] w-full items-center justify-center p-6">
          {url && <img src={url} alt={name} className={`max-h-full max-w-full object-contain ${pending ? 'opacity-60' : ''}`} />}
        </div>
        <button onClick={() => go(-1)} aria-label={t('dialog.previous')} className="absolute inset-s-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/80 px-3 py-2 text-xl hover:bg-ink">
          <span className="inline-block rtl:rotate-180">‹</span>
        </button>
        <button onClick={() => go(1)} aria-label={t('dialog.next')} className="absolute inset-e-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/80 px-3 py-2 text-xl hover:bg-ink">
          <span className="inline-block rtl:rotate-180">›</span>
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <Chips
          dir="ltr"
          label={t('studio.camera')}
          value={shot.cameraId}
          options={CAMERAS.map((c) => ({ value: c.id, label: t(`cameras.${c.id}`) }))}
          onChange={(cameraId) => setOpenShot({ ...shot, cameraId })}
        />

        {scene && ctx.skins.length > 1 && (
          <fieldset className="flex flex-wrap gap-3">
            <legend className="mb-1 text-sm font-medium">{t('dialog.cast')}</legend>
            {castForScene(scene, ctx).map((castSkin, i) => (
              <label key={i} className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">{t('dialog.slot', { n: i + 1 })}</span>
                <select
                  value={castSkin.id}
                  onChange={(e) => setCastSlot(scene.id, i, e.target.value, scene.slots.length)}
                  className="rounded-md border border-edge bg-ink px-2 py-1"
                >
                  {ctx.skins.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </fieldset>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button disabled={busy} className={buttonPrimary} onClick={() => run(async () => downloadBlob(await renderExport(), filename), t('dialog.downloaded'))}>
            {t('dialog.download')}
          </button>
          {canCopyImage() && (
            <button disabled={busy} className={buttonSecondary} onClick={() => run(() => copyImage(renderExport()), t('dialog.copied'))}>
              {t('dialog.copy')}
            </button>
          )}
          {canShareFiles() && (
            <button disabled={busy} className={buttonSecondary} onClick={() => run(async () => shareImage(await renderExport(), filename), t('dialog.shared'))}>
              {t('dialog.share')}
            </button>
          )}
          <label className="ms-auto flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selected} onChange={() => toggleSelected(shot)} className="size-4 accent-grass" />
            {t('dialog.select')}
          </label>
        </div>
        <span role="status" className="min-h-5 text-sm text-slate-400">
          {busy ? t('dialog.rendering') : status}
        </span>
      </div>
    </dialog>
  );
}

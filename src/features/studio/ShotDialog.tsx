import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CAMERAS } from '../../data/cameras';
import { POSES } from '../../data/poses';
import { renderPose } from '../../render/renderPose';
import { shotKey, useStudio, type ShotId } from '../../store/studio';
import { buttonPrimary, buttonSecondary, Segmented } from '../../ui/controls';
import { canCopyImage, canShareFiles, copyImage, downloadBlob, exportFilename, shareImage } from '../export/exportImage';
import type { Skin } from '../skins/types';
import { useRenderUrl } from './useRenderUrl';

const PREVIEW_SIZE = 1024;

export function ShotDialog({ skin, shot }: { skin: Skin; shot: ShotId }) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const settings = useStudio((s) => s.settings);
  const exportSize = useStudio((s) => s.exportSize);
  const setOpenShot = useStudio((s) => s.setOpenShot);
  const toggleSelected = useStudio((s) => s.toggleSelected);
  const selected = useStudio((s) => s.selection.includes(shotKey(shot)));
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const poseIndex = POSES.findIndex((p) => p.id === shot.poseId);
  const pose = POSES[poseIndex];
  const camera = CAMERAS.find((c) => c.id === shot.cameraId)!;
  const filename = exportFilename(skin.name, pose.id, camera.id);
  const name = t(`poses.${pose.id}`);
  const { url, pending } = useRenderUrl({ skin, pose, camera, settings, size: PREVIEW_SIZE }, 0);

  useEffect(() => {
    const dialog = dialogRef.current!;
    if (!dialog.open) dialog.showModal();
    return () => dialog.close();
  }, []);

  useEffect(() => setStatus(null), [shot.poseId, shot.cameraId]);

  const go = (delta: number) => {
    const next = POSES[(poseIndex + delta + POSES.length) % POSES.length];
    setOpenShot({ poseId: next.id, cameraId: shot.cameraId });
  };

  const renderExport = () => renderPose({ skin, pose, camera, settings, size: exportSize });

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
        if (e.target instanceof HTMLInputElement) return;
        const rtl = document.documentElement.dir === 'rtl';
        if (e.key === 'ArrowRight') go(rtl ? -1 : 1);
        if (e.key === 'ArrowLeft') go(rtl ? 1 : -1);
      }}
      className="m-auto w-[min(92vw,720px)] rounded-xl border border-edge bg-panel p-0 text-slate-100 backdrop:bg-black/70"
    >
      <div className="flex items-center gap-2 border-b border-edge px-4 py-3">
        <h2 className="me-auto text-lg font-semibold">{name}</h2>
        <button onClick={() => dialogRef.current?.close()} className="rounded px-2 py-1 text-slate-400 hover:text-white" aria-label={t('dialog.close')}>
          ✕
        </button>
      </div>

      <div className="relative">
        <div className="checker flex aspect-square max-h-[60vh] w-full items-center justify-center p-6">
          {url && <img src={url} alt={name} className={`max-h-full max-w-full object-contain ${pending ? 'opacity-60' : ''}`} />}
        </div>
        <button onClick={() => go(-1)} aria-label={t('dialog.previous')} className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/80 px-3 py-2 text-xl hover:bg-ink">
          <span className="inline-block rtl:rotate-180">‹</span>
        </button>
        <button onClick={() => go(1)} aria-label={t('dialog.next')} className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/80 px-3 py-2 text-xl hover:bg-ink">
          <span className="inline-block rtl:rotate-180">›</span>
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <Segmented
          dir="ltr"
          label={t('studio.camera')}
          value={shot.cameraId}
          options={CAMERAS.map((c) => ({ value: c.id, label: t(`cameras.${c.id}`) }))}
          onChange={(cameraId) => setOpenShot({ poseId: shot.poseId, cameraId })}
        />
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

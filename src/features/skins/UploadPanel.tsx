import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useStudio } from '../../store/studio';
import { SkinSource } from './SkinSource';

export function UploadPanel() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-xl py-6 text-center sm:py-10">
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">{t('upload.title')}</h1>
      <p className="mb-8 text-slate-400">{t('upload.subtitle')}</p>
      <SkinSource />
    </div>
  );
}

export function AddSkinDialog() {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const setAddSkinOpen = useStudio((s) => s.setAddSkinOpen);

  useEffect(() => {
    const dialog = dialogRef.current!;
    if (!dialog.open) dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={t('upload.addTitle')}
      onClose={() => setAddSkinOpen(false)}
      onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
      className="m-auto w-[min(92vw,560px)] rounded-xl border border-edge bg-ink p-0 text-slate-100 backdrop:bg-black/70"
    >
      <div className="flex items-center border-b border-edge px-4 py-3">
        <h2 className="me-auto text-lg font-semibold">{t('upload.addTitle')}</h2>
        <button onClick={() => dialogRef.current?.close()} className="rounded px-2 py-1 text-slate-400 hover:text-white" aria-label={t('dialog.close')}>
          ✕
        </button>
      </div>
      <div className="p-4">
        <SkinSource />
      </div>
    </dialog>
  );
}

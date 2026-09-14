import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStudio } from '../../store/studio';
import { buttonPrimary, buttonSecondary, SkinHead } from '../../ui/controls';
import { loadSkinFromBlob, SkinLoadError } from './loadSkin';
import { listRecentSkins, removeRecentSkin } from './recentSkins';
import { createSampleSkinBlob } from './sampleSkin';
import type { Skin } from './types';
import { MAX_SKIN_SIZE } from './validation';

export function UploadPanel() {
  const { t } = useTranslation();
  const setSkin = useStudio((s) => s.setSkin);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [recent, setRecent] = useState<Skin[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void listRecentSkins().then((skins) => !cancelled && setRecent(skins));
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(
    async (blob: Blob, name: string) => {
      setError(null);
      try {
        setSkin(await loadSkinFromBlob(blob, name));
      } catch (e) {
        setError(e instanceof SkinLoadError ? t(`errors.${e.code}`, { max: MAX_SKIN_SIZE }) : t('errors.unknown'));
      }
    },
    [setSkin, t],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (file) void load(file, file.name || 'pasted-skin.png');
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [load]);

  return (
    <div className="mx-auto max-w-xl py-6 text-center sm:py-10">
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">{t('upload.title')}</h1>
      <p className="mb-8 text-slate-400">{t('upload.subtitle')}</p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void load(file, file.name);
        }}
        className={`rounded-xl border-2 border-dashed p-6 transition-colors sm:p-10 ${
          dragging ? 'border-grass bg-grass/10' : 'border-edge bg-panel'
        }`}
      >
        <p className="mb-4 text-lg">{t('upload.drop')}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => inputRef.current?.click()} className={buttonPrimary}>
            {t('upload.choose')}
          </button>
          <button onClick={async () => load(await createSampleSkinBlob(), 'explorer.png')} className={buttonSecondary}>
            {t('upload.sample')}
          </button>
        </div>
        <p className="mt-4 hidden text-xs text-slate-500 sm:block">{t('upload.paste')}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png"
          className="hidden"
          data-testid="skin-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void load(file, file.name);
            e.target.value = '';
          }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-red-900 bg-red-950/50 p-3 text-red-200">
          {error}
        </p>
      )}

      {recent.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-slate-400">{t('upload.recent')}</h2>
          <ul className="flex flex-wrap justify-center gap-3">
            {recent.map((skin) => (
              <li key={skin.id} className="group relative">
                <button
                  onClick={() => setSkin({ ...skin, lastUsedAt: Date.now() })}
                  className="flex w-20 flex-col items-center gap-1 rounded-lg border border-edge bg-panel p-2 hover:border-grass"
                >
                  <SkinHead skin={skin} className="size-12 rounded-sm" />
                  <span className="w-full truncate text-xs">{skin.name}</span>
                </button>
                <button
                  onClick={async () => {
                    await removeRecentSkin(skin.id);
                    setRecent((r) => r.filter((s) => s.id !== skin.id));
                  }}
                  aria-label={t('upload.remove', { name: skin.name })}
                  className="absolute -inset-e-2 -top-2 hidden size-6 items-center justify-center rounded-full border border-edge bg-ink text-xs text-slate-300 group-hover:flex focus:flex hover:text-white [@media(hover:none)]:flex"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

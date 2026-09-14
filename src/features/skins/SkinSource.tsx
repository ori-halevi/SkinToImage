import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStudio } from '../../store/studio';
import { buttonPrimary, buttonSecondary, SkinHead } from '../../ui/controls';
import { loadSkinFromBlob, SkinLoadError } from './loadSkin';
import { listRecentSkins, removeRecentSkin } from './recentSkins';
import { createSampleSkinBlob } from './sampleSkin';
import type { Skin } from './types';
import { fetchSkinByUsername, UsernameSkinError } from './usernameSkin';
import { MAX_SKIN_SIZE } from './validation';

/** Every way to bring in a skin: file, drag & drop, paste, username, sample, recent. */
export function SkinSource() {
  const { t } = useTranslation();
  const addSkin = useStudio((s) => s.addSkin);
  const activeIds = useStudio((s) => s.skins.map((k) => k.id).join(','));
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [recent, setRecent] = useState<Skin[]>([]);
  const [username, setUsername] = useState('');
  const [loadingUser, setLoadingUser] = useState(false);
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
        addSkin(await loadSkinFromBlob(blob, name));
      } catch (e) {
        setError(e instanceof SkinLoadError ? t(`errors.${e.code}`, { max: MAX_SKIN_SIZE }) : t('errors.unknown'));
      }
    },
    [addSkin, t],
  );

  const loadUsername = async () => {
    setError(null);
    setLoadingUser(true);
    try {
      const remote = await fetchSkinByUsername(username);
      addSkin(await loadSkinFromBlob(remote.blob, `${remote.username}.png`, { model: remote.model, upgradeLegacy: true }));
    } catch (e) {
      if (e instanceof UsernameSkinError) setError(t(`errors.${e.code}`));
      else if (e instanceof SkinLoadError) setError(t(`errors.${e.code}`, { max: MAX_SKIN_SIZE }));
      else setError(t('errors.unknown'));
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (file) void load(file, file.name || 'pasted-skin.png');
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [load]);

  const recentToShow = recent.filter((s) => !activeIds.split(',').includes(s.id));

  return (
    <div className="flex flex-col gap-5">
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
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
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

      <form
        className="flex flex-col gap-1 text-start"
        onSubmit={(e) => {
          e.preventDefault();
          void loadUsername();
        }}
      >
        <label htmlFor="username" className="text-sm font-medium">
          {t('upload.username')}
        </label>
        <div className="flex gap-2">
          <input
            id="username"
            dir="ltr"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Notch"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-md border border-edge bg-ink px-3 py-2"
          />
          <button type="submit" disabled={loadingUser || !username.trim()} className={buttonSecondary}>
            {loadingUser ? t('upload.loading') : t('upload.loadUsername')}
          </button>
        </div>
        <p className="text-xs text-slate-500">{t('upload.usernameNote')}</p>
      </form>

      {error && (
        <p role="alert" className="rounded-md border border-red-900 bg-red-950/50 p-3 text-red-200">
          {error}
        </p>
      )}

      {recentToShow.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-slate-400">{t('upload.recent')}</h2>
          <ul className="flex flex-wrap justify-center gap-3">
            {recentToShow.map((skin) => (
              <li key={skin.id} className="group relative">
                <button
                  onClick={() => addSkin({ ...skin, lastUsedAt: Date.now() })}
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

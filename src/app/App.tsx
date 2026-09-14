import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, setLanguage, type LanguageCode } from '../i18n';
import { isWebGL2Supported } from '../render/renderer';
import { useActiveSkin, useStudio } from '../store/studio';
import { UploadPanel } from '../features/skins/UploadPanel';
import { Studio } from '../features/studio/Studio';
import { navigate, useRoute } from './route';
import { UpdatePrompt } from './UpdatePrompt';

// The editor (and its canvas library) loads only when opened.
const ComposerPage = lazy(() => import('../features/composer/ComposerPage'));

export default function App() {
  const { t, i18n } = useTranslation();
  const skin = useActiveSkin();
  const clearSkins = useStudio((s) => s.clearSkins);
  const [webgl] = useState(isWebGL2Supported);
  const route = useRoute();

  useEffect(() => {
    const prevent = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-edge px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button className="text-lg font-bold tracking-tight" onClick={() => (route === 'editor' ? navigate('studio') : clearSkins())} dir="ltr">
              <span className="text-grass">■</span> SkinToImage
            </button>
            <nav aria-label={t('nav.label')} className="flex rounded-lg border border-edge p-0.5">
              {(['studio', 'editor'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => navigate(r)}
                  aria-current={route === r ? 'page' : undefined}
                  className={`rounded-md px-3 py-1 text-sm font-semibold transition-colors ${route === r ? 'bg-edge text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {t(`nav.${r}`)}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-slate-400 sm:inline">{t('app.privacy')}</span>
            <select
              aria-label={t('app.language')}
              value={i18n.resolvedLanguage}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="rounded-md border border-edge bg-panel px-2 py-1 text-sm"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {!webgl ? (
          <p role="alert" className="rounded-lg border border-red-900 bg-red-950/50 p-4 text-red-200">
            {t('errors.webgl')}
          </p>
        ) : route === 'editor' ? (
          <Suspense fallback={<p className="py-10 text-center text-slate-400">{t('dialog.rendering')}</p>}>
            <ComposerPage />
          </Suspense>
        ) : skin ? (
          <Studio skin={skin} />
        ) : (
          <UploadPanel />
        )}
      </main>

      <footer className="border-t border-edge px-4 py-3 text-center text-xs text-slate-500">{t('app.disclaimer')}</footer>
      <UpdatePrompt />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { registerSW } from 'virtual:pwa-register';
import { buttonPrimary, buttonSecondary } from '../ui/controls';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Registers the service worker, checks for new deploys (on focus and every 30 minutes) and, once a
 * new version has taken over, offers a reload. It never reloads on its own: that would discard the
 * skins loaded in this session.
 */
export function UpdatePrompt() {
  const { t } = useTranslation();
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // Only a *replacement* counts as an update; the very first install also fires controllerchange.
    const hadController = !!navigator.serviceWorker.controller;
    const onControllerChange = () => hadController && setUpdated(true);
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    let registration: ServiceWorkerRegistration | undefined;
    const check = () => void registration?.update().catch(() => undefined);
    const onVisible = () => document.visibilityState === 'visible' && check();

    registerSW({
      immediate: true,
      onNeedRefresh: () => setUpdated(true),
      onRegisteredSW: (_url, reg) => {
        registration = reg;
      },
    });
    const timer = setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, []);

  if (!updated) return null;
  return (
    <div role="status" className="fade-in fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-lg border border-edge bg-panel p-3 shadow-lg">
      <span className="me-auto text-sm">{t('app.updateReady')}</span>
      <button onClick={() => setUpdated(false)} className={`${buttonSecondary} py-1 text-sm`}>
        {t('app.updateLater')}
      </button>
      <button onClick={() => window.location.reload()} className={`${buttonPrimary} py-1 text-sm`}>
        {t('app.updateNow')}
      </button>
    </div>
  );
}

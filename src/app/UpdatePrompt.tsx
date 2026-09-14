import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { registerSW } from 'virtual:pwa-register';
import { buttonPrimary, buttonSecondary } from '../ui/controls';

/**
 * Registers the service worker and, when a new deploy is available, offers to reload.
 * Reloading on its own would discard the skins loaded in this session.
 */
export function UpdatePrompt() {
  const { t } = useTranslation();
  const [needRefresh, setNeedRefresh] = useState(false);
  const update = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    update.current = registerSW({ immediate: true, onNeedRefresh: () => setNeedRefresh(true) });
  }, []);

  if (!needRefresh) return null;
  return (
    <div role="status" className="fade-in fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-lg border border-edge bg-panel p-3 shadow-lg">
      <span className="me-auto text-sm">{t('app.updateReady')}</span>
      <button onClick={() => setNeedRefresh(false)} className={`${buttonSecondary} py-1 text-sm`}>
        {t('app.updateLater')}
      </button>
      <button onClick={() => void update.current?.(true)} className={`${buttonPrimary} py-1 text-sm`}>
        {t('app.updateNow')}
      </button>
    </div>
  );
}

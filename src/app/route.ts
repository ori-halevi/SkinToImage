import { useSyncExternalStore } from 'react';

export type Route = 'studio' | 'editor';

const read = (): Route => (window.location.hash === '#editor' ? 'editor' : 'studio');

/** Tiny hash router: `#editor` opens the thumbnail editor, anything else the generator. */
export function useRoute(): Route {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('hashchange', onChange);
      return () => window.removeEventListener('hashchange', onChange);
    },
    read,
  );
}

export function navigate(route: Route): void {
  if (read() === route) return;
  if (route === 'editor') window.location.hash = 'editor';
  else history.pushState(null, '', window.location.pathname + window.location.search);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

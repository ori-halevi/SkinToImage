import { useEffect, useRef, useState } from 'react';
import { renderKey, renderShotUrl, type ShotSpec } from '../../render/renderShot';
import { isAbortError } from '../../render/renderer';

/**
 * Renders a request into a (cached) object URL. Keeps showing the previous image while a new one
 * renders, debounces rapid changes (e.g. slider drags) and cancels renders that are no longer needed.
 */
export function useRenderUrl(request: ShotSpec | null, debounceMs = 150) {
  const [url, setUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(true);
  const [failed, setFailed] = useState(false);
  const requestRef = useRef(request);
  requestRef.current = request;
  const key = request ? renderKey(request) : '';

  useEffect(() => {
    if (!requestRef.current) return;
    const controller = new AbortController();
    setPending(true);
    const timer = setTimeout(async () => {
      try {
        const next = await renderShotUrl({ ...requestRef.current!, signal: controller.signal });
        if (controller.signal.aborted) return;
        setUrl(next);
        setFailed(false);
        setPending(false);
      } catch (e) {
        if (isAbortError(e)) return;
        console.error(e);
        setFailed(true);
        setPending(false);
      }
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, debounceMs]);

  return { url, pending, failed };
}

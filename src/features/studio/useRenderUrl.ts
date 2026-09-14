import { useEffect, useRef, useState } from 'react';
import { renderKey, renderPoseUrl, type RenderRequest } from '../../render/renderPose';
import { isAbortError } from '../../render/renderer';

/**
 * Renders a request into a (cached) object URL. Keeps showing the previous image while a new one
 * renders, debounces rapid changes (e.g. slider drags) and cancels renders that are no longer needed.
 */
export function useRenderUrl(request: Omit<RenderRequest, 'signal'>, debounceMs = 150) {
  const [url, setUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(true);
  const [failed, setFailed] = useState(false);
  const requestRef = useRef(request);
  requestRef.current = request;
  const key = renderKey(request);

  useEffect(() => {
    const controller = new AbortController();
    setPending(true);
    const timer = setTimeout(async () => {
      try {
        const next = await renderPoseUrl({ ...requestRef.current, signal: controller.signal });
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

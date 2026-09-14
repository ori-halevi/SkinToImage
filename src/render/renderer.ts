import { WebGLRenderer } from 'three';

let renderer: WebGLRenderer | null = null;

/**
 * The single offscreen WebGL renderer used for all image output.
 * Browsers cap the number of live WebGL contexts (~16), so never create one per image.
 * (The interactive 3D preview owns one more context.)
 */
export function getRenderer(): WebGLRenderer {
  if (!renderer) {
    renderer = new WebGLRenderer({
      canvas: document.createElement('canvas'),
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(1);
  }
  return renderer;
}

export function isWebGL2Supported(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

export function abortError(): DOMException {
  return new DOMException('Render aborted', 'AbortError');
}

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Runs render jobs one at a time, since they all share the same renderer.
 * Jobs whose signal is aborted before they start are skipped with an AbortError.
 * Each job yields to the browser first so the UI stays responsive during long batches.
 */
export function enqueueRender<T>(job: () => Promise<T> | T, signal?: AbortSignal): Promise<T> {
  const result = queue.then(async () => {
    if (signal?.aborted) throw abortError();
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (signal?.aborted) throw abortError();
    return job();
  });
  queue = result.catch(() => undefined);
  return result;
}

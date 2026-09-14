import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { distinctSkins, swapLayerCast } from '../rerender';
import { useComposer } from '../store';
import type { Layer } from '../types';

export function LayersPanel() {
  const { t } = useTranslation();
  const layers = useComposer((s) => s.project?.layers ?? []);
  const selectedId = useComposer((s) => s.selectedId);
  const { select, reorderLayer, removeLayer } = useComposer.getState();
  const [swapping, setSwapping] = useState<string | null>(null);

  const label = (layer: Layer) => (layer.type === 'text' ? `“${layer.text.split('\n')[0] || '…'}”` : layer.label);

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-edge bg-panel p-4">
      <h2 className="font-semibold">{t('composer.layers')}</h2>
      {layers.length === 0 && <p className="text-sm text-slate-400">{t('composer.noLayers')}</p>}
      {/* Top of the list = front-most layer. */}
      <ul className="flex flex-col gap-1">
        {[...layers].reverse().map((layer, i) => (
          <li
            key={layer.id}
            className={`flex items-center gap-1 rounded-md border px-2 py-1 text-sm transition-colors ${
              layer.id === selectedId ? 'border-grass bg-grass/10' : 'border-edge'
            }`}
          >
            <button onClick={() => select(layer.id)} className="flex min-w-0 flex-1 items-center gap-2 text-start">
              <span aria-hidden className="text-slate-400">
                {layer.type === 'text' ? 'T' : '▣'}
              </span>
              <span className="truncate">{label(layer)}</span>
            </button>
            {layer.type === 'image' && layer.source && distinctSkins(layer) > 1 && (
              <button
                onClick={async () => {
                  setSwapping(layer.id);
                  try {
                    await swapLayerCast(layer);
                  } catch {
                    select(layer.id); // the properties panel explains what's missing
                  } finally {
                    setSwapping(null);
                  }
                }}
                disabled={swapping === layer.id}
                aria-label={t('composer.swapNamed', { name: label(layer) })}
                title={t('dialog.swap')}
                className="rounded px-1.5 text-slate-300 hover:text-white disabled:animate-pulse"
              >
                ⇄
              </button>
            )}
            <button
              onClick={() => reorderLayer(layer.id, 'up')}
              disabled={i === 0}
              aria-label={t('composer.moveUp', { name: label(layer) })}
              className="rounded px-1.5 text-slate-400 hover:text-white disabled:opacity-30"
            >
              ▲
            </button>
            <button
              onClick={() => reorderLayer(layer.id, 'down')}
              disabled={i === layers.length - 1}
              aria-label={t('composer.moveDown', { name: label(layer) })}
              className="rounded px-1.5 text-slate-400 hover:text-white disabled:opacity-30"
            >
              ▼
            </button>
            <button onClick={() => removeLayer(layer.id)} aria-label={t('composer.deleteNamed', { name: label(layer) })} className="rounded px-1.5 text-slate-400 hover:text-red-300">
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

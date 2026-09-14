import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buttonSecondary, ColorInput, Field, Segmented, Slider, Toggle } from '../../../ui/controls';
import { FONT_IDS, FONTS } from '../fonts';
import { useComposer } from '../store';
import type { ImageLayer, Layer, TextLayer } from '../types';
import { MissingSkinsError, rerenderLayer } from '../rerender';
import { swapCast } from '../../studio/shots';
import { useStudio } from '../../../store/studio';
import { getRecentSkin } from '../../skins/recentSkins';

export function PropertiesPanel() {
  const { t } = useTranslation();
  const layer = useComposer((s) => s.project?.layers.find((l) => l.id === s.selectedId) ?? null);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-edge bg-panel p-4">
      <h2 className="font-semibold">{t('composer.properties')}</h2>
      {layer ? <LayerProperties layer={layer} /> : <p className="text-sm text-slate-400">{t('composer.nothingSelected')}</p>}
    </section>
  );
}

function LayerProperties({ layer }: { layer: Layer }) {
  const { t } = useTranslation();
  const { updateLayer, duplicateLayer, removeLayer, reorderLayer } = useComposer.getState();

  return (
    <>
      {layer.type === 'text' && <TextProperties layer={layer} />}
      {layer.type === 'image' && layer.source && <CharacterProperties key={layer.id} layer={layer} />}

      <Slider
        label={t('composer.opacity')}
        value={Math.round(layer.opacity * 100)}
        min={10}
        max={100}
        onChange={(v) => updateLayer(layer.id, { opacity: v / 100 }, 'opacity')}
        onReset={layer.opacity !== 1 ? () => updateLayer(layer.id, { opacity: 1 }) : undefined}
      />
      <Slider
        label={t('composer.rotation')}
        value={Math.round(layer.rotation)}
        min={-180}
        max={180}
        onChange={(rotation) => updateLayer(layer.id, { rotation }, 'rotation')}
        onReset={layer.rotation !== 0 ? () => updateLayer(layer.id, { rotation: 0 }) : undefined}
      />

      <div className="grid grid-cols-2 gap-2 text-sm">
        <button onClick={() => updateLayer(layer.id, { scaleX: -layer.scaleX })} className={`${buttonSecondary} px-2 py-1`}>
          ⇋ {t('composer.flip')}
        </button>
        <button onClick={() => duplicateLayer(layer.id)} className={`${buttonSecondary} px-2 py-1`}>
          {t('composer.duplicate')}
        </button>
        <button onClick={() => reorderLayer(layer.id, 'top')} className={`${buttonSecondary} px-2 py-1`}>
          {t('composer.toFront')}
        </button>
        <button onClick={() => reorderLayer(layer.id, 'bottom')} className={`${buttonSecondary} px-2 py-1`}>
          {t('composer.toBack')}
        </button>
      </div>
      <button onClick={() => removeLayer(layer.id)} className="rounded-md border border-red-900 px-3 py-1 text-sm text-red-300 transition-colors hover:bg-red-950/60">
        {t('composer.delete')}
      </button>
    </>
  );
}

function TextProperties({ layer }: { layer: TextLayer }) {
  const { t } = useTranslation();
  const updateLayer = useComposer.getState().updateLayer;
  const set = (patch: Partial<TextLayer>, tag?: string) => updateLayer(layer.id, patch, tag);
  const textId = useId();

  return (
    <>
      <div className="flex flex-col gap-1 text-sm">
        <label htmlFor={textId} className="font-medium">
          {t('composer.text')}
        </label>
        <textarea
          id={textId}
          value={layer.text}
          rows={2}
          dir="auto"
          onChange={(e) => set({ text: e.target.value }, 'text')}
          className="resize-y rounded-md border border-edge bg-ink px-2 py-1"
        />
      </div>
      <Field label={t('composer.font')}>
        <div className="grid grid-cols-3 gap-1">
          {FONT_IDS.map((id) => (
            <button
              key={id}
              onClick={() => set({ font: id })}
              aria-pressed={layer.font === id}
              style={{ fontFamily: FONTS[id].family, fontWeight: FONTS[id].weight }}
              className={`rounded-md border px-1 py-1.5 text-base transition-colors ${layer.font === id ? 'border-grass bg-grass/15' : 'border-edge hover:border-slate-500'}`}
            >
              {t(`composer.fonts.${id}`)}
            </button>
          ))}
        </div>
      </Field>
      <Slider label={t('composer.fontSize')} value={Math.round(layer.fontSize)} min={12} max={400} onChange={(fontSize) => set({ fontSize }, 'fontSize')} />
      <ColorInput label={t('composer.fill')} value={layer.fill} onChange={(fill) => set({ fill }, 'fill')} />
      <ColorInput label={t('composer.stroke')} value={layer.stroke} onChange={(stroke) => set({ stroke }, 'stroke')} />
      <Slider label={t('composer.strokeWidth')} value={Math.round(layer.strokeWidth)} min={0} max={60} onChange={(strokeWidth) => set({ strokeWidth }, 'strokeWidth')} />
      <Toggle label={t('composer.shadow')} checked={layer.shadow} onChange={(shadow) => set({ shadow })} />
      <Field label={t('composer.align')}>
        <Segmented
          dir="ltr"
          label={t('composer.align')}
          value={layer.align}
          options={[
            { value: 'left', label: '⯇' },
            { value: 'center', label: '≡' },
            { value: 'right', label: '⯈' },
          ]}
          onChange={(align) => set({ align })}
        />
      </Field>
    </>
  );
}

/** Swap characters / black out individual characters of an image added from the gallery. */
function CharacterProperties({ layer }: { layer: ImageLayer }) {
  const { t } = useTranslation();
  const cast = layer.source!.cast;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const names = useSkinNames(cast.map((c) => c.skinId));
  const distinct = new Set(cast.map((c) => c.skinId)).size;

  const apply = async (next: typeof cast) => {
    setBusy(true);
    setError(null);
    try {
      await rerenderLayer(layer, next);
    } catch (e) {
      setError(e instanceof MissingSkinsError ? t('composer.skinsMissing') : t('errors.render'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 border-b border-edge pb-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{t('dialog.cast')}</span>
        <span className="ms-auto" />
        {distinct > 1 && (
          <button
            disabled={busy}
            onClick={() => void apply(swapCast(cast, (c) => c.skinId, (_, next) => ({ skinId: next.skinId, silhouette: next.silhouette })))}
            className={`${buttonSecondary} px-2 py-0.5 text-xs`}
          >
            <span aria-hidden>⇄</span> {t('dialog.swap')}
          </button>
        )}
      </div>
      <ul className="flex flex-col gap-1">
        {cast.map((member, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">{cast.length > 1 ? t('dialog.slot', { n: i + 1 }) : t('studio.character')}</span>
            <span className="min-w-0 flex-1 truncate">{names[member.skinId] ?? '…'}</span>
            <button
              type="button"
              disabled={busy}
              aria-pressed={member.silhouette}
              aria-label={t('dialog.silhouetteFor', { name: names[member.skinId] ?? '' })}
              title={t('studio.silhouette')}
              onClick={() => void apply(cast.map((c, j) => (j === i ? { ...c, silhouette: !c.silhouette } : c)))}
              className={`inline-flex size-7 items-center justify-center rounded-md border transition-colors ${
                member.silhouette ? 'border-slate-300 bg-black text-white' : 'border-edge text-slate-500 hover:text-white'
              }`}
            >
              <span aria-hidden className="text-xs">👤</span>
            </button>
          </li>
        ))}
      </ul>
      {busy && <p className="text-xs text-slate-400">{t('dialog.rendering')}</p>}
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

/** Skin names by id, from loaded skins or recent skins. */
function useSkinNames(ids: string[]): Record<string, string> {
  const loaded = useStudio((s) => s.skins);
  const [names, setNames] = useState<Record<string, string>>({});
  const key = ids.join(',');
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result: Record<string, string> = {};
      for (const id of new Set(key.split(','))) {
        const skin = loaded.find((s) => s.id === id) ?? (await getRecentSkin(id));
        if (skin) result[id] = skin.name;
        if (skin && !loaded.includes(skin)) skin.bitmap.close();
      }
      if (!cancelled) setNames(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [key, loaded]);
  return names;
}

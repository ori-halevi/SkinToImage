import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CAMERAS } from '../../data/cameras';
import { EXPORT_SIZES, useStudio, type ExportSize } from '../../store/studio';
import { Field, Segmented } from '../../ui/controls';
import { useMediaQuery } from '../../ui/useMediaQuery';
import { sanitizeName } from '../skins/loadSkin';
import type { Skin } from '../skins/types';
import { LivePreview } from './LivePreview';

export function Sidebar({ skin }: { skin: Skin }) {
  const { t } = useTranslation();
  const { settings, cameraId, exportSize, setSkin, updateSkin, updateSettings, setCamera, setExportSize } = useStudio();
  const [nameDraft, setNameDraft] = useState(skin.name);
  const [mobileOpen, setMobileOpen] = useState(false);

  const commitName = () => {
    const name = sanitizeName(nameDraft) || skin.name;
    setNameDraft(name);
    if (name !== skin.name) updateSkin({ name });
  };

  return (
    <aside className="flex flex-col gap-5 rounded-xl border border-edge bg-panel p-4 md:sticky md:top-4 md:self-start">
      <div className="flex items-center gap-3">
        <div className="w-24 shrink-0 md:hidden">
          <LivePreviewSlot skin={skin} desktop={false} />
        </div>
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs text-slate-400" htmlFor="skin-name">
            {t('studio.skinName')}
          </label>
          <input
            id="skin-name"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="w-full rounded-md border border-edge bg-ink px-2 py-1"
          />
          <button onClick={() => setSkin(null)} className="mt-1 text-xs text-slate-400 underline hover:text-white">
            {t('studio.change')}
          </button>
        </div>
      </div>

      <div className="hidden md:block">
        <LivePreviewSlot skin={skin} desktop />
      </div>

      <button
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        className="flex items-center justify-between rounded-md border border-edge px-3 py-2 text-sm md:hidden"
      >
        {t('studio.settings')}
        <span className={`transition-transform ${mobileOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>

      <div className={`${mobileOpen ? 'flex' : 'hidden'} flex-col gap-5 md:flex`}>
        <Field label={t('studio.camera')}>
          <Segmented
            dir="ltr"
            label={t('studio.camera')}
            value={cameraId}
            options={CAMERAS.map((c) => ({ value: c.id, label: t(`cameras.${c.id}`) }))}
            onChange={setCamera}
          />
        </Field>

        <Field label={t('studio.armModel')} hint={t('studio.detected', { model: t(`studio.${skin.detectedModel}`) })}>
          <Segmented
            label={t('studio.armModel')}
            value={skin.model}
            options={[
              { value: 'classic', label: t('studio.classic') },
              { value: 'slim', label: t('studio.slim') },
            ]}
            onChange={(model) => updateSkin({ model })}
          />
        </Field>

        <Field label={t('studio.lighting')}>
          <Segmented
            label={t('studio.lighting')}
            value={settings.lighting}
            options={[
              { value: 'shaded', label: t('studio.shaded') },
              { value: 'flat', label: t('studio.flat') },
            ]}
            onChange={(lighting) => updateSettings({ lighting })}
          />
        </Field>

        <Field label={<label htmlFor="head-size">{t('studio.headSize', { value: settings.bigHead.toFixed(1) })}</label>}>
          <input
            id="head-size"
            type="range"
            min={1}
            max={2}
            step={0.1}
            value={settings.bigHead}
            onChange={(e) => updateSettings({ bigHead: Number(e.target.value) })}
            className="w-full accent-grass"
          />
        </Field>

        <Field label={t('studio.outline')}>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.outline.enabled}
              onChange={(e) => updateSettings({ outline: { ...settings.outline, enabled: e.target.checked } })}
              className="size-4 accent-grass"
              aria-label={t('studio.outlineEnable')}
            />
            <input
              type="range"
              min={2}
              max={40}
              value={settings.outline.width}
              disabled={!settings.outline.enabled}
              onChange={(e) => updateSettings({ outline: { ...settings.outline, width: Number(e.target.value) } })}
              className="min-w-0 flex-1 accent-grass disabled:opacity-40"
              aria-label={t('studio.outlineWidth')}
            />
            <input
              type="color"
              value={settings.outline.color}
              disabled={!settings.outline.enabled}
              onChange={(e) => updateSettings({ outline: { ...settings.outline, color: e.target.value } })}
              className="h-8 w-10 cursor-pointer rounded border border-edge bg-transparent disabled:opacity-40"
              aria-label={t('studio.outlineColor')}
            />
          </div>
        </Field>

        <Field label={t('studio.exportSize')}>
          <Segmented
            dir="ltr"
            label={t('studio.exportSize')}
            value={String(exportSize)}
            options={EXPORT_SIZES.map((s) => ({ value: String(s), label: `${s}px` }))}
            onChange={(v) => setExportSize(Number(v) as ExportSize)}
          />
        </Field>
      </div>
    </aside>
  );
}

/** Mounts the 3D preview only once, in whichever slot is visible, to avoid a second WebGL context. */
function LivePreviewSlot({ skin, desktop }: { skin: Skin; desktop: boolean }) {
  const settings = useStudio((s) => s.settings);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  if (isDesktop !== desktop) return null;
  return <LivePreview skin={skin} lighting={settings.lighting} bigHead={settings.bigHead} />;
}

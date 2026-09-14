import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CAMERAS } from '../../data/cameras';
import { FRAME_IDS, registerBackgroundImage, type Background } from '../../render/postprocess/frame';
import { ITEM_IDS } from '../../render/props/items';
import { GROUND_IDS } from '../../render/renderShot';
import { EXPORT_SIZES, MAX_ACTIVE_SKINS, useStudio, type ExportSize } from '../../store/studio';
import { buttonSecondary, Chips, ColorInput, Field, Section, Segmented, Select, SkinHead, Slider, Toggle } from '../../ui/controls';
import { useMediaQuery } from '../../ui/useMediaQuery';
import { sanitizeName } from '../skins/loadSkin';
import type { Skin } from '../skins/types';
import { LivePreview } from './LivePreview';

const BACKGROUND_DEFAULTS: Record<Exclude<Background['type'], 'image'>, Background> = {
  transparent: { type: 'transparent' },
  color: { type: 'color', color: '#3a86ff' },
  gradient: { type: 'gradient', from: '#ff006e', to: '#3a0ca3' },
  sunburst: { type: 'sunburst', color: '#ff8c00', rays: '#ffb703' },
};

export function Sidebar({ skin }: { skin: Skin }) {
  const { t } = useTranslation();
  const settings = useStudio((s) => s.settings);
  const updateSettings = useStudio((s) => s.updateSettings);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <aside className="flex flex-col gap-4 rounded-xl border border-edge bg-panel p-4 md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:self-start md:overflow-y-auto">
      <SkinsBar activeSkin={skin} />

      <div className="flex items-start gap-3">
        <div className="w-24 shrink-0 md:hidden">
          <LivePreviewSlot skin={skin} desktop={false} />
        </div>
        <div className="min-w-0 flex-1 md:hidden">
          <SkinNameField key={skin.id} skin={skin} />
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

      <div className={`${mobileOpen ? 'flex' : 'hidden'} flex-col gap-3 md:flex`}>
        <Section title={t('studio.character')} defaultOpen>
          <div className="hidden md:block">
            <SkinNameField key={skin.id} skin={skin} />
          </div>
          <SkinModelFields skin={skin} />
          <Select
            label={t('studio.heldItem')}
            value={settings.heldItem}
            options={(['none', ...ITEM_IDS] as const).map((id) => ({ value: id, label: t(`items.${id}`) }))}
            onChange={(heldItem) => updateSettings({ heldItem })}
          />
          <Slider
            label={t('studio.headSize', { value: settings.bigHead.toFixed(1) })}
            value={settings.bigHead}
            min={1}
            max={2}
            step={0.1}
            onChange={(bigHead) => updateSettings({ bigHead })}
          />
        </Section>

        <Section title={t('studio.camera')} defaultOpen>
          <CameraChips />
          <Toggle label={t('studio.mirror')} checked={settings.mirror} onChange={(mirror) => updateSettings({ mirror })} />
        </Section>

        <Section title={t('studio.effects')}>
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
          <OutlineFields />
          <Toggle label={t('studio.shadow')} checked={settings.shadow.enabled} onChange={(enabled) => updateSettings({ shadow: { ...settings.shadow, enabled } })} />
          {settings.shadow.enabled && (
            <>
              <Slider label={t('studio.shadowOpacity')} value={settings.shadow.opacity} min={0.1} max={1} step={0.05} onChange={(opacity) => updateSettings({ shadow: { ...settings.shadow, opacity } })} />
              <Slider label={t('studio.shadowBlur')} value={settings.shadow.blur} min={0} max={80} onChange={(blur) => updateSettings({ shadow: { ...settings.shadow, blur } })} />
              <Slider label={t('studio.shadowDistance')} value={settings.shadow.distance} min={0} max={80} onChange={(distance) => updateSettings({ shadow: { ...settings.shadow, distance } })} />
            </>
          )}
          <Toggle label={t('studio.glow')} checked={settings.glow.enabled} onChange={(enabled) => updateSettings({ glow: { ...settings.glow, enabled } })} />
          {settings.glow.enabled && (
            <>
              <ColorInput label={t('studio.glowColor')} value={settings.glow.color} onChange={(color) => updateSettings({ glow: { ...settings.glow, color } })} />
              <Slider label={t('studio.glowSize')} value={settings.glow.size} min={8} max={120} onChange={(size) => updateSettings({ glow: { ...settings.glow, size } })} />
            </>
          )}
        </Section>

        <Section title={t('studio.backgroundSection')}>
          <Select
            label={t('studio.ground')}
            value={settings.ground}
            options={GROUND_IDS.map((id) => ({ value: id, label: t(`grounds.${id}`) }))}
            onChange={(ground) => updateSettings({ ground })}
          />
          <BackgroundFields />
          <Field label={t('studio.frame')}>
            <Segmented
              dir="ltr"
              label={t('studio.frame')}
              value={settings.frame}
              options={FRAME_IDS.map((id) => ({ value: id, label: t(`frames.${id}`) }))}
              onChange={(frame) => updateSettings({ frame })}
            />
          </Field>
        </Section>

        <Section title={t('studio.export')}>
          <ExportFields />
        </Section>
      </div>
    </aside>
  );
}

function SkinsBar({ activeSkin }: { activeSkin: Skin }) {
  const { t } = useTranslation();
  const skins = useStudio((s) => s.skins);
  const setActiveSkin = useStudio((s) => s.setActiveSkin);
  const removeSkin = useStudio((s) => s.removeSkin);
  const setAddSkinOpen = useStudio((s) => s.setAddSkinOpen);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-semibold">{t('studio.skins')}</span>
        <span className="text-xs text-slate-500">{t('studio.maxSkins', { max: MAX_ACTIVE_SKINS })}</span>
      </div>
      <ul className="flex flex-wrap gap-2">
        {skins.map((skin) => (
          <li key={skin.id} className="group relative">
            <button
              onClick={() => setActiveSkin(skin.id)}
              aria-pressed={skin.id === activeSkin.id}
              aria-label={t('studio.activeSkin', { name: skin.name })}
              title={skin.name}
              className={`block rounded-md border-2 p-1 ${skin.id === activeSkin.id ? 'border-grass' : 'border-edge hover:border-slate-500'}`}
            >
              <SkinHead skin={skin} className="size-9" />
            </button>
            <button
              onClick={() => removeSkin(skin.id)}
              aria-label={t('studio.removeSkin', { name: skin.name })}
              className="absolute -inset-e-1.5 -top-1.5 hidden size-5 items-center justify-center rounded-full border border-edge bg-ink text-[10px] text-slate-300 group-hover:flex focus:flex hover:text-white [@media(hover:none)]:flex"
            >
              ✕
            </button>
          </li>
        ))}
        {skins.length < MAX_ACTIVE_SKINS && (
          <li>
            <button
              onClick={() => setAddSkinOpen(true)}
              aria-label={t('studio.addSkin')}
              title={t('studio.addSkin')}
              className="flex size-12 items-center justify-center rounded-md border-2 border-dashed border-edge text-xl text-slate-400 hover:border-grass hover:text-white"
            >
              +
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

function SkinNameField({ skin }: { skin: Skin }) {
  const { t } = useTranslation();
  const updateSkin = useStudio((s) => s.updateSkin);
  const [draft, setDraft] = useState(skin.name);
  const commit = () => {
    const name = sanitizeName(draft) || skin.name;
    setDraft(name);
    if (name !== skin.name) updateSkin(skin.id, { name });
  };
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-300">{t('studio.skinName')}</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="w-full rounded-md border border-edge bg-ink px-2 py-1"
      />
    </label>
  );
}

function SkinModelFields({ skin }: { skin: Skin }) {
  const { t } = useTranslation();
  const updateSkin = useStudio((s) => s.updateSkin);
  return (
    <>
      <Field label={t('studio.armModel')} hint={t('studio.detected', { model: t(`studio.${skin.detectedModel}`) })}>
        <Segmented
          label={t('studio.armModel')}
          value={skin.model}
          options={[
            { value: 'classic', label: t('studio.classic') },
            { value: 'slim', label: t('studio.slim') },
          ]}
          onChange={(model) => updateSkin(skin.id, { model })}
        />
      </Field>
      <Toggle label={t('studio.overlay')} checked={skin.showOverlay} onChange={(showOverlay) => updateSkin(skin.id, { showOverlay })} />
    </>
  );
}

function CameraChips() {
  const { t } = useTranslation();
  const cameraId = useStudio((s) => s.cameraId);
  const setCamera = useStudio((s) => s.setCamera);
  return (
    <Chips dir="ltr" label={t('studio.camera')} value={cameraId} options={CAMERAS.map((c) => ({ value: c.id, label: t(`cameras.${c.id}`) }))} onChange={setCamera} />
  );
}

function OutlineFields() {
  const { t } = useTranslation();
  const outline = useStudio((s) => s.settings.outline);
  const updateSettings = useStudio((s) => s.updateSettings);
  return (
    <>
      <Toggle label={t('studio.outline')} checked={outline.enabled} onChange={(enabled) => updateSettings({ outline: { ...outline, enabled } })} />
      {outline.enabled && (
        <>
          <Slider label={t('studio.outlineWidth')} value={outline.width} min={2} max={40} onChange={(width) => updateSettings({ outline: { ...outline, width } })} />
          <ColorInput label={t('studio.outlineColor')} value={outline.color} onChange={(color) => updateSettings({ outline: { ...outline, color } })} />
        </>
      )}
    </>
  );
}

function BackgroundFields() {
  const { t } = useTranslation();
  const background = useStudio((s) => s.settings.background);
  const updateSettings = useStudio((s) => s.updateSettings);
  const fileRef = useRef<HTMLInputElement>(null);
  const setBackground = (next: Background) => updateSettings({ background: next });

  return (
    <>
      <Field label={t('studio.background')}>
        <Chips
          label={t('studio.background')}
          value={background.type}
          options={(['transparent', 'color', 'gradient', 'sunburst', 'image'] as const).map((id) => ({ value: id, label: t(`backgrounds.${id}`) }))}
          onChange={(type) => (type === 'image' ? fileRef.current?.click() : setBackground(BACKGROUND_DEFAULTS[type]))}
        />
      </Field>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        data-testid="background-input"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) setBackground({ type: 'image', imageId: await registerBackgroundImage(file) });
        }}
      />
      {background.type === 'color' && <ColorInput label={t('studio.bgColor')} value={background.color} onChange={(color) => setBackground({ ...background, color })} />}
      {background.type === 'gradient' && (
        <>
          <ColorInput label={t('studio.bgFrom')} value={background.from} onChange={(from) => setBackground({ ...background, from })} />
          <ColorInput label={t('studio.bgTo')} value={background.to} onChange={(to) => setBackground({ ...background, to })} />
        </>
      )}
      {background.type === 'sunburst' && (
        <>
          <ColorInput label={t('studio.bgColor')} value={background.color} onChange={(color) => setBackground({ ...background, color })} />
          <ColorInput label={t('studio.bgRays')} value={background.rays} onChange={(rays) => setBackground({ ...background, rays })} />
        </>
      )}
      {background.type === 'image' && (
        <button onClick={() => fileRef.current?.click()} className={`${buttonSecondary} py-1 text-sm`}>
          {t('studio.uploadImage')}
        </button>
      )}
    </>
  );
}

function ExportFields() {
  const { t } = useTranslation();
  const exportSize = useStudio((s) => s.exportSize);
  const setExportSize = useStudio((s) => s.setExportSize);
  const resetSettings = useStudio((s) => s.resetSettings);
  return (
    <>
      <Field label={t('studio.exportSize')}>
        <Segmented
          dir="ltr"
          label={t('studio.exportSize')}
          value={String(exportSize)}
          options={EXPORT_SIZES.map((s) => ({ value: String(s), label: `${s}px` }))}
          onChange={(v) => setExportSize(Number(v) as ExportSize)}
        />
      </Field>
      <button onClick={resetSettings} className={`${buttonSecondary} py-1 text-sm`}>
        {t('studio.reset')}
      </button>
    </>
  );
}

/** Mounts the 3D preview only in the visible slot, so there is never more than one extra WebGL context. */
function LivePreviewSlot({ skin, desktop }: { skin: Skin; desktop: boolean }) {
  const lighting = useStudio((s) => s.settings.lighting);
  const bigHead = useStudio((s) => s.settings.bigHead);
  const heldItem = useStudio((s) => s.settings.heldItem);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  if (isDesktop !== desktop) return null;
  return <LivePreview skin={skin} lighting={lighting} bigHead={bigHead} heldItem={heldItem} />;
}

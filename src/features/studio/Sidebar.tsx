import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CAMERAS } from '../../data/cameras';
import { FRAME_IDS, registerBackgroundImage, type Background } from '../../render/postprocess/frame';
import { ITEM_IDS } from '../../render/props/items';
import { GROUND_IDS, type RenderSettings } from '../../render/renderShot';
import {
  DEFAULT_CAMERA_ID,
  DEFAULT_EXPORT_SIZE,
  DEFAULT_SETTINGS,
  EXPORT_SIZES,
  MAX_ACTIVE_SKINS,
  useStudio,
  type ExportSize,
} from '../../store/studio';
import { buttonSecondary, Chips, Collapse, ColorInput, Field, Section, Segmented, Select, SkinHead, Slider, Toggle } from '../../ui/controls';
import { useMediaQuery } from '../../ui/useMediaQuery';
import { sanitizeName } from '../skins/loadSkin';
import { ALL_OVERLAY_PARTS, type Skin } from '../skins/types';
import { LivePreview } from './LivePreview';
import { OverlayPicker } from './OverlayPicker';
import { canReadClipboard, readClipboardImage } from '../export/clipboard';

const BACKGROUND_DEFAULTS: Record<Exclude<Background['type'], 'image'>, Background> = {
  transparent: { type: 'transparent' },
  color: { type: 'color', color: '#3a86ff' },
  gradient: { type: 'gradient', from: '#ff006e', to: '#3a0ca3' },
  sunburst: { type: 'sunburst', color: '#ff8c00', rays: '#ffb703' },
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Returns a reset callback only when `value` differs from `fallback`, so reset buttons show only when useful. */
const resetIf = <T,>(value: T, fallback: T, reset: () => void) => (same(value, fallback) ? undefined : reset);

type SettingsKey = keyof RenderSettings;

function useSettingsHelpers() {
  const settings = useStudio((s) => s.settings);
  const updateSettings = useStudio((s) => s.updateSettings);
  /** Reset callback for top-level settings keys, present only when any of them changed. */
  const resetKeys = (...keys: SettingsKey[]) =>
    keys.some((k) => !same(settings[k], DEFAULT_SETTINGS[k]))
      ? () => updateSettings(Object.fromEntries(keys.map((k) => [k, DEFAULT_SETTINGS[k]])) as Partial<RenderSettings>)
      : undefined;
  return { settings, updateSettings, resetKeys };
}

export function Sidebar({ skin }: { skin: Skin }) {
  const { t } = useTranslation();
  const { settings, updateSettings, resetKeys } = useSettingsHelpers();
  const cameraId = useStudio((s) => s.cameraId);
  const setCamera = useStudio((s) => s.setCamera);
  const exportSize = useStudio((s) => s.exportSize);
  const setExportSize = useStudio((s) => s.setExportSize);
  const resetSettings = useStudio((s) => s.resetSettings);
  const updateSkin = useStudio((s) => s.updateSkin);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [mobileOpen, setMobileOpen] = useState(false);

  const skinChanged = skin.model !== skin.defaultModel || !same(skin.overlay, ALL_OVERLAY_PARTS) || skin.silhouette;
  const characterReset = resetKeys('heldItem', 'bigHead');
  const cameraChanged = cameraId !== DEFAULT_CAMERA_ID || settings.mirror !== DEFAULT_SETTINGS.mirror;
  const anythingChanged = !same(settings, DEFAULT_SETTINGS) || cameraId !== DEFAULT_CAMERA_ID || exportSize !== DEFAULT_EXPORT_SIZE;

  return (
    <aside className="flex flex-col gap-4 rounded-xl border border-edge bg-panel p-4 md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:self-start md:overflow-y-auto">
      <SkinsBar activeSkin={skin} />

      <div className="flex items-start gap-3 md:hidden">
        <div className="w-24 shrink-0">{!isDesktop && <PreviewForSkin skin={skin} />}</div>
        <div className="min-w-0 flex-1">
          <SkinNameField key={skin.id} skin={skin} />
        </div>
      </div>
      <div className="hidden md:block">{isDesktop && <PreviewForSkin skin={skin} />}</div>

      <button
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        className="flex items-center justify-between rounded-md border border-edge px-3 py-2 text-sm md:hidden"
      >
        {t('studio.settings')}
        <span className={`transition-transform duration-300 motion-reduce:transition-none ${mobileOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>

      <Collapse open={isDesktop || mobileOpen}>
        <div className="flex flex-col gap-3">
          <Section
            title={t('studio.character')}
            defaultOpen
            onReset={
              skinChanged || characterReset
                ? () => {
                    updateSkin(skin.id, { model: skin.defaultModel, overlay: ALL_OVERLAY_PARTS, silhouette: false });
                    characterReset?.();
                  }
                : undefined
            }
          >
            <div className="hidden md:block">
              <SkinNameField key={skin.id} skin={skin} />
            </div>
            <Field
              label={t('studio.armModel')}
              hint={t('studio.detected', { model: t(`studio.${skin.defaultModel}`) })}
              onReset={resetIf(skin.model, skin.defaultModel, () => updateSkin(skin.id, { model: skin.defaultModel }))}
            >
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
            <OverlayPicker skin={skin} onChange={(overlay) => updateSkin(skin.id, { overlay })} />
            <Toggle
              label={t('studio.silhouette')}
              checked={skin.silhouette}
              onChange={(silhouette) => updateSkin(skin.id, { silhouette })}
              onReset={skin.silhouette ? () => updateSkin(skin.id, { silhouette: false }) : undefined}
            />
            <Select
              label={t('studio.heldItem')}
              value={settings.heldItem}
              options={(['none', ...ITEM_IDS] as const).map((id) => ({ value: id, label: t(`items.${id}`) }))}
              onChange={(heldItem) => updateSettings({ heldItem })}
              onReset={resetKeys('heldItem')}
            />
            <Slider
              label={t('studio.headSize', { value: settings.bigHead.toFixed(1) })}
              value={settings.bigHead}
              min={1}
              max={2}
              step={0.1}
              onChange={(bigHead) => updateSettings({ bigHead })}
              onReset={resetKeys('bigHead')}
            />
          </Section>

          <Section
            title={t('studio.camera')}
            defaultOpen
            onReset={
              cameraChanged
                ? () => {
                    setCamera(DEFAULT_CAMERA_ID);
                    updateSettings({ mirror: DEFAULT_SETTINGS.mirror });
                  }
                : undefined
            }
          >
            <Field label={t('studio.camera')} onReset={resetIf(cameraId, DEFAULT_CAMERA_ID, () => setCamera(DEFAULT_CAMERA_ID))}>
              <Chips dir="ltr" label={t('studio.camera')} value={cameraId} options={CAMERAS.map((c) => ({ value: c.id, label: t(`cameras.${c.id}`) }))} onChange={setCamera} />
            </Field>
            <Toggle label={t('studio.mirror')} checked={settings.mirror} onChange={(mirror) => updateSettings({ mirror })} onReset={resetKeys('mirror')} />
          </Section>

          <Section title={t('studio.effects')} onReset={resetKeys('lighting', 'outline', 'shadow', 'glow')}>
            <Field label={t('studio.lighting')} onReset={resetKeys('lighting')}>
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
            <EffectFields />
          </Section>

          <Section title={t('studio.backgroundSection')} onReset={resetKeys('ground', 'background', 'frame')}>
            <Select
              label={t('studio.ground')}
              value={settings.ground}
              options={GROUND_IDS.map((id) => ({ value: id, label: t(`grounds.${id}`) }))}
              onChange={(ground) => updateSettings({ ground })}
              onReset={resetKeys('ground')}
            />
            <BackgroundFields />
            <Field label={t('studio.frame')} onReset={resetKeys('frame')}>
              <Segmented
                dir="ltr"
                label={t('studio.frame')}
                value={settings.frame}
                options={FRAME_IDS.map((id) => ({ value: id, label: t(`frames.${id}`) }))}
                onChange={(frame) => updateSettings({ frame })}
              />
            </Field>
          </Section>

          <Section title={t('studio.export')} onReset={resetIf(exportSize, DEFAULT_EXPORT_SIZE, () => setExportSize(DEFAULT_EXPORT_SIZE))}>
            <Field label={t('studio.exportSize')} onReset={resetIf(exportSize, DEFAULT_EXPORT_SIZE, () => setExportSize(DEFAULT_EXPORT_SIZE))}>
              <Segmented
                dir="ltr"
                label={t('studio.exportSize')}
                value={String(exportSize)}
                options={EXPORT_SIZES.map((s) => ({ value: String(s), label: `${s}px` }))}
                onChange={(v) => setExportSize(Number(v) as ExportSize)}
              />
            </Field>
          </Section>

          <button onClick={resetSettings} disabled={!anythingChanged} className={`${buttonSecondary} mt-1 py-1.5 text-sm`}>
            <span aria-hidden>↺</span>
            {t('studio.reset')}
          </button>
        </div>
      </Collapse>
    </aside>
  );
}

export function SkinsBar({ activeSkin }: { activeSkin: Skin }) {
  const { t } = useTranslation();
  const skins = useStudio((s) => s.skins);
  const setActiveSkin = useStudio((s) => s.setActiveSkin);
  const removeSkin = useStudio((s) => s.removeSkin);
  const setAddSkinOpen = useStudio((s) => s.setAddSkinOpen);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
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
              className={`block rounded-md border-2 p-1 transition-colors ${skin.id === activeSkin.id ? 'border-grass' : 'border-edge hover:border-slate-500'}`}
            >
              <SkinHead skin={skin} className="size-9" />
            </button>
            <button
              onClick={() => removeSkin(skin.id)}
              aria-label={t('studio.removeSkin', { name: skin.name })}
              className="absolute -inset-e-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border border-edge bg-ink text-[10px] text-slate-300 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:text-white focus:opacity-100 [@media(hover:none)]:opacity-100"
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
              className="flex size-12 items-center justify-center rounded-md border-2 border-dashed border-edge text-xl text-slate-400 transition-colors hover:border-grass hover:text-white"
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

function EffectFields() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsHelpers();
  const { outline, shadow, glow } = settings;
  const d = DEFAULT_SETTINGS;

  return (
    <>
      <Toggle
        label={t('studio.outline')}
        checked={outline.enabled}
        onChange={(enabled) => updateSettings({ outline: { ...outline, enabled } })}
        onReset={resetIf(outline, d.outline, () => updateSettings({ outline: d.outline }))}
      />
      <Collapse open={outline.enabled}>
        <div className="flex flex-col gap-3 ps-3">
          <Slider
            label={t('studio.outlineWidth')}
            value={outline.width}
            min={2}
            max={40}
            onChange={(width) => updateSettings({ outline: { ...outline, width } })}
            onReset={resetIf(outline.width, d.outline.width, () => updateSettings({ outline: { ...outline, width: d.outline.width } }))}
          />
          <ColorInput
            label={t('studio.outlineColor')}
            value={outline.color}
            onChange={(color) => updateSettings({ outline: { ...outline, color } })}
            onReset={resetIf(outline.color, d.outline.color, () => updateSettings({ outline: { ...outline, color: d.outline.color } }))}
          />
        </div>
      </Collapse>

      <Toggle
        label={t('studio.shadow')}
        checked={shadow.enabled}
        onChange={(enabled) => updateSettings({ shadow: { ...shadow, enabled } })}
        onReset={resetIf(shadow, d.shadow, () => updateSettings({ shadow: d.shadow }))}
      />
      <Collapse open={shadow.enabled}>
        <div className="flex flex-col gap-3 ps-3">
          <Slider
            label={t('studio.shadowOpacity')}
            value={shadow.opacity}
            min={0.1}
            max={1}
            step={0.05}
            onChange={(opacity) => updateSettings({ shadow: { ...shadow, opacity } })}
            onReset={resetIf(shadow.opacity, d.shadow.opacity, () => updateSettings({ shadow: { ...shadow, opacity: d.shadow.opacity } }))}
          />
          <Slider
            label={t('studio.shadowBlur')}
            value={shadow.blur}
            min={0}
            max={80}
            onChange={(blur) => updateSettings({ shadow: { ...shadow, blur } })}
            onReset={resetIf(shadow.blur, d.shadow.blur, () => updateSettings({ shadow: { ...shadow, blur: d.shadow.blur } }))}
          />
          <Slider
            label={t('studio.shadowDistance')}
            value={shadow.distance}
            min={0}
            max={80}
            onChange={(distance) => updateSettings({ shadow: { ...shadow, distance } })}
            onReset={resetIf(shadow.distance, d.shadow.distance, () => updateSettings({ shadow: { ...shadow, distance: d.shadow.distance } }))}
          />
        </div>
      </Collapse>

      <Toggle
        label={t('studio.glow')}
        checked={glow.enabled}
        onChange={(enabled) => updateSettings({ glow: { ...glow, enabled } })}
        onReset={resetIf(glow, d.glow, () => updateSettings({ glow: d.glow }))}
      />
      <Collapse open={glow.enabled}>
        <div className="flex flex-col gap-3 ps-3">
          <ColorInput
            label={t('studio.glowColor')}
            value={glow.color}
            onChange={(color) => updateSettings({ glow: { ...glow, color } })}
            onReset={resetIf(glow.color, d.glow.color, () => updateSettings({ glow: { ...glow, color: d.glow.color } }))}
          />
          <Slider
            label={t('studio.glowSize')}
            value={glow.size}
            min={8}
            max={120}
            onChange={(size) => updateSettings({ glow: { ...glow, size } })}
            onReset={resetIf(glow.size, d.glow.size, () => updateSettings({ glow: { ...glow, size: d.glow.size } }))}
          />
        </div>
      </Collapse>
    </>
  );
}

function BackgroundFields() {
  const { t } = useTranslation();
  const { settings, updateSettings, resetKeys } = useSettingsHelpers();
  const background = settings.background;
  const fileRef = useRef<HTMLInputElement>(null);
  const setBackground = (next: Background) => updateSettings({ background: next });
  /** Reset one color back to the default for the current background type. */
  const resetColor = <K extends string>(key: K) => {
    if (background.type === 'image' || background.type === 'transparent') return undefined;
    const fallback = BACKGROUND_DEFAULTS[background.type] as Record<string, string>;
    const current = background as unknown as Record<string, string>;
    return resetIf(current[key], fallback[key], () => setBackground({ ...background, [key]: fallback[key] } as Background));
  };

  return (
    <>
      <Field label={t('studio.background')} onReset={resetKeys('background')}>
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
      {background.type === 'color' && (
        <ColorInput label={t('studio.bgColor')} value={background.color} onChange={(color) => setBackground({ ...background, color })} onReset={resetColor('color')} />
      )}
      {background.type === 'gradient' && (
        <>
          <ColorInput label={t('studio.bgFrom')} value={background.from} onChange={(from) => setBackground({ ...background, from })} onReset={resetColor('from')} />
          <ColorInput label={t('studio.bgTo')} value={background.to} onChange={(to) => setBackground({ ...background, to })} onReset={resetColor('to')} />
        </>
      )}
      {background.type === 'sunburst' && (
        <>
          <ColorInput label={t('studio.bgColor')} value={background.color} onChange={(color) => setBackground({ ...background, color })} onReset={resetColor('color')} />
          <ColorInput label={t('studio.bgRays')} value={background.rays} onChange={(rays) => setBackground({ ...background, rays })} onReset={resetColor('rays')} />
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {background.type === 'image' && (
          <button onClick={() => fileRef.current?.click()} className={`${buttonSecondary} py-1 text-sm`}>
            {t('studio.uploadImage')}
          </button>
        )}
        {canReadClipboard() && (
          <button
            onClick={async () => {
              const image = await readClipboardImage();
              if (image) setBackground({ type: 'image', imageId: await registerBackgroundImage(image) });
              if (image && settings.frame === 'fit') updateSettings({ frame: '16:9' });
            }}
            className={`${buttonSecondary} py-1 text-sm`}
            title={t('studio.pasteHint')}
          >
            {t('studio.pasteImage')}
          </button>
        )}
      </div>
    </>
  );
}

/** The interactive 3D preview (only one instance is ever mounted, see the isDesktop checks above). */
function PreviewForSkin({ skin }: { skin: Skin }) {
  const lighting = useStudio((s) => s.settings.lighting);
  const bigHead = useStudio((s) => s.settings.bigHead);
  const heldItem = useStudio((s) => s.settings.heldItem);
  return <LivePreview skin={skin} lighting={lighting} bigHead={bigHead} heldItem={heldItem} />;
}

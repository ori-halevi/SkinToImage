import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Background } from '../../../render/postprocess/frame';
import { buttonPrimary, buttonSecondary, Chips, ColorInput, Field } from '../../../ui/controls';
import { createImageLayer, createTextLayer } from '../docOps';
import { assetSize, saveAsset } from '../storage';
import { useComposer } from '../store';
import { CharacterPicker } from './CharacterPicker';

const BACKGROUNDS: Record<Exclude<Background['type'], 'image'>, Background> = {
  transparent: { type: 'transparent' },
  color: { type: 'color', color: '#3a86ff' },
  gradient: { type: 'gradient', from: '#ff006e', to: '#3a0ca3' },
  sunburst: { type: 'sunburst', color: '#ff8c00', rays: '#ffb703' },
};

export function AddPanel() {
  const { t } = useTranslation();
  const project = useComposer((s) => s.project)!;
  const { addLayer, setBackground } = useComposer.getState();
  const [pickerOpen, setPickerOpen] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const backgroundInput = useRef<HTMLInputElement>(null);
  const background = project.background;

  const addImageFile = async (file: File) => {
    const [assetId, size] = await Promise.all([saveAsset(file), assetSize(file)]);
    const doc = useComposer.getState().project!;
    addLayer(createImageLayer(doc, { assetId, label: file.name.replace(/\.[^.]+$/, ''), ...size }, 0.5));
  };

  return (
    <aside className="flex flex-col gap-4 rounded-xl border border-edge bg-panel p-4 lg:self-start">
      <h2 className="font-semibold">{t('composer.add')}</h2>
      <button onClick={() => setPickerOpen(true)} className={buttonPrimary}>
        {t('composer.addCharacter')}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => addLayer(createTextLayer(project, t('composer.defaultText')))} className={`${buttonSecondary} text-sm`}>
          {t('composer.addText')}
        </button>
        <button onClick={() => imageInput.current?.click()} className={`${buttonSecondary} text-sm`}>
          {t('composer.addImage')}
        </button>
      </div>
      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        className="hidden"
        data-testid="composer-image-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void addImageFile(file);
        }}
      />

      <div className="border-t border-edge pt-4">
        <Field label={t('studio.background')}>
          <Chips
            label={t('studio.background')}
            value={background.type}
            options={(['transparent', 'color', 'gradient', 'sunburst', 'image'] as const).map((id) => ({ value: id, label: t(`backgrounds.${id}`) }))}
            onChange={(type) => (type === 'image' ? backgroundInput.current?.click() : setBackground(BACKGROUNDS[type]))}
          />
        </Field>
        <input
          ref={backgroundInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) setBackground({ type: 'image', imageId: await saveAsset(file) });
          }}
        />
        <div className="mt-3 flex flex-col gap-2">
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
            <button onClick={() => backgroundInput.current?.click()} className={`${buttonSecondary} py-1 text-sm`}>
              {t('studio.uploadImage')}
            </button>
          )}
        </div>
      </div>

      {pickerOpen && <CharacterPicker onClose={() => setPickerOpen(false)} />}
    </aside>
  );
}

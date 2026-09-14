import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getFaceRects, getPartLayouts, type PartId } from '../../render/rig/layout';
import { ResetButton } from '../../ui/controls';
import { ALL_OVERLAY_PARTS, type OverlayParts, type Skin } from '../skins/types';

/** Where each part's front face sits in a 16×32 front view (viewer's left = character's right). */
const FIGURE: Record<PartId, { x: number; y: number; w: number; h: number }> = {
  head: { x: 4, y: 0, w: 8, h: 8 },
  body: { x: 4, y: 8, w: 8, h: 12 },
  rightArm: { x: 0, y: 8, w: 4, h: 12 },
  leftArm: { x: 12, y: 8, w: 4, h: 12 },
  rightLeg: { x: 4, y: 20, w: 4, h: 12 },
  leftLeg: { x: 8, y: 20, w: 4, h: 12 },
};

const PART_ORDER: PartId[] = ['head', 'body', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg'];

export function OverlayPicker({ skin, onChange }: { skin: Skin; onChange: (overlay: OverlayParts) => void }) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layouts = useMemo(() => getPartLayouts(skin.model), [skin.model]);
  const allOn = PART_ORDER.every((p) => skin.overlay[p]);
  const allOff = PART_ORDER.every((p) => !skin.overlay[p]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const s = skin.size / 64;
    ctx.clearRect(0, 0, 16, 32);
    for (const part of layouts) {
      const slot = FIGURE[part.id];
      // Slim arms are 3px wide: keep them against the body.
      const width = part.size[0];
      const x = part.id === 'rightArm' ? slot.x + (slot.w - width) : slot.x;
      const layers = [part.uv, ...(skin.overlay[part.id] ? [part.overlayUv] : [])];
      for (const uv of layers) {
        const [fx, fy, fw, fh] = getFaceRects(uv, part.size).front;
        ctx.drawImage(skin.bitmap, fx * s, fy * s, fw * s, fh * s, x, slot.y, width, slot.h);
      }
    }
  }, [skin, layouts]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-6 items-center gap-2 text-sm">
        <span className="font-medium">{t('studio.overlay')}</span>
        <span className="ms-auto" />
        <ResetButton name={t('studio.overlay')} onReset={allOn ? undefined : () => onChange(ALL_OVERLAY_PARTS)} />
      </div>
      <div className="flex items-center gap-4">
        <div dir="ltr" className="checker relative h-32 w-16 shrink-0 rounded">
          <canvas ref={canvasRef} width={16} height={32} className="pixelated absolute inset-0 size-full" aria-hidden />
          {PART_ORDER.map((id) => {
            const slot = FIGURE[id];
            const on = skin.overlay[id];
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                aria-label={t(`overlayParts.${id}`)}
                title={t(`overlayParts.${id}`)}
                onClick={() => onChange({ ...skin.overlay, [id]: !on })}
                style={{ left: `${(slot.x / 16) * 100}%`, top: `${(slot.y / 32) * 100}%`, width: `${(slot.w / 16) * 100}%`, height: `${(slot.h / 32) * 100}%` }}
                className={`absolute rounded-[2px] transition-[box-shadow,background-color] duration-200 hover:bg-white/15 ${
                  on ? 'shadow-[inset_0_0_0_2px_var(--color-grass)]' : 'bg-ink/55 shadow-[inset_0_0_0_1px_rgb(148_163_184/0.6)]'
                }`}
              />
            );
          })}
        </div>
        <div className="flex flex-col gap-2 text-xs text-slate-400">
          <p>{t('studio.overlayHint')}</p>
          <div className="flex gap-2">
            <button type="button" disabled={allOn} onClick={() => onChange(ALL_OVERLAY_PARTS)} className="rounded border border-edge px-2 py-0.5 hover:text-white disabled:opacity-40">
              {t('studio.overlayAll')}
            </button>
            <button
              type="button"
              disabled={allOff}
              onClick={() => onChange(Object.fromEntries(PART_ORDER.map((p) => [p, false])) as OverlayParts)}
              className="rounded border border-edge px-2 py-0.5 hover:text-white disabled:opacity-40"
            >
              {t('studio.overlayNone')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

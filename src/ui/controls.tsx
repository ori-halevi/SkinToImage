import { useEffect, useRef, type ReactNode } from 'react';
import type { Skin } from '../features/skins/types';

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  dir,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label?: string;
  /** Force a direction, e.g. "ltr" for spatial options like Left/Front/Right. */
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <div role="group" aria-label={label} dir={dir} className="flex rounded-md border border-edge p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={`flex-1 rounded px-2 py-1 text-sm ${o.value === value ? 'bg-edge font-semibold text-white' : 'text-slate-400 hover:text-white'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const buttonPrimary =
  'inline-flex items-center justify-center gap-2 rounded-md bg-grass px-4 py-2 font-semibold text-ink hover:bg-grass-dark disabled:opacity-50';
export const buttonSecondary =
  'inline-flex items-center justify-center gap-2 rounded-md border border-edge px-4 py-2 hover:bg-edge disabled:opacity-50';

/** The skin's face (base + hat layer), drawn crisp from the texture. */
export function SkinHead({ skin, className = '' }: { skin: Skin; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const s = skin.size / 64;
    ctx.clearRect(0, 0, 8, 8);
    ctx.drawImage(skin.bitmap, 8 * s, 8 * s, 8 * s, 8 * s, 0, 0, 8, 8);
    ctx.drawImage(skin.bitmap, 40 * s, 8 * s, 8 * s, 8 * s, 0, 0, 8, 8);
  }, [skin]);
  return <canvas ref={ref} width={8} height={8} className={`pixelated ${className}`} aria-hidden />;
}

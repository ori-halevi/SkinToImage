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

/** Collapsible settings group. */
export function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details open={defaultOpen} className="group border-t border-edge pt-3">
      <summary className="flex cursor-pointer list-none items-center justify-between py-1 font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="mt-3 flex flex-col gap-4">{children}</div>
    </details>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span className="font-medium">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-grass" />
    </label>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-300">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-grass disabled:opacity-40"
      />
    </label>
  );
}

export function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-300">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-12 cursor-pointer rounded border border-edge bg-transparent"
      />
    </label>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="font-medium">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="rounded-md border border-edge bg-ink px-2 py-1">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Wrapping single-choice chips, for option sets too long for a segmented control. */
export function Chips<T extends string>({
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
    <div role="group" aria-label={label} dir={dir} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-2.5 py-1 text-sm ${
            o.value === value ? 'border-grass bg-grass/15 text-white' : 'border-edge text-slate-400 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

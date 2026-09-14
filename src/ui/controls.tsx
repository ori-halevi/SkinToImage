import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Skin } from '../features/skins/types';

export const buttonPrimary =
  'inline-flex items-center justify-center gap-2 rounded-md bg-grass px-4 py-2 font-semibold text-ink transition-colors hover:bg-grass-dark disabled:opacity-50';
export const buttonSecondary =
  'inline-flex items-center justify-center gap-2 rounded-md border border-edge px-4 py-2 transition-colors hover:bg-edge disabled:opacity-50';

/**
 * Small "back to default" button. Pass `onReset` only when the value differs from its default;
 * otherwise the button keeps its space but stays hidden, so the layout doesn't jump.
 */
export function ResetButton({ onReset, name }: { onReset?: () => void; name: string }) {
  const { t } = useTranslation();
  const label = t('studio.resetField', { name });
  return (
    <button
      type="button"
      onClick={onReset}
      aria-label={label}
      title={label}
      tabIndex={onReset ? 0 : -1}
      aria-hidden={!onReset}
      className={`inline-flex size-6 shrink-0 items-center justify-center rounded text-slate-400 transition-opacity duration-200 hover:bg-edge hover:text-white ${
        onReset ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <span aria-hidden className="inline-block text-base leading-none">↺</span>
    </button>
  );
}

/** Label row shared by all controls: label, optional hint, optional reset. */
function LabelRow({ label, htmlFor, hint, onReset, strong }: { label: ReactNode; htmlFor?: string; hint?: ReactNode; onReset?: () => void; strong?: boolean }) {
  const text = typeof label === 'string' ? label : '';
  return (
    <div className="flex min-h-6 items-center gap-2 text-sm">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={strong ? 'font-medium' : 'text-slate-300'}>
          {label}
        </label>
      ) : (
        <span className={strong ? 'font-medium' : 'text-slate-300'}>{label}</span>
      )}
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
      <span className="ms-auto" />
      {text && <ResetButton onReset={onReset} name={text} />}
    </div>
  );
}

export function Field({ label, hint, children, onReset }: { label: string; hint?: ReactNode; children: ReactNode; onReset?: () => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <LabelRow label={label} hint={hint} onReset={onReset} strong />
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
          className={`flex-1 rounded px-2 py-1 text-sm transition-colors duration-200 ${
            o.value === value ? 'bg-edge font-semibold text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Height-animated show/hide that works in every modern browser (grid-rows 0fr ↔ 1fr). */
export function Collapse({ open, id, children, className = '' }: { open: boolean; id?: string; children: ReactNode; className?: string }) {
  return (
    <div
      id={id}
      inert={!open}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      } ${className}`}
    >
      {/* Horizontal padding keeps focus rings and slider thumbs from being clipped. */}
      <div className="-mx-1 min-h-0 overflow-hidden px-1">{children}</div>
    </div>
  );
}

/** Collapsible settings group with an optional "reset this section" action. */
export function Section({
  title,
  defaultOpen = false,
  children,
  onReset,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  /** Present only when something in the section differs from its defaults. */
  onReset?: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="border-t border-edge pt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-1 text-start font-semibold"
      >
        <span className="flex items-center gap-2">
          {title}
          {onReset && <span className="size-1.5 rounded-full bg-grass" title={t('studio.modified')} />}
        </span>
        <span className={`text-slate-400 transition-transform duration-300 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} aria-hidden>
          ▾
        </span>
      </button>
      <Collapse open={open} id={id}>
        <div className="flex flex-col gap-4 pb-1 pt-3">
          {children}
          {onReset && (
            <button type="button" onClick={onReset} className="self-start text-xs text-slate-400 underline-offset-2 hover:text-white hover:underline">
              <span aria-hidden>↺ </span>
              {t('studio.resetSection', { name: title })}
            </button>
          )}
        </div>
      </Collapse>
    </div>
  );
}

export function Toggle({ label, checked, onChange, onReset }: { label: string; checked: boolean; onChange: (checked: boolean) => void; onReset?: () => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={id} className="cursor-pointer font-medium">
        {label}
      </label>
      <span className="ms-auto" />
      <ResetButton onReset={onReset} name={label} />
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 cursor-pointer accent-grass" />
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onReset,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onReset?: () => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <LabelRow label={label} htmlFor={id} onReset={onReset} />
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-grass disabled:opacity-40"
      />
    </div>
  );
}

export function ColorInput({ label, value, onChange, onReset }: { label: string; value: string; onChange: (value: string) => void; onReset?: () => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={id} className="text-slate-300">
        {label}
      </label>
      <span className="ms-auto" />
      <ResetButton onReset={onReset} name={label} />
      <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-edge bg-transparent" />
    </div>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  onReset,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  onReset?: () => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <span className="ms-auto" />
      <ResetButton onReset={onReset} name={label} />
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className="rounded-md border border-edge bg-ink px-2 py-1">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
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
          className={`rounded-full border px-2.5 py-1 text-sm transition-colors duration-200 ${
            o.value === value ? 'border-grass bg-grass/15 text-white' : 'border-edge text-slate-400 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** The skin's face (base + hat layer), drawn crisp from the texture. */
export function SkinHead({ skin, className = '' }: { skin: Skin; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const s = skin.size / 64;
    ctx.clearRect(0, 0, 8, 8);
    ctx.drawImage(skin.bitmap, 8 * s, 8 * s, 8 * s, 8 * s, 0, 0, 8, 8);
    if (skin.overlay.head) ctx.drawImage(skin.bitmap, 40 * s, 8 * s, 8 * s, 8 * s, 0, 0, 8, 8);
  }, [skin]);
  return <canvas ref={ref} width={8} height={8} className={`pixelated ${className}`} aria-hidden />;
}

const REDUCED_MOTION = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DIALOG_MS = 200;

/**
 * Opens a native modal dialog with an enter animation and delays closing until the exit
 * animation finishes (Esc, backdrop click and close buttons all go through `requestClose`).
 */
export function useAnimatedDialog(onClosed: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const [shown, setShown] = useState(false);
  const closing = useRef(false);

  useEffect(() => {
    const dialog = ref.current!;
    if (!dialog.open) dialog.showModal();
    const frame = requestAnimationFrame(() => setShown(true));
    return () => {
      cancelAnimationFrame(frame);
      dialog.close();
    };
  }, []);

  const requestClose = () => {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    setTimeout(() => ref.current?.close(), REDUCED_MOTION() ? 0 : DIALOG_MS);
  };

  const dialogProps = {
    ref,
    'data-shown': shown,
    onCancel: (e: SyntheticEvent) => {
      e.preventDefault();
      requestClose();
    },
    onClose: onClosed,
    onClick: (e: MouseEvent) => e.target === ref.current && requestClose(),
  };

  return { ref, requestClose, dialogProps };
}

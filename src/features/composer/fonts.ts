// Fonts are bundled (all OFL-1.1) so text renders identically offline and in exports.
import '@fontsource/bangers/latin-400.css';
import '@fontsource/pixelify-sans/latin-700.css';
import '@fontsource/rubik/latin-900.css';
import '@fontsource/rubik/hebrew-900.css';
import type { FontId } from './types';

/** Canvas font settings per font choice. Rubik is the fallback for Hebrew in every font. */
export const FONTS: Record<FontId, { family: string; weight: string }> = {
  impact: { family: "'Bangers', 'Rubik', sans-serif", weight: 'normal' },
  pixel: { family: "'Pixelify Sans', 'Rubik', sans-serif", weight: 'bold' },
  bold: { family: "'Rubik', sans-serif", weight: '900' },
};

export const FONT_IDS = Object.keys(FONTS) as FontId[];

let ready: Promise<void> | null = null;

/** Resolves once all editor fonts are usable by canvas text (which never waits for fonts itself). */
export function loadFonts(): Promise<void> {
  ready ??= Promise.all([
    document.fonts.load("400 64px 'Bangers'"),
    document.fonts.load("700 64px 'Pixelify Sans'"),
    document.fonts.load("900 64px 'Rubik'", 'Aa'),
    document.fonts.load("900 64px 'Rubik'", 'אב'),
  ]).then(() => undefined, () => undefined);
  return ready;
}

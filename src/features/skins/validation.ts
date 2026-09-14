export const MAX_SKIN_SIZE = 1024;

/** Also the i18n key suffix: `errors.<code>`. */
export type SkinValidationError = 'not-png' | 'legacy-64x32' | 'bad-dimensions' | 'too-large';

export function validateFileType(file: { type: string; name: string }): SkinValidationError | null {
  const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
  return isPng ? null : 'not-png';
}

export function validateDimensions(width: number, height: number): SkinValidationError | null {
  if (width === height * 2 && width % 64 === 0) return 'legacy-64x32';
  if (width !== height || width < 64 || width % 64 !== 0) return 'bad-dimensions';
  if (width > MAX_SKIN_SIZE) return 'too-large';
  return null;
}

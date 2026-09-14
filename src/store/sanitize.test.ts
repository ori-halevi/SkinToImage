import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, sanitizeCameraId, sanitizeSettings } from './sanitize';

describe('sanitizeSettings', () => {
  it('returns defaults for missing or garbage data', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('nope')).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values and fills missing nested fields from defaults', () => {
    const result = sanitizeSettings({ bigHead: 1.5, outline: { color: '#ff0000' }, ground: 'grass' });
    expect(result.bigHead).toBe(1.5);
    expect(result.outline).toEqual({ ...DEFAULT_SETTINGS.outline, color: '#ff0000' });
    expect(result.ground).toBe('grass');
  });

  it('drops unknown enum values, out-of-range numbers and bad colors', () => {
    const result = sanitizeSettings({
      ground: 'lava',
      heldItem: 'laser',
      frame: '4:3',
      bigHead: 99,
      glow: { enabled: true, color: 'red', size: -5 },
    });
    expect(result.ground).toBe('none');
    expect(result.heldItem).toBe('none');
    expect(result.frame).toBe('fit');
    expect(result.bigHead).toBe(2);
    expect(result.glow).toEqual({ enabled: true, color: DEFAULT_SETTINGS.glow.color, size: 8 });
  });

  it('never restores an in-memory background image', () => {
    expect(sanitizeSettings({ background: { type: 'image', imageId: 'x' } }).background).toEqual({ type: 'transparent' });
    expect(sanitizeSettings({ background: { type: 'color', color: '#123456' } }).background).toEqual({ type: 'color', color: '#123456' });
  });
});

describe('sanitizeCameraId', () => {
  it('accepts known cameras only', () => {
    expect(sanitizeCameraId('hero', 'left')).toBe('hero');
    expect(sanitizeCameraId('threeQuarter', 'left')).toBe('left');
  });
});

import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { buildZip } from './zip';
import { stampedFilename, timestamp } from './exportImage';

describe('buildZip', () => {
  it('stores every entry and de-duplicates names', async () => {
    const zip = buildZip([
      { filename: 'a.png', data: new Uint8Array([1, 2, 3]) },
      { filename: 'a.png', data: new Uint8Array([4]) },
      { filename: 'b.png', data: new Uint8Array([5]) },
    ]);
    const files = unzipSync(new Uint8Array(await zip.arrayBuffer()));
    expect(Object.keys(files).sort()).toEqual(['a.png', 'a_2.png', 'b.png']);
    expect(Array.from(files['a.png'])).toEqual([1, 2, 3]);
  });
});

describe('stampedFilename', () => {
  it('inserts a sortable timestamp before the extension', () => {
    expect(timestamp(new Date(2026, 8, 26, 14, 30, 12))).toBe('20260926-143012');
    expect(stampedFilename('My_thumbnail.png')).toMatch(/^My_thumbnail_\d{8}-\d{6}\.png$/);
    expect(stampedFilename('noext')).toMatch(/^noext_\d{8}-\d{6}$/);
  });
});

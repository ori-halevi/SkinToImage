import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { buildZip } from './zip';

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

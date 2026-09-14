import { zipSync } from 'fflate';

export interface ZipEntry {
  filename: string;
  data: Uint8Array;
}

/** PNGs are already compressed, so entries are stored without extra compression. */
export function buildZip(entries: ZipEntry[]): Blob {
  const files: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const { filename, data } of entries) files[uniqueName(filename, files)] = [data, { level: 0 }];
  return new Blob([zipSync(files) as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
}

function uniqueName(filename: string, taken: Record<string, unknown>): string {
  if (!(filename in taken)) return filename;
  const dot = filename.lastIndexOf('.');
  const [base, ext] = dot > 0 ? [filename.slice(0, dot), filename.slice(dot)] : [filename, ''];
  let i = 2;
  while (`${base}_${i}${ext}` in taken) i++;
  return `${base}_${i}${ext}`;
}

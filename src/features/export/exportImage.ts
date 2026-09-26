/** Local YYYYMMDD-HHMMSS, so repeated downloads never collide in the downloads folder. */
export function timestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('');
  const t = [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join('');
  return `${d}-${t}`;
}

/** "name.png" -> "name_20260926-143012.png". */
export function stampedFilename(filename: string): string {
  const dot = filename.lastIndexOf('.');
  const [base, ext] = dot > 0 ? [filename.slice(0, dot), filename.slice(dot)] : [filename, ''];
  return `${base}_${timestamp()}${ext}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // iOS Safari asks before downloading; the URL must outlive that prompt.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function canCopyImage(): boolean {
  return typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;
}

/** Accepts a promise so Safari keeps the user-gesture context while the image renders. */
export async function copyImage(blob: Promise<Blob>): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

export function canShareFiles(): boolean {
  if (!navigator.canShare) return false;
  return navigator.canShare({ files: [new File([], 'x.png', { type: 'image/png' })] });
}

export async function shareImage(blob: Blob, filename: string): Promise<void> {
  await navigator.share({ files: [new File([blob], filename, { type: 'image/png' })] });
}

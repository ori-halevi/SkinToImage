export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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

export function exportFilename(skinName: string, poseId: string, cameraId: string): string {
  return `${skinName}_${poseId}_${cameraId}.png`;
}

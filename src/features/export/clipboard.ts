/** First image in a paste event, if any. */
export function imageFromPaste(e: ClipboardEvent): File | null {
  return [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/')) ?? null;
}

/** Whether a paste should be left alone (typing into a field, or a dialog is open). */
export function isEditingText(e: Event): boolean {
  const target = e.target as HTMLElement | null;
  return !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

export const canReadClipboard = () => typeof navigator.clipboard?.read === 'function';

/** Reads an image from the clipboard via the async Clipboard API (needs a user gesture and permission). */
export async function readClipboardImage(): Promise<Blob | null> {
  try {
    for (const item of await navigator.clipboard.read()) {
      const type = item.types.find((t) => t.startsWith('image/'));
      if (type) return await item.getType(type);
    }
  } catch {
    // Permission denied or unsupported.
  }
  return null;
}

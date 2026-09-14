import { stageHandle } from './CanvasStage';

export type ExportFormat = 'png' | 'jpeg';

/** Renders the stage at the project's full resolution, without selection handles or guides. */
export async function exportStage(format: ExportFormat, width: number, options: { targetWidth?: number; quality?: number } = {}): Promise<Blob> {
  const stage = stageHandle.stage;
  if (!stage) throw new Error('Editor is not ready');
  const ui = stage.findOne('.editor-ui');
  ui?.hide();
  try {
    const pixelRatio = (options.targetWidth ?? width) / (width * stageHandle.scale);
    const blob = (await stage.toBlob({ pixelRatio, mimeType: `image/${format}`, quality: options.quality ?? 0.92 })) as Blob;
    return blob;
  } finally {
    ui?.show();
  }
}

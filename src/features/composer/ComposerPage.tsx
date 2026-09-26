import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { downloadBlob } from '../export/exportImage';
import { buttonPrimary, buttonSecondary } from '../../ui/controls';
import { useMediaQuery } from '../../ui/useMediaQuery';
import { ensureProject } from './addToEditor';
import { CanvasStage, stageHandle } from './CanvasStage';
import { exportStage, type ExportFormat } from './exportComposer';
import { AddPanel } from './panels/AddPanel';
import { LayersPanel } from './panels/LayersPanel';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { ProjectsDialog } from './panels/ProjectsDialog';
import { AddSkinDialog } from '../skins/UploadPanel';
import { useStudio } from '../../store/studio';
import { useComposer } from './store';
import { assetSize, saveAsset } from './storage';
import { createImageLayer } from './docOps';
import { create } from 'zustand';
import { imageFromPaste, isEditingText } from '../export/clipboard';
import { CANVAS_PRESET_IDS, CANVAS_PRESETS, presetFor, type CanvasPresetId } from './types';

const THUMBNAIL_WIDTH = 320;

export default function ComposerPage() {
  const { t } = useTranslation();
  const project = useComposer((s) => s.project);

  useEffect(() => {
    void ensureProject(t('composer.untitled'));
  }, [t]);

  if (!project) return <p className="py-10 text-center text-slate-400">{t('dialog.rendering')}</p>;
  return <Editor />;
}

function Editor() {
  const { t } = useTranslation();
  const project = useComposer((s) => s.project)!;
  const canUndo = useComposer((s) => s.history.past.length > 0);
  const canRedo = useComposer((s) => s.history.future.length > 0);
  const { undo, redo, rename, resizeCanvas } = useComposer.getState();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [projectsOpen, setProjectsOpen] = useState(false);
  const addSkinOpen = useStudio((s) => s.addSkinOpen);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [nameDraft, setNameDraft] = useState(project.name);

  useEffect(() => setNameDraft(project.name), [project.id, project.name]);
  useKeyboardShortcuts();
  usePasteImage();
  useThumbnail(project.updatedAt);

  const preset = presetFor(project.width, project.height);

  const exportAs = async (format: ExportFormat) => {
    setExporting(format);
    try {
      useComposer.getState().select(null);
      await new Promise((r) => requestAnimationFrame(r));
      const blob = await exportStage(format, project.width);
      const safeName = project.name.trim().replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'thumbnail';
      downloadBlob(blob, `${safeName}.${format === 'jpeg' ? 'jpg' : 'png'}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-edge bg-panel p-3">
        <input
          aria-label={t('composer.projectName')}
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => nameDraft.trim() && nameDraft !== project.name && rename(nameDraft.trim())}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="w-40 min-w-0 rounded-md border border-edge bg-ink px-2 py-1 sm:w-56"
        />
        <button onClick={() => setProjectsOpen(true)} className={`${buttonSecondary} py-1 text-sm`}>
          {t('composer.projects')}
        </button>
        <button
          onClick={() => useComposer.getState().newProject(t('composer.untitled'), presetFor(project.width, project.height) ?? 'youtube')}
          className={`${buttonSecondary} py-1 text-sm`}
        >
          {t('composer.newProject')}
        </button>
        <select
          aria-label={t('composer.canvasSize')}
          value={preset ?? ''}
          onChange={(e) => resizeCanvas(e.target.value as CanvasPresetId)}
          className="rounded-md border border-edge bg-ink px-2 py-1 text-sm"
        >
          {!preset && <option value="">{`${project.width}×${project.height}`}</option>}
          {CANVAS_PRESET_IDS.map((id) => (
            <option key={id} value={id}>
              {t(`composer.presets.${id}`)} ({CANVAS_PRESETS[id].width}×{CANVAS_PRESETS[id].height})
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          <button onClick={undo} disabled={!canUndo} aria-label={t('composer.undo')} title={`${t('composer.undo')} (Ctrl+Z)`} className={`${buttonSecondary} px-3 py-1`}>
            <span aria-hidden className="inline-block rtl:-scale-x-100">↶</span>
          </button>
          <button onClick={redo} disabled={!canRedo} aria-label={t('composer.redo')} title={`${t('composer.redo')} (Ctrl+Y)`} className={`${buttonSecondary} px-3 py-1`}>
            <span aria-hidden className="inline-block rtl:-scale-x-100">↷</span>
          </button>
        </div>
        <span className="ms-auto" />
        <button onClick={() => exportAs('jpeg')} disabled={!!exporting} className={`${buttonSecondary} py-1 text-sm`}>
          {exporting === 'jpeg' ? t('dialog.rendering') : t('composer.downloadJpg')}
        </button>
        <button onClick={() => exportAs('png')} disabled={!!exporting} className={`${buttonPrimary} py-1 text-sm`}>
          {exporting === 'png' ? t('dialog.rendering') : t('composer.downloadPng')}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr_280px]">
        <AddPanel />
        {/* On small screens the canvas comes first; panels follow. */}
        <div className="order-first min-w-0 rounded-xl border border-edge bg-panel p-3 lg:order-none">
          <CanvasStage maxHeight={isDesktop ? window.innerHeight * 0.68 : window.innerHeight * 0.55} />
          <p className="mt-2 text-center text-xs text-slate-500">{t('composer.hint')}</p>
        </div>
        <div className="flex flex-col gap-4">
          <PropertiesPanel />
          <LayersPanel />
        </div>
      </div>

      {projectsOpen && <ProjectsDialog onClose={() => setProjectsOpen(false)} />}
      {addSkinOpen && <AddSkinDialog />}
      <PasteToast />
    </div>
  );
}

/** The last Ctrl+V, so it can be turned from a background into an image layer. */
interface PastedImage {
  assetId: string;
  /** The layer the paste created, so switching to "background" removes exactly that one. */
  layerId: string;
}
const usePasteState = create<{ pasted: PastedImage | null; set: (pasted: PastedImage | null) => void }>()((set) => ({
  pasted: null,
  set: (pasted) => set({ pasted }),
}));

/** Ctrl+V adds the clipboard image as a layer: no need to save it to disk first. */
function usePasteImage() {
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      if (isEditingText(e) || document.querySelector('dialog[open]')) return;
      const image = imageFromPaste(e);
      if (!image) return;
      e.preventDefault();
      const [assetId, size] = await Promise.all([saveAsset(image), assetSize(image)]);
      const store = useComposer.getState();
      const project = store.project;
      if (!project) return;
      const layer = createImageLayer(project, { assetId, label: image.name.replace(/\.[^.]+$/, '') || 'image', ...size }, 0.6);
      store.addLayer(layer);
      usePasteState.getState().set({ assetId, layerId: layer.id });
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);
}

/** "Pasted as an image — use it as the background instead?" */
function PasteToast() {
  const { t } = useTranslation();
  const pasted = usePasteState((s) => s.pasted);
  const clear = usePasteState((s) => s.set);

  useEffect(() => {
    if (!pasted) return;
    const timer = setTimeout(() => clear(null), 8000);
    return () => clearTimeout(timer);
  }, [pasted, clear]);

  if (!pasted) return null;
  const asBackground = () => {
    const store = useComposer.getState();
    store.removeLayer(pasted.layerId);
    store.setBackground({ type: 'image', imageId: pasted.assetId });
    clear(null);
  };
  return (
    <div role="status" className="fade-in fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-lg border border-edge bg-panel p-3 shadow-lg">
      <span className="me-auto text-sm">{t('composer.pastedAsImage')}</span>
      <button onClick={asBackground} className={`${buttonSecondary} py-1 text-sm`}>
        {t('composer.useAsBackground')}
      </button>
      <button onClick={() => clear(null)} aria-label={t('dialog.close')} className="px-1 text-slate-400 hover:text-white">
        ✕
      </button>
    </div>
  );
}

function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      if (document.querySelector('dialog[open]')) return;
      const s = useComposer.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'z' && !e.shiftKey) s.undo();
      else if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) s.redo();
      else if (mod && key === 'd' && s.selectedId) s.duplicateLayer(s.selectedId);
      else if ((e.key === 'Delete' || e.key === 'Backspace') && s.selectedId) s.removeLayer(s.selectedId);
      else if (e.key === 'Escape') s.select(null);
      else if (e.key.startsWith('Arrow') && s.selectedId && s.project) {
        const layer = s.project.layers.find((l) => l.id === s.selectedId);
        if (!layer) return;
        const step = e.shiftKey ? 20 : 2;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        s.updateLayer(layer.id, { x: layer.x + dx, y: layer.y + dy }, 'nudge');
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** Refreshes the project's list thumbnail a moment after edits settle. */
function useThumbnail(updatedAt: number) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const project = useComposer.getState().project;
      if (!project || !stageHandle.stage) return;
      try {
        const blob = await exportStage('jpeg', project.width, { targetWidth: THUMBNAIL_WIDTH, quality: 0.7 });
        const reader = new FileReader();
        reader.onload = () => useComposer.getState().setThumbnail(reader.result as string);
        reader.readAsDataURL(blob);
      } catch {
        // Thumbnails are cosmetic.
      }
    }, 1500);
    return () => clearTimeout(timer.current);
  }, [updatedAt]);
}

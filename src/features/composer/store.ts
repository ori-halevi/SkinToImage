import { create } from 'zustand';
import type { Background } from '../../render/postprocess/frame';
import * as ops from './docOps';
import { saveProject } from './storage';
import type { CanvasPresetId, ComposerDoc, Layer, Project } from './types';

interface ComposerState {
  project: Project | null;
  selectedId: string | null;
  history: ops.History;

  openProject: (project: Project) => void;
  newProject: (name: string, preset?: CanvasPresetId) => Project;
  rename: (name: string) => void;
  select: (id: string | null) => void;

  /** Applies an edit and records an undo step (edits sharing `tag` in quick succession merge). */
  edit: (recipe: (doc: ComposerDoc) => ComposerDoc, tag?: string) => void;
  addLayer: (layer: Layer) => void;
  updateLayer: (id: string, patch: Partial<Layer>, tag?: string) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  reorderLayer: (id: string, move: ops.ReorderMove) => void;
  setBackground: (background: Background) => void;
  resizeCanvas: (preset: CanvasPresetId) => void;
  undo: () => void;
  redo: () => void;
  setThumbnail: (thumbnail: string) => void;
}

const docOf = (p: Project): ComposerDoc => ({ width: p.width, height: p.height, background: p.background, layers: p.layers });

export const useComposer = create<ComposerState>()((set, get) => ({
  project: null,
  selectedId: null,
  history: ops.emptyHistory(),

  openProject: (project) => set({ project, selectedId: null, history: ops.emptyHistory() }),
  newProject: (name, preset = 'youtube') => {
    const now = Date.now();
    const project: Project = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now, ...ops.emptyDoc(preset) };
    set({ project, selectedId: null, history: ops.emptyHistory() });
    return project;
  },
  rename: (name) => set((s) => (s.project ? { project: { ...s.project, name, updatedAt: Date.now() } } : {})),
  select: (selectedId) => set({ selectedId }),

  edit: (recipe, tag) => {
    const { project, history } = get();
    if (!project) return;
    const before = docOf(project);
    const after = recipe(before);
    if (after === before) return;
    const now = Date.now();
    set({ project: { ...project, ...after, updatedAt: now }, history: ops.recordChange(history, before, tag, now) });
  },
  addLayer: (layer) => {
    get().edit((doc) => ops.addLayer(doc, layer));
    set({ selectedId: layer.id });
  },
  updateLayer: (id, patch, tag) => get().edit((doc) => ops.updateLayer(doc, id, patch), tag && `${tag}:${id}`),
  removeLayer: (id) => {
    get().edit((doc) => ops.removeLayer(doc, id));
    if (get().selectedId === id) set({ selectedId: null });
  },
  duplicateLayer: (id) => {
    let newId: string | null = null;
    get().edit((doc) => {
      const result = ops.duplicateLayer(doc, id);
      newId = result.id;
      return result.doc;
    });
    if (newId) set({ selectedId: newId });
  },
  reorderLayer: (id, move) => get().edit((doc) => ops.reorderLayer(doc, id, move)),
  setBackground: (background) => get().edit((doc) => ({ ...doc, background }), 'background'),
  resizeCanvas: (preset) => get().edit((doc) => ops.resizeCanvas(doc, preset)),

  undo: () => {
    const { project, history } = get();
    const result = project && ops.undo(history, docOf(project));
    if (!project || !result) return;
    set((s) => ({
      project: { ...project, ...result.doc, updatedAt: Date.now() },
      history: result.history,
      selectedId: result.doc.layers.some((l) => l.id === s.selectedId) ? s.selectedId : null,
    }));
  },
  redo: () => {
    const { project, history } = get();
    const result = project && ops.redo(history, docOf(project));
    if (!project || !result) return;
    set((s) => ({
      project: { ...project, ...result.doc, updatedAt: Date.now() },
      history: result.history,
      selectedId: result.doc.layers.some((l) => l.id === s.selectedId) ? s.selectedId : null,
    }));
  },
  setThumbnail: (thumbnail) => set((s) => (s.project ? { project: { ...s.project, thumbnail } } : {})),
}));

// Autosave the open project shortly after it changes.
let saveTimer: ReturnType<typeof setTimeout> | undefined;
useComposer.subscribe((state, previous) => {
  if (!state.project || state.project === previous.project) return;
  clearTimeout(saveTimer);
  const project = state.project;
  saveTimer = setTimeout(() => void saveProject(useComposer.getState().project ?? project), 600);
});

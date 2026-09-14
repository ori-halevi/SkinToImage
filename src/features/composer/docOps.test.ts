import { describe, expect, it } from 'vitest';
import {
  addLayer,
  bakeTextScale,
  createImageLayer,
  createTextLayer,
  duplicateLayer,
  emptyDoc,
  emptyHistory,
  MERGE_WINDOW_MS,
  recordChange,
  redo,
  removeLayer,
  reorderLayer,
  resizeCanvas,
  undo,
  updateLayer,
} from './docOps';

const asset = { assetId: 'a1', width: 500, height: 1000, label: 'Wave' };

describe('layers', () => {
  it('places images centered at 80% of the canvas height', () => {
    const doc = emptyDoc('youtube');
    const layer = createImageLayer(doc, asset);
    expect(layer.x).toBe(640);
    expect(layer.y).toBe(360);
    expect(layer.height * layer.scaleY).toBeCloseTo(576);
  });

  it('keeps wide images inside the canvas width', () => {
    const layer = createImageLayer(emptyDoc('shorts'), { ...asset, width: 3000, height: 1000 });
    expect(layer.width * layer.scaleX).toBeLessThanOrEqual(1080 * 0.9 + 1e-6);
  });

  it('adds, updates, duplicates, reorders and removes', () => {
    let doc = emptyDoc();
    const a = createImageLayer(doc, asset);
    doc = addLayer(doc, a);
    const t = createTextLayer(doc, 'WOW');
    doc = addLayer(doc, t);
    doc = updateLayer(doc, t.id, { text: 'OMG' });
    expect((doc.layers[1] as typeof t).text).toBe('OMG');

    const dup = duplicateLayer(doc, a.id);
    expect(dup.doc.layers.map((l) => l.id)).toEqual([a.id, dup.id, t.id]);
    expect(dup.doc.layers[1].x).toBeGreaterThan(a.x);

    doc = reorderLayer(dup.doc, a.id, 'top');
    expect(doc.layers.at(-1)!.id).toBe(a.id);
    doc = reorderLayer(doc, a.id, 'down');
    expect(doc.layers.at(-2)!.id).toBe(a.id);
    doc = reorderLayer(doc, a.id, 'bottom');
    expect(doc.layers[0].id).toBe(a.id);

    doc = removeLayer(doc, a.id);
    expect(doc.layers.map((l) => l.id)).toEqual([dup.id, t.id]);
  });
});

describe('resizeCanvas', () => {
  it('keeps relative positions and scales sizes by the smaller ratio', () => {
    let doc = emptyDoc('youtube');
    const image = createImageLayer(doc, asset);
    const text = createTextLayer(doc, 'Hi');
    doc = addLayer(addLayer(doc, image), text);
    const resized = resizeCanvas(doc, 'shorts'); // 1280×720 → 1080×1920
    const [img, txt] = resized.layers;
    expect(img.x).toBeCloseTo(540);
    expect(img.y).toBeCloseTo(960);
    expect(img.scaleX).toBeCloseTo(image.scaleX * (1080 / 1280));
    expect(txt.type === 'text' && txt.fontSize).toBeCloseTo(text.fontSize * (1080 / 1280));
  });
});

describe('bakeTextScale', () => {
  it('folds scale into font size and stroke, keeping flips', () => {
    const text = { ...createTextLayer(emptyDoc(), 'Hi'), fontSize: 100, strokeWidth: 10, scaleX: -2, scaleY: 2 };
    const baked = bakeTextScale(text);
    expect(baked.fontSize).toBe(200);
    expect(baked.strokeWidth).toBe(20);
    expect([baked.scaleX, baked.scaleY]).toEqual([-1, 1]);
  });
});

describe('history', () => {
  const d0 = emptyDoc();
  const d1 = { ...d0, width: 1 };
  const d2 = { ...d0, width: 2 };

  it('undoes and redoes', () => {
    let h = recordChange(emptyHistory(), d0, undefined, 0);
    h = recordChange(h, d1, undefined, 10);
    const u = undo(h, d2)!;
    expect(u.doc).toBe(d1);
    const r = redo(u.history, u.doc)!;
    expect(r.doc).toBe(d2);
    expect(undo(emptyHistory(), d0)).toBeNull();
  });

  it('merges rapid edits with the same tag into one step', () => {
    let h = recordChange(emptyHistory(), d0, 'text:1', 0);
    h = recordChange(h, d1, 'text:1', 100);
    expect(h.past).toHaveLength(1);
    h = recordChange(h, d2, 'text:1', 100 + MERGE_WINDOW_MS + 1);
    expect(h.past).toHaveLength(2);
    h = recordChange(h, d0, 'color:1', 100 + MERGE_WINDOW_MS + 2);
    expect(h.past).toHaveLength(3);
  });
});

import type Konva from 'konva';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Image as KonvaImage, Layer as KonvaLayer, Line, Stage, Text as KonvaText, Transformer } from 'react-konva';
import { paintBackground } from '../../render/postprocess/frame';
import { bakeTextScale } from './docOps';
import { FONTS, loadFonts } from './fonts';
import { loadAssetImage } from './storage';
import { useComposer } from './store';
import type { ImageLayer, Layer, TextLayer } from './types';

/** The live stage, for exports and thumbnails. */
export const stageHandle: { stage: Konva.Stage | null; scale: number } = { stage: null, scale: 1 };

/** Loads an asset image (null while loading or missing). */
export function useAssetImage(assetId: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!assetId) return setImage(null);
    let cancelled = false;
    loadAssetImage(assetId).then(
      (img) => !cancelled && setImage(img),
      () => !cancelled && setImage(null),
    );
    return () => {
      cancelled = true;
    };
  }, [assetId]);
  return image;
}

const SNAP_PX = 10;

export function CanvasStage({ maxHeight }: { maxHeight: number }) {
  const project = useComposer((s) => s.project)!;
  const selectedId = useComposer((s) => s.selectedId);
  const select = useComposer((s) => s.select);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [guides, setGuides] = useState({ v: false, h: false });
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    void loadFonts().then(() => setFontsReady(true));
  }, []);

  useLayoutEffect(() => {
    const el = containerRef.current!;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(el);
    setContainerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const { width, height } = project;
  const scale = Math.max(0.05, Math.min(containerWidth / width, maxHeight / height));
  stageHandle.scale = scale;

  useEffect(() => {
    stageHandle.stage = stageRef.current;
    return () => {
      stageHandle.stage = null;
    };
  }, []);

  // Attach the transformer to the selected node.
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;
    const node = selectedId ? stage.findOne(`#layer-${selectedId}`) : null;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, project.layers, fontsReady]);

  const backgroundImage = useAssetImage(project.background.type === 'image' ? project.background.imageId : null);
  const backgroundCanvas = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    paintBackground(ctx, project.background, width, height, { x: width / 2, y: height * 0.45 }, () => backgroundImage ?? undefined);
    return canvas;
  }, [project.background, width, height, backgroundImage]);

  const snap = (node: Konva.Node) => {
    const threshold = SNAP_PX / scale;
    const v = Math.abs(node.x() - width / 2) < threshold;
    const h = Math.abs(node.y() - height / 2) < threshold;
    if (v) node.x(width / 2);
    if (h) node.y(height / 2);
    if (v !== guides.v || h !== guides.h) setGuides({ v, h });
  };

  const common = (layer: Layer) => ({
    id: `layer-${layer.id}`,
    x: layer.x,
    y: layer.y,
    rotation: layer.rotation,
    scaleX: layer.scaleX,
    scaleY: layer.scaleY,
    opacity: layer.opacity,
    draggable: true,
    onMouseDown: () => select(layer.id),
    onTouchStart: () => select(layer.id),
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => snap(e.target),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      setGuides({ v: false, h: false });
      useComposer.getState().updateLayer(layer.id, { x: e.target.x(), y: e.target.y() });
    },
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const patch = { x: node.x(), y: node.y(), rotation: node.rotation(), scaleX: node.scaleX(), scaleY: node.scaleY() };
      if (layer.type === 'text') {
        const baked = bakeTextScale({ ...layer, ...patch });
        // Reset the node's scale now so the new font size doesn't get the old scale applied on top.
        node.scaleX(baked.scaleX);
        node.scaleY(baked.scaleY);
        useComposer.getState().updateLayer(layer.id, baked);
      } else {
        useComposer.getState().updateLayer(layer.id, patch);
      }
    },
  });

  return (
    <div ref={containerRef} className="flex w-full justify-center">
      <Stage
        ref={stageRef}
        width={Math.round(width * scale)}
        height={Math.round(height * scale)}
        scaleX={scale}
        scaleY={scale}
        className="checker overflow-hidden rounded-lg shadow-lg"
        onMouseDown={(e) => e.target === e.target.getStage() && select(null)}
        onTouchStart={(e) => e.target === e.target.getStage() && select(null)}
      >
        <KonvaLayer listening={false}>
          <KonvaImage image={backgroundCanvas} width={width} height={height} />
        </KonvaLayer>
        <KonvaLayer>
          {project.layers.map((layer) =>
            layer.type === 'image' ? (
              <ImageNode key={layer.id} layer={layer} common={common(layer)} />
            ) : (
              <TextNode key={layer.id} layer={layer} common={common(layer)} fontsReady={fontsReady} />
            ),
          )}
        </KonvaLayer>
        <KonvaLayer name="editor-ui">
          {guides.v && <Line points={[width / 2, 0, width / 2, height]} stroke="#ff2e88" strokeWidth={2 / scale} dash={[8 / scale, 6 / scale]} listening={false} />}
          {guides.h && <Line points={[0, height / 2, width, height / 2]} stroke="#ff2e88" strokeWidth={2 / scale} dash={[8 / scale, 6 / scale]} listening={false} />}
          <Transformer
            ref={transformerRef}
            rotateAnchorOffset={24}
            anchorSize={12}
            anchorCornerRadius={3}
            borderStroke="#5fb04a"
            anchorStroke="#5fb04a"
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            keepRatio
            boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 12 || Math.abs(newBox.height) < 12 ? oldBox : newBox)}
          />
        </KonvaLayer>
      </Stage>
    </div>
  );
}

type CommonProps = Konva.NodeConfig & Record<string, unknown>;

/** Konva filter: every pixel black, alpha untouched. */
function blackFilter(imageData: ImageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 0;
}

function ImageNode({ layer, common }: { layer: ImageLayer; common: CommonProps }) {
  const image = useAssetImage(layer.assetId);
  const ref = useRef<Konva.Image>(null);
  // Shadows are drawn in the node's own space, so undo the layer's scale to keep the glow's
  // size in canvas pixels.
  const glowScale = (Math.abs(layer.scaleX) + Math.abs(layer.scaleY)) / 2 || 1;
  const glow = layer.glow?.enabled ? layer.glow : null;

  // Filters only apply to cached nodes; cache at the image's natural size so exports stay sharp.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (layer.silhouette) {
      node.cache({ pixelRatio: 1 });
      node.filters([blackFilter]);
    } else {
      node.filters([]);
      node.clearCache();
    }
    node.getLayer()?.batchDraw();
  }, [layer.silhouette, image]);


  if (!image) return null;
  return (
    <KonvaImage
      ref={ref}
      {...common}
      image={image}
      width={layer.width}
      height={layer.height}
      offsetX={layer.width / 2}
      offsetY={layer.height / 2}
      shadowEnabled={!!glow}
      shadowColor={glow?.color}
      shadowBlur={glow ? glow.size / glowScale : 0}
      shadowOpacity={glow?.strength ?? 1}
      shadowOffset={{ x: 0, y: 0 }}
    />
  );
}

function TextNode({ layer, common, fontsReady }: { layer: TextLayer; common: CommonProps; fontsReady: boolean }) {
  const ref = useRef<Konva.Text>(null);
  const font = FONTS[layer.font];

  // Keep the text centered on (x, y): its size is only known after Konva measures it.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.offsetX(node.width() / 2);
    node.offsetY(node.height() / 2);
    node.getLayer()?.batchDraw();
  }, [layer.text, layer.fontSize, layer.font, layer.align, layer.strokeWidth, fontsReady]);

  return (
    <KonvaText
      ref={ref}
      {...common}
      text={layer.text}
      fontFamily={font.family}
      fontStyle={font.weight}
      fontSize={layer.fontSize}
      lineHeight={1.05}
      align={layer.align}
      fill={layer.fill}
      stroke={layer.stroke}
      // The fill is painted over the inner half of the stroke, so double it for the visible outline width.
      strokeWidth={layer.strokeWidth * 2}
      fillAfterStrokeEnabled
      lineJoin="round"
      shadowEnabled={layer.shadow}
      shadowColor="rgba(0,0,0,0.55)"
      shadowBlur={layer.fontSize * 0.08}
      shadowOffsetX={layer.fontSize * 0.04}
      shadowOffsetY={layer.fontSize * 0.06}
      padding={layer.strokeWidth}
    />
  );
}

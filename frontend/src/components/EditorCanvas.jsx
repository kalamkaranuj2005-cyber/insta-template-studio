import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text, Image as KImage, Transformer } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { useEditorStore } from '../store/editorStore.js';

function fitScale(canvasW, canvasH, paneW, paneH) {
  const s = Math.min(paneW / canvasW, paneH / canvasH);
  return Math.min(s, 1);
}

function ImageLayer({ layer, onSelect, onChange, registerRef }) {
  const [img] = useImage(layer.src, 'anonymous');
  const filters = useMemo(() => {
    const out = [];
    if ((layer.filters?.brightness ?? 1) !== 1) out.push(Konva.Filters.Brighten);
    if ((layer.filters?.contrast ?? 1) !== 1) out.push(Konva.Filters.Contrast);
    if ((layer.filters?.blur ?? 0) !== 0) out.push(Konva.Filters.Blur);
    return out;
  }, [layer.filters]);

  const localRef = useRef(null);

  useEffect(() => {
    if (localRef.current && img) {
      localRef.current.cache();
      localRef.current.getLayer()?.batchDraw();
    }
  }, [img, layer.filters, layer.width, layer.height]);

  return (
    <KImage
      ref={(node) => {
        localRef.current = node;
        registerRef(node);
      }}
      image={img}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation || 0}
      opacity={layer.opacity ?? 1}
      draggable={!layer.locked}
      visible={!layer.hidden}
      filters={filters}
      brightness={(layer.filters?.brightness ?? 1) - 1}
      contrast={((layer.filters?.contrast ?? 1) - 1) * 100}
      blurRadius={layer.filters?.blur ?? 0}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(10, node.width() * scaleX),
          height: Math.max(10, node.height() * scaleY),
          rotation: node.rotation(),
        });
      }}
    />
  );
}

function VideoLayer({ layer, onSelect, onChange, registerRef }) {
  const [video, setVideo] = useState(null);
  const localRef = useRef(null);

  useEffect(() => {
    const el = document.createElement('video');
    el.src = layer.src;
    el.crossOrigin = 'anonymous';
    el.loop = true;
    el.muted = true;
    el.playsInline = true;
    el.addEventListener('loadeddata', () => {
      setVideo(el);
      el.play().catch(() => {});
    });
    return () => {
      el.pause();
      el.removeAttribute('src');
      el.load();
    };
  }, [layer.src]);

  useEffect(() => {
    if (!video) return undefined;
    const anim = new Konva.Animation(() => {}, localRef.current?.getLayer());
    anim.start();
    return () => anim.stop();
  }, [video]);

  return (
    <KImage
      ref={(node) => {
        localRef.current = node;
        registerRef(node);
      }}
      image={video}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation || 0}
      opacity={layer.opacity ?? 1}
      draggable={!layer.locked}
      visible={!layer.hidden}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(10, node.width() * scaleX),
          height: Math.max(10, node.height() * scaleY),
          rotation: node.rotation(),
        });
      }}
    />
  );
}

export default function EditorCanvas() {
  const size = useEditorStore((s) => s.size);
  const doc = useEditorStore((s) => s.doc);
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);
  const updateLayer = useEditorStore((s) => s.updateLayer);

  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const shapeRefs = useRef({});

  const [pane, setPane] = useState({ w: 800, h: 600 });
  const containerRef = useRef(null);

  useEffect(() => {
    function update() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPane({ w: rect.width - 40, h: rect.height - 40 });
      }
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const scale = fitScale(size.width, size.height, pane.w, pane.h);

  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const node = selectedId ? shapeRefs.current[selectedId] : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, doc.layers]);

  useEffect(() => {
    window.__editorStage = stageRef.current;
  });

  const registerRef = (id) => (node) => {
    if (node) shapeRefs.current[id] = node;
    else delete shapeRefs.current[id];
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          fontSize: 11,
          color: 'var(--text-dim)',
        }}
      >
        {size.width}×{size.height} · zoom {Math.round(scale * 100)}%
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          background: doc.background,
          width: size.width * scale,
          height: size.height * scale,
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
          borderRadius: 4,
        }}
      >
        <Stage
          ref={stageRef}
          width={size.width * scale}
          height={size.height * scale}
          scaleX={scale}
          scaleY={scale}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) select(null);
          }}
          onTouchStart={(e) => {
            if (e.target === e.target.getStage()) select(null);
          }}
        >
          <Layer>
            {doc.layers.map((layer) => {
              if (layer.type === 'rect') {
                return (
                  <Rect
                    key={layer.id}
                    ref={registerRef(layer.id)}
                    x={layer.x}
                    y={layer.y}
                    width={layer.width}
                    height={layer.height}
                    fill={layer.fill}
                    rotation={layer.rotation || 0}
                    opacity={layer.opacity ?? 1}
                    visible={!layer.hidden}
                    draggable={!layer.locked}
                    onClick={() => select(layer.id)}
                    onTap={() => select(layer.id)}
                    onDragEnd={(e) =>
                      updateLayer(layer.id, { x: e.target.x(), y: e.target.y() })
                    }
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const sx = node.scaleX();
                      const sy = node.scaleY();
                      node.scaleX(1);
                      node.scaleY(1);
                      updateLayer(layer.id, {
                        x: node.x(),
                        y: node.y(),
                        width: Math.max(5, node.width() * sx),
                        height: Math.max(5, node.height() * sy),
                        rotation: node.rotation(),
                      });
                    }}
                  />
                );
              }
              if (layer.type === 'text') {
                return (
                  <Text
                    key={layer.id}
                    ref={registerRef(layer.id)}
                    x={layer.x}
                    y={layer.y}
                    text={layer.text || ''}
                    fontSize={layer.fontSize || 32}
                    fontFamily={layer.fontFamily || 'Inter'}
                    fontStyle={layer.fontStyle || 'normal'}
                    fill={layer.fill || '#ffffff'}
                    align={layer.align || 'left'}
                    width={layer.width || undefined}
                    rotation={layer.rotation || 0}
                    opacity={layer.opacity ?? 1}
                    visible={!layer.hidden}
                    draggable={!layer.locked}
                    onClick={() => select(layer.id)}
                    onTap={() => select(layer.id)}
                    onDragEnd={(e) =>
                      updateLayer(layer.id, { x: e.target.x(), y: e.target.y() })
                    }
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const sx = node.scaleX();
                      const sy = node.scaleY();
                      node.scaleX(1);
                      node.scaleY(1);
                      updateLayer(layer.id, {
                        x: node.x(),
                        y: node.y(),
                        width: Math.max(20, (node.width() || 200) * sx),
                        fontSize: Math.max(8, (layer.fontSize || 32) * sy),
                        rotation: node.rotation(),
                      });
                    }}
                  />
                );
              }
              if (layer.type === 'image') {
                return (
                  <ImageLayer
                    key={layer.id}
                    layer={layer}
                    onSelect={() => select(layer.id)}
                    onChange={(patch) => updateLayer(layer.id, patch)}
                    registerRef={registerRef(layer.id)}
                  />
                );
              }
              if (layer.type === 'video') {
                return (
                  <VideoLayer
                    key={layer.id}
                    layer={layer}
                    onSelect={() => select(layer.id)}
                    onChange={(patch) => updateLayer(layer.id, patch)}
                    registerRef={registerRef(layer.id)}
                  />
                );
              }
              return null;
            })}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) =>
                newBox.width < 10 || newBox.height < 10 ? oldBox : newBox
              }
              rotateEnabled
            />
          </Layer>
        </Stage>
      </div>
    </div>
  );
}

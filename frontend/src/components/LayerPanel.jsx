import React from 'react';
import { useEditorStore } from '../store/editorStore.js';

const labelFor = (l) => {
  if (l.type === 'text') return l.text?.slice(0, 24) || 'Text';
  if (l.type === 'rect') return 'Shape';
  if (l.type === 'image') return 'Image';
  if (l.type === 'video') return 'Video';
  return l.type;
};

export default function LayerPanel() {
  const layers = useEditorStore((s) => s.doc.layers);
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);
  const remove = useEditorStore((s) => s.removeLayer);
  const reorder = useEditorStore((s) => s.reorderLayer);
  const toggleLock = useEditorStore((s) => s.toggleLock);
  const toggleVisible = useEditorStore((s) => s.toggleVisible);
  const addLayer = useEditorStore((s) => s.addLayer);
  const size = useEditorStore((s) => s.size);

  function addText() {
    addLayer({
      type: 'text',
      x: size.width / 2 - 200,
      y: size.height / 2 - 30,
      text: 'New text',
      fontSize: 64,
      fontFamily: 'Inter',
      fill: '#ffffff',
      width: 400,
      rotation: 0,
    });
  }
  function addRect() {
    addLayer({
      type: 'rect',
      x: size.width / 2 - 150,
      y: size.height / 2 - 75,
      width: 300,
      height: 150,
      fill: '#f43f5e',
      opacity: 1,
      rotation: 0,
    });
  }

  return (
    <div className="section">
      <h3>Layers</h3>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="btn" onClick={addText}>+ Text</button>
        <button className="btn" onClick={addRect}>+ Shape</button>
      </div>
      <div className="scroll-area">
        {[...layers].reverse().map((l) => (
          <div
            key={l.id}
            className={`layer-row ${selectedId === l.id ? 'selected' : ''}`}
            onClick={() => select(l.id)}
          >
            <span className="layer-name">{labelFor(l)}</span>
            <button
              onClick={(e) => { e.stopPropagation(); toggleVisible(l.id); }}
              title={l.hidden ? 'Show' : 'Hide'}
            >
              {l.hidden ? '◌' : '●'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleLock(l.id); }}
              title={l.locked ? 'Unlock' : 'Lock'}
            >
              {l.locked ? '🔒' : '🔓'}
            </button>
            <button onClick={(e) => { e.stopPropagation(); reorder(l.id, 'up'); }} title="Up">↑</button>
            <button onClick={(e) => { e.stopPropagation(); reorder(l.id, 'down'); }} title="Down">↓</button>
            <button
              onClick={(e) => { e.stopPropagation(); remove(l.id); }}
              className="btn-danger"
              title="Delete"
            >×</button>
          </div>
        ))}
        {layers.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            No layers yet. Add text or shapes, or load a preset.
          </div>
        )}
      </div>
    </div>
  );
}

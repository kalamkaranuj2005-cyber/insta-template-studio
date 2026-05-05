import React, { useState } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import { saveTemplate, deleteTemplate } from '../utils/api.js';

export default function PresetPanel({ presets, templates, onTemplatesChanged }) {
  const loadPreset = useEditorStore((s) => s.loadPreset);
  const setDoc = useEditorStore((s) => s.setDoc);
  const setSize = useEditorStore((s) => s.setSize);
  const doc = useEditorStore((s) => s.doc);
  const size = useEditorStore((s) => s.size);
  const [savingName, setSavingName] = useState('');

  async function handleSave() {
    const name = savingName.trim() || `Template ${new Date().toLocaleString()}`;
    await saveTemplate(name, { ...doc, _size: size });
    setSavingName('');
    onTemplatesChanged?.();
  }

  function handleLoad(tpl) {
    if (tpl.doc?._size) setSize(tpl.doc._size);
    const { _size, ...docOnly } = tpl.doc || {};
    setDoc(docOnly);
  }

  async function handleDelete(id) {
    await deleteTemplate(id);
    onTemplatesChanged?.();
  }

  return (
    <>
      <div className="section">
        <h3>Presets</h3>
        <div className="preset-grid">
          {presets.map((p) => (
            <button key={p.id} className="preset-card" onClick={() => loadPreset(p)}>
              <div className="preset-name">{p.name}</div>
              <div className="preset-meta">
                {p.size?.width}×{p.size?.height}
              </div>
            </button>
          ))}
          {presets.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              No presets loaded.
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <h3>My templates</h3>
        <div className="row" style={{ marginBottom: 8 }}>
          <input
            className="field"
            placeholder="Template name"
            value={savingName}
            onChange={(e) => setSavingName(e.target.value)}
            style={{
              background: 'var(--panel-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: '8px 10px',
              borderRadius: 6,
              fontSize: 13,
            }}
          />
          <button className="btn" onClick={handleSave}>Save</button>
        </div>
        <div className="scroll-area">
          {templates.map((t) => (
            <div key={t.id} className="layer-row">
              <span className="layer-name" title={t.name}>{t.name}</span>
              <button onClick={() => handleLoad(t)} title="Load">↺</button>
              <button onClick={() => handleDelete(t.id)} title="Delete" className="btn-danger">
                ×
              </button>
            </div>
          ))}
          {templates.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Saved templates appear here.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

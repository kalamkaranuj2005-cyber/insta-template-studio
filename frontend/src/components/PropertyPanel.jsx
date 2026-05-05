import React, { useRef } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import { uploadFile } from '../utils/api.js';

const FONTS = [
  'Inter',
  'Playfair Display',
  'Georgia',
  'Arial',
  'Times New Roman',
  'Courier New',
];

export default function PropertyPanel() {
  const layers = useEditorStore((s) => s.doc.layers);
  const selectedId = useEditorStore((s) => s.selectedId);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const setBackground = useEditorStore((s) => s.setBackground);
  const setSize = useEditorStore((s) => s.setSize);
  const size = useEditorStore((s) => s.size);
  const background = useEditorStore((s) => s.doc.background);
  const fileRef = useRef(null);

  const layer = layers.find((l) => l.id === selectedId);

  async function handleReplaceMedia(e) {
    const file = e.target.files?.[0];
    if (!file || !layer) return;
    const result = await uploadFile(file);
    updateLayer(layer.id, {
      type: result.mediaType === 'video' ? 'video' : 'image',
      src: result.publicUrl,
    });
    e.target.value = '';
  }

  if (!layer) {
    return (
      <div className="section">
        <h3>Canvas</h3>
        <div className="field">
          <label>Background</label>
          <input
            type="color"
            value={background || '#000000'}
            onChange={(e) => setBackground(e.target.value)}
          />
        </div>
        <div className="row">
          <div className="field">
            <label>Width</label>
            <input
              type="number"
              value={size.width}
              onChange={(e) =>
                setSize({ ...size, width: parseInt(e.target.value, 10) || size.width })
              }
            />
          </div>
          <div className="field">
            <label>Height</label>
            <input
              type="number"
              value={size.height}
              onChange={(e) =>
                setSize({ ...size, height: parseInt(e.target.value, 10) || size.height })
              }
            />
          </div>
        </div>
        <div className="note">Select a layer to edit it.</div>
      </div>
    );
  }

  const numField = (key, label, opts = {}) => (
    <div className="field" key={key}>
      <label>{label}</label>
      <input
        type="number"
        value={layer[key] ?? 0}
        step={opts.step ?? 1}
        onChange={(e) =>
          updateLayer(layer.id, { [key]: parseFloat(e.target.value) || 0 })
        }
      />
    </div>
  );

  return (
    <div className="section">
      <h3>Properties — {layer.type}</h3>

      <div className="row">
        {numField('x', 'X')}
        {numField('y', 'Y')}
      </div>
      <div className="row">
        {numField('width', 'W')}
        {numField('height', 'H')}
      </div>
      <div className="row">
        {numField('rotation', '↻')}
        <div className="field">
          <label>Opacity</label>
          <input
            type="range"
            min="0" max="1" step="0.05"
            value={layer.opacity ?? 1}
            onChange={(e) =>
              updateLayer(layer.id, { opacity: parseFloat(e.target.value) })
            }
          />
        </div>
      </div>

      {layer.type === 'text' && (
        <>
          <div className="field">
            <label>Text</label>
            <textarea
              rows={2}
              value={layer.text || ''}
              onChange={(e) => updateLayer(layer.id, { text: e.target.value })}
            />
          </div>
          <div className="row">
            <div className="field">
              <label>Font size</label>
              <input
                type="number"
                value={layer.fontSize || 32}
                onChange={(e) =>
                  updateLayer(layer.id, { fontSize: parseInt(e.target.value, 10) || 32 })
                }
              />
            </div>
            <div className="field">
              <label>Font</label>
              <select
                value={layer.fontFamily || 'Inter'}
                onChange={(e) => updateLayer(layer.id, { fontFamily: e.target.value })}
              >
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Color</label>
              <input
                type="color"
                value={layer.fill || '#ffffff'}
                onChange={(e) => updateLayer(layer.id, { fill: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Style</label>
              <select
                value={layer.fontStyle || 'normal'}
                onChange={(e) => updateLayer(layer.id, { fontStyle: e.target.value })}
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="italic">Italic</option>
                <option value="bold italic">Bold italic</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Align</label>
            <select
              value={layer.align || 'left'}
              onChange={(e) => updateLayer(layer.id, { align: e.target.value })}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </>
      )}

      {layer.type === 'rect' && (
        <div className="field">
          <label>Fill</label>
          <input
            type="color"
            value={layer.fill || '#ffffff'}
            onChange={(e) => updateLayer(layer.id, { fill: e.target.value })}
          />
        </div>
      )}

      {(layer.type === 'image' || layer.type === 'video') && (
        <>
          <button
            className="btn"
            style={{ width: '100%', marginBottom: 8 }}
            onClick={() => fileRef.current?.click()}
          >
            Replace media
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={handleReplaceMedia}
          />
          <div className="field">
            <label>Brightness</label>
            <input
              type="range" min="0" max="2" step="0.05"
              value={layer.filters?.brightness ?? 1}
              onChange={(e) =>
                updateLayer(layer.id, {
                  filters: { ...(layer.filters || {}), brightness: parseFloat(e.target.value) },
                })
              }
            />
          </div>
          <div className="field">
            <label>Contrast</label>
            <input
              type="range" min="0" max="2" step="0.05"
              value={layer.filters?.contrast ?? 1}
              onChange={(e) =>
                updateLayer(layer.id, {
                  filters: { ...(layer.filters || {}), contrast: parseFloat(e.target.value) },
                })
              }
            />
          </div>
          <div className="field">
            <label>Blur</label>
            <input
              type="range" min="0" max="20" step="0.5"
              value={layer.filters?.blur ?? 0}
              onChange={(e) =>
                updateLayer(layer.id, {
                  filters: { ...(layer.filters || {}), blur: parseFloat(e.target.value) },
                })
              }
            />
          </div>
          <div className="field">
            <label>Tint (overlay color)</label>
            <input
              type="color"
              value={layer.tint || '#000000'}
              onChange={(e) => updateLayer(layer.id, { tint: e.target.value })}
            />
            <input
              type="range" min="0" max="1" step="0.05"
              value={layer.tintAlpha ?? 0}
              onChange={(e) =>
                updateLayer(layer.id, { tintAlpha: parseFloat(e.target.value) })
              }
            />
          </div>
        </>
      )}
    </div>
  );
}

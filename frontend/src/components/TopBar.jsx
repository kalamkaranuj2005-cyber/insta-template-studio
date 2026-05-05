import React from 'react';
import { useEditorStore } from '../store/editorStore.js';

export default function TopBar({ onExportClick }) {
  const watermarkEnabled = useEditorStore((s) => s.watermarkEnabled);
  const setWatermarkEnabled = useEditorStore((s) => s.setWatermarkEnabled);

  return (
    <header className="topbar">
      <div className="brand">Insta Template Studio</div>
      <div className="actions">
        <label
          style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', gap: 6 }}
          title="Free tier exports include a small watermark"
        >
          <input
            type="checkbox"
            checked={watermarkEnabled}
            onChange={(e) => setWatermarkEnabled(e.target.checked)}
          />
          Watermark
        </label>
        <button className="btn-primary btn" onClick={onExportClick}>
          Export
        </button>
      </div>
    </header>
  );
}

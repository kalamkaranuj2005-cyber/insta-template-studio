import React from 'react';
import { useEditorStore } from '../store/editorStore.js';

export default function MediaPreview({ source }) {
  const analysis = useEditorStore((s) => s.analysis);
  const setBackground = useEditorStore((s) => s.setBackground);

  return (
    <div className="section">
      <h3>Style reference</h3>
      <div className="preview-card">
        {source.mediaType === 'video' ? (
          <video src={source.publicUrl} controls muted loop />
        ) : (
          <img src={source.publicUrl} alt="source media" />
        )}
        <div className="meta">
          method: <code>{source.method}</code>
          {source.author ? <> · {source.author}</> : null}
        </div>

        {analysis && (
          <>
            <div className="palette-row" title="Click a swatch to use as background">
              {(analysis.palette || []).map((p) => (
                <button
                  key={p.hex}
                  className="palette-swatch"
                  style={{ background: p.hex }}
                  title={`${p.hex} (${Math.round(p.weight * 100)}%)`}
                  onClick={() => setBackground(p.hex)}
                />
              ))}
            </div>
            <div className="meta" style={{ marginTop: 8 }}>
              layout: <code>{analysis.layout?.layoutHint}</code>
              {' · '}
              text bands: <code>{analysis.textRegions?.length || 0}</code>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import { exportStageAsImage, exportOverlayPng, downloadDataUrl } from '../utils/exportImage.js';
import { exportVideo } from '../utils/api.js';

const WATERMARK_TEXT = 'Insta Template Studio';

export default function ExportMenu({ onClose }) {
  const watermarkEnabled = useEditorStore((s) => s.watermarkEnabled);
  const size = useEditorStore((s) => s.size);
  const layers = useEditorStore((s) => s.doc.layers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const videoLayer = layers.find((l) => l.type === 'video');

  async function handleImage(format) {
    setBusy(true); setError('');
    try {
      const wm = watermarkEnabled ? WATERMARK_TEXT : null;
      const dataUrl = await Promise.resolve(
        exportStageAsImage({ format, watermark: wm })
      );
      downloadDataUrl(dataUrl, `template-${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`);
    } catch (e) {
      setError(e.message || 'Image export failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVideo() {
    if (!videoLayer) {
      setError('Add a video layer to export an MP4.');
      return;
    }
    setBusy(true); setError('');
    try {
      const overlay = exportOverlayPng();
      const sourceFilename = videoLayer.src.split('/').pop();
      const result = await exportVideo({
        sourceFilename,
        overlayDataUrl: overlay,
        width: size.width,
        height: size.height,
        watermark: watermarkEnabled ? WATERMARK_TEXT : false,
      });
      setResult(result);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Video export failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Export</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          {watermarkEnabled
            ? 'Free-tier exports include a small watermark. Disable in the top bar to remove.'
            : 'Watermark disabled.'}
        </p>

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" disabled={busy} onClick={() => handleImage('png')}>
            PNG
          </button>
          <button className="btn" disabled={busy} onClick={() => handleImage('jpeg')}>
            JPEG
          </button>
          <button
            className="btn"
            disabled={busy || !videoLayer}
            onClick={handleVideo}
            title={videoLayer ? 'Server-side FFmpeg render' : 'Add a video layer first'}
          >
            MP4 (video)
          </button>
        </div>

        {busy && <div className="note" style={{ marginTop: 12 }}>Rendering…</div>}
        {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
        {result && (
          <div className="note" style={{ marginTop: 12 }}>
            Done. <a href={result.publicUrl} target="_blank" rel="noreferrer">Download MP4</a>
          </div>
        )}

        <div className="actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

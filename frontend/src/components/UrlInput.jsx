import React, { useRef, useState } from 'react';
import {
  extractFromInstagram,
  uploadFile,
  analyzeMedia,
} from '../utils/api.js';
import { useEditorStore } from '../store/editorStore.js';

export default function UrlInput() {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const setSource = useEditorStore((s) => s.setSource);
  const setAnalysis = useEditorStore((s) => s.setAnalysis);
  const seedFromAnalysis = useEditorStore((s) => s.seedFromAnalysis);

  async function handleAnalyze(source) {
    try {
      const analysis = await analyzeMedia(source.filename, source.mediaType);
      setAnalysis(analysis);
      seedFromAnalysis(analysis, source.publicUrl, source.mediaType);
    } catch (e) {
      // analysis is best-effort; editor still works without it.
      console.warn('analysis failed', e);
    }
  }

  async function handleExtract(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const source = await extractFromInstagram(url.trim());
      setSource(source);
      await handleAnalyze(source);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'Extraction failed. Try the upload fallback.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const source = await uploadFile(file);
      setSource(source);
      await handleAnalyze(source);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <div className="section">
      <h3>Source media</h3>
      <form onSubmit={handleExtract}>
        <div className="field">
          <label>Public Instagram URL</label>
          <input
            type="url"
            placeholder="https://www.instagram.com/p/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || !url}>
          {busy ? 'Working…' : 'Extract & Analyze'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <button
        className="btn"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        style={{ width: '100%' }}
      >
        Upload image / video
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
      <div className="note">
        Templates are <strong>style-inspired</strong>, not copies. Your export is your
        responsibility — don't redistribute copyrighted source media.
      </div>
    </div>
  );
}

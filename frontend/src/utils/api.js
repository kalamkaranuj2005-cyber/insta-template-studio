import axios from 'axios';

// In production, point to a separate backend (e.g. Render). In dev, leave empty
// so Vite's proxy handles /api and /static.
export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 60000,
});

/**
 * Resolve a /static/... path returned by the backend into a full URL the
 * browser can fetch. In dev it stays relative (Vite proxy); in prod it gets
 * the absolute API base prefixed.
 */
export function mediaUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

function withAbsoluteMedia(data) {
  if (data && data.publicUrl) {
    return { ...data, publicUrl: mediaUrl(data.publicUrl) };
  }
  return data;
}

export async function extractFromInstagram(url) {
  const { data } = await api.post('/instagram/extract', { url });
  return withAbsoluteMedia(data);
}

export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return withAbsoluteMedia(data);
}

export async function analyzeMedia(filename, mediaType) {
  const { data } = await api.post('/analyze', { filename, mediaType });
  return data;
}

export async function exportVideo(payload) {
  const { data } = await api.post('/export/video', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return withAbsoluteMedia(data);
}

export async function listPresets() {
  const { data } = await api.get('/presets');
  return data;
}

export async function listTemplates() {
  const { data } = await api.get('/templates');
  return data;
}

export async function saveTemplate(name, doc) {
  const { data } = await api.post('/templates', { name, doc });
  return data;
}

export async function deleteTemplate(id) {
  const { data } = await api.delete(`/templates/${id}`);
  return data;
}

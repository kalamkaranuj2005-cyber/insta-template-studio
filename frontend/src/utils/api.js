import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export async function extractFromInstagram(url) {
  const { data } = await api.post('/instagram/extract', { url });
  return data;
}

export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function analyzeMedia(filename, mediaType) {
  const { data } = await api.post('/analyze', { filename, mediaType });
  return data;
}

export async function exportVideo(payload) {
  const { data } = await api.post('/export/video', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data;
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

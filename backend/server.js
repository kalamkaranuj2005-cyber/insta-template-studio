require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const instagramRoute = require('./routes/instagram');
const uploadRoute = require('./routes/upload');
const analyzeRoute = require('./routes/analyze');
const exportRoute = require('./routes/export');
const templatesRoute = require('./routes/templates');
const presetsRoute = require('./routes/presets');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5000;

const uploadDir = path.resolve(__dirname, process.env.UPLOAD_DIR || 'uploads');
const exportDir = path.resolve(__dirname, process.env.EXPORT_DIR || 'exports');
for (const dir of [uploadDir, exportDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/static/uploads', express.static(uploadDir));
app.use('/static/exports', express.static(exportDir));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'insta-template-studio', time: new Date().toISOString() });
});

app.use('/api/instagram', instagramRoute);
app.use('/api/upload', uploadRoute);
app.use('/api/analyze', analyzeRoute);
app.use('/api/export', exportRoute);
app.use('/api/templates', templatesRoute);
app.use('/api/presets', presetsRoute);

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../frontend/dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
}

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({
    error: err.publicMessage || err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`[insta-template-studio] backend listening on http://localhost:${PORT}`);
});

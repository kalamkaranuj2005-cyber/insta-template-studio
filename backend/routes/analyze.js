const path = require('path');
const fs = require('fs');
const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const { nanoid } = require('nanoid');
const { analyzeImage } = require('../services/analysisService');

const router = express.Router();
const uploadDir = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

function extractVideoFrame(videoPath) {
  return new Promise((resolve, reject) => {
    const framePath = path.join(uploadDir, `frame-${Date.now()}-${nanoid(4)}.png`);
    ffmpeg(videoPath)
      .on('end', () => resolve(framePath))
      .on('error', reject)
      .screenshots({
        timestamps: ['10%'],
        filename: path.basename(framePath),
        folder: uploadDir,
        size: '512x?',
      });
  });
}

router.post('/', async (req, res, next) => {
  try {
    const { filename, mediaType } = req.body || {};
    if (!filename) return res.status(400).json({ error: 'Missing "filename".' });

    const localPath = path.join(uploadDir, path.basename(filename));
    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ error: 'File not found on server.' });
    }

    let analysisTarget = localPath;
    let extractedFramePath = null;
    if (mediaType === 'video') {
      extractedFramePath = await extractVideoFrame(localPath);
      analysisTarget = extractedFramePath;
    }

    const analysis = await analyzeImage(analysisTarget);

    if (extractedFramePath) {
      fs.unlink(extractedFramePath, () => {});
    }

    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

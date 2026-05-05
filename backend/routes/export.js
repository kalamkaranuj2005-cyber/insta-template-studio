const path = require('path');
const fs = require('fs');
const express = require('express');
const { renderVideo } = require('../services/ffmpegService');

const router = express.Router();
const uploadDir = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

/**
 * Render a video export. Body:
 *   {
 *     sourceFilename: string  // file in uploads/
 *     overlayDataUrl?: string // base64 PNG of editor overlay (text/shapes)
 *     width?: number, height?: number,
 *     durationSec?: number,
 *     watermark?: boolean | string
 *   }
 */
router.post('/video', express.json({ limit: '20mb' }), async (req, res, next) => {
  try {
    const { sourceFilename, overlayDataUrl, width, height, durationSec, watermark } =
      req.body || {};
    if (!sourceFilename) {
      return res.status(400).json({ error: 'Missing "sourceFilename".' });
    }
    const sourcePath = path.join(uploadDir, path.basename(sourceFilename));
    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ error: 'Source file not found.' });
    }

    let overlayPath = null;
    if (overlayDataUrl && overlayDataUrl.startsWith('data:image/png;base64,')) {
      const buf = Buffer.from(overlayDataUrl.split(',')[1], 'base64');
      overlayPath = path.join(uploadDir, `overlay-${Date.now()}.png`);
      fs.writeFileSync(overlayPath, buf);
    }

    const wmText =
      watermark === true || (watermark === undefined && process.env.FREE_TIER_WATERMARK !== 'false')
        ? 'Insta Template Studio'
        : typeof watermark === 'string' && watermark.length > 0
        ? watermark
        : null;

    const { filename } = await renderVideo({
      sourcePath,
      overlayPath,
      options: { width, height, durationSec, watermark: wmText },
    });

    if (overlayPath) fs.unlink(overlayPath, () => {});

    res.json({
      filename,
      publicUrl: `/static/exports/${filename}`,
      watermark: !!wmText,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

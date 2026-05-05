const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { nanoid } = require('nanoid');

const exportDir = path.resolve(__dirname, '..', process.env.EXPORT_DIR || 'exports');

/**
 * Render a video export.
 *
 *   sourcePath  — input video file on disk
 *   overlayPath — flattened PNG of the editor's text/overlay layers (optional)
 *   options     — { width, height, durationSec, watermark }
 *
 * The pipeline builds ONE complex filter chain so scale, overlay and watermark
 * compose cleanly. Mixing -vf and -filter_complex (via fluent-ffmpeg's
 * .videoFilters() and .complexFilter()) produces an invalid command and was
 * the cause of silent export failures when both an overlay PNG and a
 * watermark were requested.
 */
function renderVideo({ sourcePath, overlayPath, options = {} }) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(sourcePath)) {
      return reject(new Error(`Source video not found: ${sourcePath}`));
    }
    const filename = `export-${Date.now()}-${nanoid(6)}.mp4`;
    const outPath = path.join(exportDir, filename);

    const command = ffmpeg(sourcePath);
    const hasOverlay = overlayPath && fs.existsSync(overlayPath);
    if (hasOverlay) command.input(overlayPath);

    const filters = [];
    let last = '0:v';
    let stepIdx = 0;
    const tag = (name) => `${name}${stepIdx++}`;

    if (options.width && options.height) {
      const sv = tag('sv');
      const pv = tag('pv');
      filters.push({
        filter: 'scale',
        options: {
          w: options.width,
          h: options.height,
          force_original_aspect_ratio: 'decrease',
        },
        inputs: last,
        outputs: sv,
      });
      filters.push({
        filter: 'pad',
        options: {
          w: options.width,
          h: options.height,
          x: '(ow-iw)/2',
          y: '(oh-ih)/2',
          color: 'black',
        },
        inputs: sv,
        outputs: pv,
      });
      last = pv;
    }

    if (hasOverlay) {
      const ov = tag('ov');
      filters.push({
        filter: 'overlay',
        options: { x: 0, y: 0 },
        inputs: [last, '1:v'],
        outputs: ov,
      });
      last = ov;
    }

    if (options.watermark) {
      const wmText = String(options.watermark).replace(/[\\:'"]/g, '');
      const wm = tag('wm');
      filters.push({
        filter: 'drawtext',
        options: {
          text: wmText,
          fontcolor: 'white@0.7',
          fontsize: 22,
          x: '(w-text_w)-20',
          y: '(h-text_h)-20',
          box: 1,
          boxcolor: 'black@0.35',
          boxborderw: 6,
        },
        inputs: last,
        outputs: wm,
      });
      last = wm;
    }

    if (filters.length > 0) {
      command.complexFilter(filters);
      command.outputOptions(['-map', `[${last}]`, '-map', '0:a?']);
    }

    if (options.durationSec) {
      command.duration(options.durationSec);
    }

    command
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-pix_fmt yuv420p', '-movflags +faststart'])
      .on('start', (cmd) => console.log('[ffmpeg start]', cmd))
      .on('stderr', (line) => {
        // Surface ffmpeg's own error/warning lines to Render logs for debugging.
        if (/error|invalid|fail/i.test(line)) console.warn('[ffmpeg]', line);
      })
      .on('end', () => resolve({ outPath, filename }))
      .on('error', (err, _stdout, stderr) => {
        console.error('[ffmpeg error]', err.message);
        if (stderr) console.error('[ffmpeg stderr]', stderr.slice(-1000));
        reject(err);
      })
      .save(outPath);
  });
}

module.exports = { renderVideo };

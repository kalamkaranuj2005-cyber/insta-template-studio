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
 * Returns the absolute path of the rendered MP4.
 */
function renderVideo({ sourcePath, overlayPath, options = {} }) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(sourcePath)) {
      return reject(new Error(`Source video not found: ${sourcePath}`));
    }
    const filename = `export-${Date.now()}-${nanoid(6)}.mp4`;
    const outPath = path.join(exportDir, filename);

    const command = ffmpeg(sourcePath);

    if (overlayPath && fs.existsSync(overlayPath)) {
      command.input(overlayPath);
    }

    if (options.watermark) {
      const wmText = (options.watermark || '').replace(/[\\:'"]/g, '');
      command.videoFilters([
        {
          filter: 'drawtext',
          options: {
            text: wmText || 'Insta Template Studio',
            fontcolor: 'white@0.7',
            fontsize: 22,
            x: '(w-text_w)-20',
            y: '(h-text_h)-20',
            box: 1,
            boxcolor: 'black@0.35',
            boxborderw: 6,
          },
        },
      ]);
    }

    if (overlayPath && fs.existsSync(overlayPath)) {
      command.complexFilter([
        {
          filter: 'overlay',
          options: { x: 0, y: 0 },
          inputs: ['0:v', '1:v'],
          outputs: 'v',
        },
      ]);
      command.outputOptions(['-map', '[v]', '-map', '0:a?']);
    }

    if (options.width && options.height) {
      command.size(`${options.width}x${options.height}`);
    }

    if (options.durationSec) {
      command.duration(options.durationSec);
    }

    command
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-pix_fmt yuv420p', '-movflags +faststart'])
      .on('end', () => resolve({ outPath, filename }))
      .on('error', (err) => reject(err))
      .save(outPath);
  });
}

module.exports = { renderVideo };

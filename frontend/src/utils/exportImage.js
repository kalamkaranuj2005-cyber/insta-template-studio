/**
 * Export the current Konva stage as an image at the canvas's true resolution.
 * Optionally bakes a watermark string into the bottom-right corner.
 */
export function exportStageAsImage({ format = 'png', quality = 0.95, watermark = null } = {}) {
  const stage = window.__editorStage;
  if (!stage) throw new Error('Editor stage not ready.');

  // pixelRatio = 1/scale gives us the *true* canvas pixel size, not the
  // visually scaled stage size.
  const scale = stage.scaleX();
  const pixelRatio = scale > 0 ? 1 / scale : 1;
  const dataUrl = stage.toDataURL({
    mimeType: format === 'jpeg' ? 'image/jpeg' : 'image/png',
    quality,
    pixelRatio,
  });

  if (!watermark) return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(14, Math.round(img.width * 0.018));
      ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
      const text = watermark;
      const padding = Math.round(fontSize * 0.6);
      const metrics = ctx.measureText(text);
      const w = metrics.width + padding * 2;
      const h = fontSize + padding * 1.2;
      const x = c.width - w - padding;
      const y = c.height - h - padding;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      const r = h / 2;
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x + padding, y + h / 2 + 1);

      resolve(c.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', quality));
    };
    img.src = dataUrl;
  });
}

/**
 * Export only the *overlay* layers (text, rect) as a transparent PNG. Used as
 * a video composition layer on the backend. Hides image/video sub-layers
 * temporarily so they aren't doubled with the source video.
 */
export function exportOverlayPng() {
  const stage = window.__editorStage;
  if (!stage) throw new Error('Editor stage not ready.');

  const hidden = [];
  stage.find('Image').forEach((node) => {
    hidden.push([node, node.visible()]);
    node.visible(false);
  });
  stage.draw();

  const scale = stage.scaleX();
  const pixelRatio = scale > 0 ? 1 / scale : 1;
  const url = stage.toDataURL({
    mimeType: 'image/png',
    pixelRatio,
  });

  hidden.forEach(([node, was]) => node.visible(was));
  stage.draw();
  return url;
}

export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

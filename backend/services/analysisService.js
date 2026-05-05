const path = require('path');
const sharp = require('sharp');

const uploadDir = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

function rgbToHex(r, g, b) {
  const h = (n) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, l };
}

/**
 * Tiny k-means in RGB. k=5 by default, 12 iterations. Operates on a downsampled
 * pixel buffer so it stays fast (<50ms per image at 64x64).
 */
function kmeans(pixels, k = 5, maxIter = 12) {
  if (pixels.length === 0) return [];
  const centers = [];
  for (let i = 0; i < k; i++) {
    const p = pixels[Math.floor((i / k) * pixels.length)];
    centers.push([...p]);
  }

  let assignments = new Array(pixels.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i];
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const dr = p[0] - centers[c][0];
        const dg = p[1] - centers[c][1];
        const db = p[2] - centers[c][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      if (assignments[i] !== best) {
        assignments[i] = best;
        changed = true;
      }
    }
    if (!changed) break;

    const sums = centers.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      sums[c][0] += pixels[i][0];
      sums[c][1] += pixels[i][1];
      sums[c][2] += pixels[i][2];
      sums[c][3] += 1;
    }
    for (let c = 0; c < centers.length; c++) {
      if (sums[c][3] > 0) {
        centers[c] = [
          Math.round(sums[c][0] / sums[c][3]),
          Math.round(sums[c][1] / sums[c][3]),
          Math.round(sums[c][2] / sums[c][3]),
        ];
      }
    }
  }

  const counts = centers.map(() => 0);
  for (const a of assignments) counts[a]++;
  const total = pixels.length;
  return centers
    .map((c, i) => ({
      hex: rgbToHex(c[0], c[1], c[2]),
      rgb: { r: c[0], g: c[1], b: c[2] },
      weight: counts[i] / total,
    }))
    .sort((a, b) => b.weight - a.weight);
}

async function loadFrameBuffer(localPath) {
  return sharp(localPath, { failOn: 'none' })
    .resize(64, 64, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

/**
 * Heuristic: compare luminance/saturation of edge pixels vs center.
 * Returns { backgroundColor, foregroundColor, contrastRatio, layoutHint }.
 */
function detectForegroundBackground(buffer, info) {
  const { width, height, channels } = info;
  const stride = width * channels;
  const isEdge = (x, y) => x < 6 || y < 6 || x > width - 7 || y > height - 7;

  let edgeR = 0, edgeG = 0, edgeB = 0, edgeCount = 0;
  let centerR = 0, centerG = 0, centerB = 0, centerCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * stride + x * channels;
      const r = buffer[i], g = buffer[i + 1], b = buffer[i + 2];
      if (isEdge(x, y)) {
        edgeR += r; edgeG += g; edgeB += b; edgeCount++;
      } else {
        centerR += r; centerG += g; centerB += b; centerCount++;
      }
    }
  }
  edgeR /= edgeCount; edgeG /= edgeCount; edgeB /= edgeCount;
  centerR /= centerCount; centerG /= centerCount; centerB /= centerCount;

  const edgeHsl = rgbToHsl(edgeR, edgeG, edgeB);
  const centerHsl = rgbToHsl(centerR, centerG, centerB);
  const contrastRatio = Math.abs(edgeHsl.l - centerHsl.l);

  return {
    backgroundColor: rgbToHex(Math.round(edgeR), Math.round(edgeG), Math.round(edgeB)),
    foregroundColor: rgbToHex(Math.round(centerR), Math.round(centerG), Math.round(centerB)),
    contrastRatio: Number(contrastRatio.toFixed(3)),
    layoutHint: contrastRatio > 0.18 ? 'centered-subject' : 'flat-or-busy',
  };
}

/**
 * Heuristic: divide image into 8 horizontal bands, compute pixel variance per
 * band. High-variance bands likely contain text or complex graphics.
 */
async function approximateTextRegions(localPath) {
  const { data, info } = await sharp(localPath, { failOn: 'none' })
    .resize(160, 160, { fit: 'cover' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bands = 8;
  const bandHeight = Math.floor(info.height / bands);
  const regions = [];
  for (let b = 0; b < bands; b++) {
    let sum = 0, sumSq = 0, count = 0;
    for (let y = b * bandHeight; y < (b + 1) * bandHeight; y++) {
      for (let x = 0; x < info.width; x++) {
        const v = data[y * info.width + x];
        sum += v;
        sumSq += v * v;
        count++;
      }
    }
    const mean = sum / count;
    const variance = sumSq / count - mean * mean;
    regions.push({
      yPercent: Number(((b * bandHeight) / info.height).toFixed(3)),
      heightPercent: Number((bandHeight / info.height).toFixed(3)),
      variance: Math.round(variance),
    });
  }
  const maxVar = Math.max(...regions.map((r) => r.variance), 1);
  return regions
    .map((r) => ({ ...r, score: Number((r.variance / maxVar).toFixed(3)) }))
    .filter((r) => r.score > 0.55)
    .map((r) => ({
      yPercent: r.yPercent,
      heightPercent: r.heightPercent,
      confidence: r.score,
    }));
}

async function analyzeImage(filenameOrPath) {
  const localPath = path.isAbsolute(filenameOrPath)
    ? filenameOrPath
    : path.join(uploadDir, filenameOrPath);

  const { data, info } = await loadFrameBuffer(localPath);
  const pixels = [];
  for (let i = 0; i < data.length; i += info.channels) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }

  const palette = kmeans(pixels, 5).slice(0, 5);
  const layout = detectForegroundBackground(data, info);
  const textRegions = await approximateTextRegions(localPath);

  return {
    palette,
    layout,
    textRegions,
    note: 'Heuristic analysis — palette + layout band confidence. Use as template seed only.',
  };
}

module.exports = { analyzeImage };

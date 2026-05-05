const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const { nanoid } = require('nanoid');

const uploadDir = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

const IG_URL_RE = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv)\/[\w-]+/i;

function isInstagramUrl(url) {
  return typeof url === 'string' && IG_URL_RE.test(url.trim());
}

/**
 * Strategy 1: Instagram oEmbed (official, requires Meta App token).
 * Returns null silently on failure — caller will try the next strategy.
 */
async function tryOEmbed(url) {
  const token = process.env.FB_APP_TOKEN;
  if (!token) return null;
  try {
    const { data } = await axios.get('https://graph.facebook.com/v19.0/instagram_oembed', {
      params: { url, access_token: token, fields: 'thumbnail_url,author_name,html' },
      timeout: 8000,
    });
    if (!data || !data.thumbnail_url) return null;
    return {
      method: 'oembed',
      mediaUrl: data.thumbnail_url,
      mediaType: 'image',
      author: data.author_name || null,
      embedHtml: data.html || null,
    };
  } catch {
    return null;
  }
}

/**
 * Strategy 2: read public Open Graph tags. Single GET, no retry, generic UA.
 * Many public posts still expose og:image / og:video.
 */
async function tryOpenGraph(url) {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; InstaTemplateStudio/1.0; +https://example.com/bot)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      maxRedirects: 3,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    const $ = cheerio.load(html);
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogVideo = $('meta[property="og:video"]').attr('content');
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const mediaUrl = ogVideo || ogImage;
    if (!mediaUrl) return null;
    return {
      method: 'opengraph',
      mediaUrl,
      mediaType: ogVideo ? 'video' : 'image',
      author: ogTitle || null,
      embedHtml: null,
    };
  } catch {
    return null;
  }
}

/**
 * Download `mediaUrl` to the local uploads dir so the frontend can serve and
 * the analysis pipeline can read pixels.
 */
async function downloadToUploads(mediaUrl, mediaType) {
  const ext =
    mediaType === 'video'
      ? '.mp4'
      : path.extname(new URL(mediaUrl).pathname).split('?')[0] || '.jpg';
  const filename = `ig-${Date.now()}-${nanoid(6)}${ext}`;
  const filepath = path.join(uploadDir, filename);

  const response = await axios.get(mediaUrl, {
    responseType: 'stream',
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InstaTemplateStudio/1.0)' },
  });

  await new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filepath);
    response.data.pipe(stream);
    stream.on('finish', resolve);
    stream.on('error', reject);
    response.data.on('error', reject);
  });

  return { filename, localPath: filepath };
}

async function extractFromUrl(url) {
  if (!isInstagramUrl(url)) {
    const err = new Error('That does not look like a public Instagram post URL.');
    err.status = 400;
    err.publicMessage = err.message;
    throw err;
  }

  const found = (await tryOEmbed(url)) || (await tryOpenGraph(url));
  if (!found) {
    const err = new Error(
      'Could not extract media via policy-safe methods. Please upload the file manually.'
    );
    err.status = 422;
    err.publicMessage = err.message;
    throw err;
  }

  const { filename } = await downloadToUploads(found.mediaUrl, found.mediaType);
  return {
    method: found.method,
    mediaType: found.mediaType,
    filename,
    publicUrl: `/static/uploads/${filename}`,
    sourceUrl: url,
    author: found.author,
    note:
      'Original is shown only as a style reference. Generated templates do not replicate copyrighted content.',
  };
}

module.exports = { extractFromUrl, isInstagramUrl };

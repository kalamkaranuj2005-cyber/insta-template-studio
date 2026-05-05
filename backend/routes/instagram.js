const express = require('express');
const { extractFromUrl } = require('../services/instagramService');

const router = express.Router();

router.post('/extract', async (req, res, next) => {
  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: 'Missing "url" in request body.' });
    }
    const result = await extractFromUrl(url);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

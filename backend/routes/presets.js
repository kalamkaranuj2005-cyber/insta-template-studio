const path = require('path');
const fs = require('fs');
const express = require('express');

const router = express.Router();
const presetFile = path.resolve(__dirname, '..', 'data', 'presets.json');

router.get('/', (_req, res) => {
  if (!fs.existsSync(presetFile)) return res.json([]);
  try {
    res.json(JSON.parse(fs.readFileSync(presetFile, 'utf-8')));
  } catch {
    res.json([]);
  }
});

module.exports = router;

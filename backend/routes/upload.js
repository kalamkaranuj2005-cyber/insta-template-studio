const express = require('express');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file received under field "file".' });
  }
  const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
  res.json({
    method: 'manual',
    mediaType,
    filename: req.file.filename,
    publicUrl: `/static/uploads/${req.file.filename}`,
    sizeBytes: req.file.size,
    mimetype: req.file.mimetype,
    note: 'Manual upload — you confirmed you have rights to use this media.',
  });
});

module.exports = router;

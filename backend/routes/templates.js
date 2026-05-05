const path = require('path');
const fs = require('fs');
const express = require('express');
const { nanoid } = require('nanoid');

const router = express.Router();
const dataFile = path.resolve(__dirname, '..', 'data', 'templates.json');

function load() {
  if (!fs.existsSync(dataFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  } catch {
    return [];
  }
}
function save(list) {
  fs.writeFileSync(dataFile, JSON.stringify(list, null, 2));
}

router.get('/', (_req, res) => {
  res.json(load());
});

router.post('/', (req, res) => {
  const list = load();
  const { name, doc } = req.body || {};
  if (!name || !doc) {
    return res.status(400).json({ error: 'Both "name" and "doc" are required.' });
  }
  const tpl = {
    id: nanoid(10),
    name,
    doc,
    createdAt: new Date().toISOString(),
  };
  list.unshift(tpl);
  save(list);
  res.status(201).json(tpl);
});

router.delete('/:id', (req, res) => {
  const list = load();
  const next = list.filter((t) => t.id !== req.params.id);
  if (next.length === list.length) {
    return res.status(404).json({ error: 'Template not found.' });
  }
  save(next);
  res.json({ ok: true });
});

module.exports = router;

const express = require('express');
const router  = express.Router();
const Motif   = require('../models/Motif');
const { asyncHandler } = require('../middleware/errorHandler');

/* ─────────────────────────────────────────────
   GET /api/motifs
   All motifs, populated with song refs.
───────────────────────────────────────────── */
router.get('/', asyncHandler(async (req, res) => {
  const motifs = await Motif.find()
    .populate('occurrences.songId', 'title trackNo')
    .sort({ motifId: 1 });
  res.json(motifs);
}));

/* ─────────────────────────────────────────────
   GET /api/motifs/:id
───────────────────────────────────────────── */
router.get('/:id', asyncHandler(async (req, res) => {
  const motif = await Motif.findById(req.params.id)
    .populate('occurrences.songId', 'title trackNo')
    .populate('occurrences.annotationId');
  if (!motif) return res.status(404).json({ error: 'Motif not found' });
  res.json(motif);
}));

/* ─────────────────────────────────────────────
   POST /api/motifs
   Body: { motifId, name, description?, scoreImage?, occurrences? }
───────────────────────────────────────────── */
router.post('/', asyncHandler(async (req, res) => {
  const { motifId, name, description, scoreImage, occurrences } = req.body;

  if (!motifId?.trim() || !name?.trim()) {
    return res.status(400).json({ error: 'motifId and name are required' });
  }

  const motif = await Motif.create({
    motifId:     motifId.trim().toUpperCase(),
    name:        name.trim(),
    description: description || '',
    scoreImage:  scoreImage  || null,
    occurrences: occurrences || [],
  });

  res.status(201).json(motif);
}));

/* ─────────────────────────────────────────────
   PUT /api/motifs/:id
   Update motif metadata or occurrences list.
───────────────────────────────────────────── */
router.put('/:id', asyncHandler(async (req, res) => {
  const allowed = ['name', 'description', 'scoreImage', 'occurrences'];
  const update  = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }

  const motif = await Motif.findByIdAndUpdate(
    req.params.id,
    { $set: update },
    { new: true, runValidators: true },
  );
  if (!motif) return res.status(404).json({ error: 'Motif not found' });
  res.json(motif);
}));

/* ─────────────────────────────────────────────
   POST /api/motifs/:id/occurrences
   Add a single occurrence to an existing motif.
   Body: { songId, annotationId?, label? }
───────────────────────────────────────────── */
router.post('/:id/occurrences', asyncHandler(async (req, res) => {
  const { songId, annotationId, label } = req.body;
  if (!songId) return res.status(400).json({ error: 'songId is required' });

  const motif = await Motif.findByIdAndUpdate(
    req.params.id,
    { $push: { occurrences: { songId, annotationId: annotationId || null, label: label || '' } } },
    { new: true },
  );
  if (!motif) return res.status(404).json({ error: 'Motif not found' });
  res.json(motif);
}));

/* ─────────────────────────────────────────────
   DELETE /api/motifs/:id
───────────────────────────────────────────── */
router.delete('/:id', asyncHandler(async (req, res) => {
  const motif = await Motif.findByIdAndDelete(req.params.id);
  if (!motif) return res.status(404).json({ error: 'Motif not found' });
  res.json({ message: `Deleted motif ${motif.motifId}`, id: req.params.id });
}));

module.exports = router;
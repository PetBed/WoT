const express  = require('express');
const router   = express.Router();
const Song     = require('../models/Song');
const Annotation = require('../models/Annotation');
const { asyncHandler } = require('../middleware/errorHandler');

/* ─────────────────────────────────────────────
   GET /api/songs
   List all songs, sorted by trackNo.
   Returns lightweight list (no lyrics payload).
───────────────────────────────────────────── */
router.get('/', asyncHandler(async (req, res) => {
  const songs = await Song.find({}, '-lyrics').sort({ trackNo: 1 });

  // Attach annotation counts so the library card can show them
  const ids = songs.map(s => s._id);
  const counts = await Annotation.aggregate([
    { $match: { songId: { $in: ids } } },
    { $group: { _id: '$songId', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map(c => [c._id.toString(), c.count]));

  const payload = songs.map(s => ({
    ...s.toObject(),
    annotationCount: countMap[s._id.toString()] || 0,
  }));

  res.json(payload);
}));

/* ─────────────────────────────────────────────
   GET /api/songs/:id
   Single song WITH lyrics.
───────────────────────────────────────────── */
router.get('/:id', asyncHandler(async (req, res) => {
  const song = await Song.findById(req.params.id);
  if (!song) return res.status(404).json({ error: 'Song not found' });
  res.json(song);
}));

/* ─────────────────────────────────────────────
   POST /api/songs
   Create a new song.
   Body: { title, trackNo?, composer?, durStr?, dur?, lyrics? }
───────────────────────────────────────────── */
router.post('/', asyncHandler(async (req, res) => {
  const { title, trackNo, composer, durStr, dur, audioUrl, lyrics } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }

  const song = await Song.create({
    title:    title.trim(),
    trackNo:  trackNo  ?? null,
    composer: composer ?? 'Anaïs Mitchell',
    durStr:   durStr   ?? '0:00',
    dur:      dur      ?? 0,
    audioUrl: audioUrl ?? null,
    lyrics:   lyrics   ?? [],
  });

  res.status(201).json(song);
}));

/* ─────────────────────────────────────────────
   PUT /api/songs/:id
   Full or partial update. Accepts any subset of fields.
───────────────────────────────────────────── */
router.put('/:id', asyncHandler(async (req, res) => {
  const allowed = ['title', 'trackNo', 'composer', 'durStr', 'dur', 'audioUrl', 'notes', 'lyrics'];
  const update  = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }

  const song = await Song.findByIdAndUpdate(
    req.params.id,
    { $set: update },
    { new: true, runValidators: true },
  );
  if (!song) return res.status(404).json({ error: 'Song not found' });
  res.json(song);
}));

/* ─────────────────────────────────────────────
   DELETE /api/songs/:id
   Deletes song AND all its annotations (cascade).
───────────────────────────────────────────── */
router.delete('/:id', asyncHandler(async (req, res) => {
  const song = await Song.findByIdAndDelete(req.params.id);
  if (!song) return res.status(404).json({ error: 'Song not found' });

  const { deletedCount } = await Annotation.deleteMany({ songId: req.params.id });

  res.json({
    message: `Deleted "${song.title}" and ${deletedCount} annotation(s)`,
    songId:  req.params.id,
    deletedAnnotations: deletedCount,
  });
}));

module.exports = router;
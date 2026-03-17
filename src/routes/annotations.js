const express    = require('express');
const router     = express.Router({ mergeParams: true }); // gives access to :songId from parent
const Annotation = require('../models/Annotation');
const Song       = require('../models/Song');
const { asyncHandler } = require('../middleware/errorHandler');

/* ─────────────────────────────────────────────
   GET /api/songs/:songId/annotations
   All annotations for a song.
   Optional query params:
     ?tier=lyrics|motif|choreo|costume
     ?tag=greek-myth
───────────────────────────────────────────── */
router.get('/', asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const filter = { songId };

  if (req.query.tier) {
    const validTiers = ['lyrics', 'motif', 'choreo', 'costume'];
    if (!validTiers.includes(req.query.tier)) {
      return res.status(400).json({ error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` });
    }
    filter.tier = req.query.tier;
  }

  if (req.query.tag) {
    filter.tags = req.query.tag; // MongoDB checks for value in array
  }

  const annotations = await Annotation.find(filter).sort({ createdAt: -1 });
  res.json(annotations);
}));

/* ─────────────────────────────────────────────
   GET /api/songs/:songId/annotations/:id
   Single annotation.
───────────────────────────────────────────── */
router.get('/:id', asyncHandler(async (req, res) => {
  const ann = await Annotation.findOne({
    _id:    req.params.id,
    songId: req.params.songId,
  });
  if (!ann) return res.status(404).json({ error: 'Annotation not found' });
  res.json(ann);
}));

/* ─────────────────────────────────────────────
   POST /api/songs/:songId/annotations
   Create an annotation.
   Body: { lineId, startChar, endChar, selectedText, content,
           author?, tier?, tags?, tsAnchor? }
───────────────────────────────────────────── */
router.post('/', asyncHandler(async (req, res) => {
  const { songId } = req.params;

  // Verify the song exists
  const songExists = await Song.exists({ _id: songId });
  if (!songExists) return res.status(404).json({ error: 'Song not found' });

  const {
    lineId, endLineId, startChar, endChar, selectedText,
    content, author, tier, tags, tsAnchor, includesSpeaker, linkedMotifId,
    choreoNote, costumeNote,
  } = req.body;

  // Basic required-field validation
  const missing = ['lineId', 'startChar', 'endChar', 'selectedText', 'content']
    .filter(f => req.body[f] === undefined || req.body[f] === '');
  if (missing.length) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }

  const ann = await Annotation.create({
    songId,
    lineId,
    endLineId:       endLineId ?? null,
    startChar,
    endChar,
    selectedText:    selectedText.trim(),
    content:         content.trim(),
    author:          author || 'Anonymous',
    tier:            tier   || 'lyrics',
    tags:            Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean) : [],
    tsAnchor:        tsAnchor || null,
    includesSpeaker: !!includesSpeaker,
    linkedMotifId:   linkedMotifId || null,
    choreoNote:      choreoNote    || null,
    costumeNote:     costumeNote   || null,
  });

  res.status(201).json(ann);
}));

/* ─────────────────────────────────────────────
   PUT /api/songs/:songId/annotations/:id
   Update an annotation (any subset of fields).
───────────────────────────────────────────── */
router.put('/:id', asyncHandler(async (req, res) => {
  // content, tier, tags, tsAnchor — always editable
  // lineId, endLineId, startChar, endChar, selectedText, includesSpeaker — range reselect
  const allowed = [
    'content', 'tier', 'tags', 'tsAnchor', 'author',
    'lineId', 'endLineId', 'startChar', 'endChar', 'selectedText', 'includesSpeaker',
    'linkedMotifId', 'choreoNote', 'costumeNote',
  ];
  const update  = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }

  // Sanitise tags if provided
  if (update.tags) {
    update.tags = Array.isArray(update.tags)
      ? update.tags.map(t => t.trim()).filter(Boolean)
      : [];
  }

  const ann = await Annotation.findOneAndUpdate(
    { _id: req.params.id, songId: req.params.songId },
    { $set: update },
    { new: true, runValidators: true },
  );
  if (!ann) return res.status(404).json({ error: 'Annotation not found' });
  res.json(ann);
}));

/* ─────────────────────────────────────────────
   DELETE /api/songs/:songId/annotations/:id
───────────────────────────────────────────── */
router.delete('/:id', asyncHandler(async (req, res) => {
  const ann = await Annotation.findOneAndDelete({
    _id:    req.params.id,
    songId: req.params.songId,
  });
  if (!ann) return res.status(404).json({ error: 'Annotation not found' });
  res.json({ message: 'Annotation deleted', id: req.params.id });
}));

module.exports = router;
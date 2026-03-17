const mongoose = require('mongoose');

// A single lyric line within a song
const LyricLineSchema = new mongoose.Schema({
  lineId:   { type: Number, required: true },   // stable sequential ID used by frontend
  section:  { type: String, default: null },     // e.g. "Verse 1", "Chorus"
  speaker:  { type: String, default: null },     // e.g. "HERMES", "ALL"
  text:     { type: String, default: '' },       // empty string = spacer/blank line
}, { _id: false });

const SongSchema = new mongoose.Schema({
  trackNo:  { type: Number, default: null },
  title:    { type: String, required: true, trim: true },
  composer: { type: String, default: 'Anaïs Mitchell', trim: true },
  durStr:   { type: String, default: '0:00' },   // human-readable, e.g. "3:14"
  dur:      { type: Number, default: 0 },        // duration in seconds
  audioUrl: { type: String, default: null, trim: true }, // direct or Google Drive stream URL
  notes:    { type: String, default: '' },               // free-form song-level analysis notes
  lyrics:   { type: [LyricLineSchema], default: [] },
}, {
  timestamps: true,   // createdAt, updatedAt
});

// Index for fast track-order listing
SongSchema.index({ trackNo: 1 });

module.exports = mongoose.model('Song', SongSchema);
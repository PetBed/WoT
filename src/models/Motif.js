const mongoose = require('mongoose');

// A single occurrence of a motif — points to a song + optional annotation
const OccurrenceSchema = new mongoose.Schema({
  songId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Song', required: true },
  annotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Annotation', default: null },
  label:        { type: String, trim: true },   // e.g. "Way Down Hadestown: L9-12"
}, { _id: false });

const MotifSchema = new mongoose.Schema({
  motifId:     { type: String, required: true, unique: true, trim: true },  // e.g. "M1"
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  scoreImage:  { type: String, default: null },   // URL to uploaded PNG/MusicXML asset
  occurrences: { type: [OccurrenceSchema], default: [] },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Motif', MotifSchema);
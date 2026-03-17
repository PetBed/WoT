const mongoose = require('mongoose');

const TimestampAnchorSchema = new mongoose.Schema({
  start: { type: Number, required: true },   // seconds
  end:   { type: Number, required: true },
}, { _id: false });

const AnnotationSchema = new mongoose.Schema({
  songId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Song', required: true, index: true },
  lineId:       { type: Number, required: true },   // start line
  endLineId:    { type: Number, default: null },     // end line (null = same as lineId)
  startChar:    { type: Number, required: true },   // char offset in start line
  endChar:      { type: Number, required: true },   // char offset in end line
  selectedText: { type: String, required: true, trim: true },
  content:      { type: String, required: true, trim: true },
  author:       { type: String, default: 'Anonymous', trim: true },
  tier: {
    type: String,
    enum: ['lyrics', 'motif', 'choreo', 'costume'],
    default: 'lyrics',
  },
  tags:            { type: [String], default: [] },
  tsAnchor:        { type: TimestampAnchorSchema, default: null },
  includesSpeaker: { type: Boolean, default: false },
  linkedMotifId:   { type: String, default: null, trim: true }, // motifId string e.g. "M1"
  choreoNote:      { type: String, default: null, trim: true }, // staging / movement note
  costumeNote:     { type: String, default: null, trim: true }, // character / costume detail
}, {
  timestamps: true,
});

// Compound index for fast per-song annotation fetches
AnnotationSchema.index({ songId: 1, createdAt: -1 });

module.exports = mongoose.model('Annotation', AnnotationSchema);
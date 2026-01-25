const mongoose = require('mongoose');

const tarotCardNoteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyUser', required: true },
  cardId: { type: Number, required: true }, // Links to the static TarotCard _id (0-77)
  
  // User's custom fields
  keywordsUpright: { type: String, default: '' }, 
  keywordsReversed: { type: String, default: '' },
  interpretation: { type: String, default: '' },
  meaning: { type: String, default: '' },
  symbolism: { type: String, default: '' },
  
  // [UPDATED] Stores URL or Base64 Data URI
  customImage: { type: String, default: '' }
  
}, { timestamps: true });

// Ensure one note per card per user
tarotCardNoteSchema.index({ userId: 1, cardId: 1 }, { unique: true });

module.exports = mongoose.model('TarotCardNote', tarotCardNoteSchema);
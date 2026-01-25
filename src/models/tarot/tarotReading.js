const mongoose = require('mongoose');

const tarotReadingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyUser', required: true },
  date: { type: Date, default: Date.now },
  spreadId: { type: mongoose.Schema.Types.ObjectId, ref: 'TarotSpread', required: true },
  question: { type: String, default: '' },
  notes: { type: String, default: '' }, // Main journal entry
  tags: [{ type: String }], // e.g., "Love", "Career"
  cards: [{
    positionId: { type: Number, required: true }, // Matches the position ID in the Spread
    cardId: { type: Number, ref: 'TarotCard', required: true }, // 0-77
    orientation: { type: String, enum: ['upright', 'reversed'], default: 'upright' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('TarotReading', tarotReadingSchema);
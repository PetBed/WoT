const mongoose = require('mongoose');

const tarotReadingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyUser', required: true },
  date: { type: Date, default: Date.now },
  // [UPDATED] spreadId is now optional for free-form readings
  spreadId: { type: mongoose.Schema.Types.ObjectId, ref: 'TarotSpread', required: false },
  question: { type: String, default: '' },
  notes: { type: String, default: '' }, 
  tags: [{ type: String }], 
  cards: [{
    positionId: { type: Number, required: true }, // For free-form, this is just the index (0, 1, 2...)
    cardId: { type: Number, ref: 'TarotCard', required: true }, // 0-77
    orientation: { type: String, enum: ['upright', 'reversed'], default: 'upright' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('TarotReading', tarotReadingSchema);
const mongoose = require('mongoose');

const tarotSpreadSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyUser', required: true }, // Links to your existing user system
  name: { type: String, required: true },
  description: { type: String, default: '' },
  positions: [{
    id: { type: Number, required: true }, // 1, 2, 3...
    name: { type: String, default: '' }, // e.g. "The Challenge"
    x: { type: Number, required: true }, // CSS Left %
    y: { type: Number, required: true }, // CSS Top %
    rotation: { type: Number, default: 0 } // Degrees
  }]
}, { timestamps: true });

module.exports = mongoose.model('TarotSpread', tarotSpreadSchema);
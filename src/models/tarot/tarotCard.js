const mongoose = require('mongoose');

const tarotCardSchema = new mongoose.Schema({
  _id: { type: Number, required: true }, // 0 to 77
  name: { type: String, required: true },
  suit: { 
    type: String, 
    enum: ['Major', 'Wands', 'Cups', 'Swords', 'Pentacles'],
    required: true 
  },
  number: { type: Number, required: true }, // 0-21 for Major, 1-14 for Minor
  image: { type: String, default: '' }, // Path or URL to image
  defaultMeanings: {
    upright: { type: [String], default: [] }, // Array of keywords
    reversed: { type: [String], default: [] }
  },
  // You can add a 'personalNotes' field here if you want to store your custom interpretation directly on the card
  personalInterpretation: { type: String, default: "" }
}, { _id: false }); // We manually set _id, so disable auto-generation

module.exports = mongoose.model('TarotCard', tarotCardSchema);
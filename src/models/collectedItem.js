const mongoose = require('mongoose');

// This schema represents a specific instance of a card that a user owns.
// It links to a user and an item model, and stores the randomly generated stats for that one card.
const collectedItemSchema = new mongoose.Schema({
    // The user who owns this card
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudyUser',
        required: true,
        index: true
    },
    // The specific model of this card (e.g., "BIC Pencil")
    itemModelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemModel',
        required: true
    },
    // Generated stats for this specific card instance
    generatedStats: {
        rarity: { type: String, required: true },
        version: { type: String, default: 'normal' },
        condition: { type: String, required: true },
        aestheticScore: { type: Number, required: true },
        collectorValue: { type: Number, required: true },
        serialNumber: { type: String, default: null }, // e.g., "34/500" or null
        weight: { type: Number },
        price: { type: Number },
        color: { type: String }
    }
}, { timestamps: true });

module.exports = mongoose.model('CollectedItem', collectedItemSchema);

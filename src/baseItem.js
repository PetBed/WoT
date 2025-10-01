const mongoose = require('mongoose');

// This schema defines the high-level category of an item, like "Pencil" or "Eraser".
// It corresponds to your proposed items.json structure.
const baseItemSchema = new mongoose.Schema({
    // A unique identifier for the base item type (e.g., "pencil")
    itemId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    // The display name for this item category (e.g., "Pencil")
    name: {
        type: String,
        required: true,
        trim: true
    },
    // This will store references to specific item models grouped by their rarity.
    // e.g., { common: ['pencil_bic_id', 'pencil_dixon_id'], rare: ['pencil_montblanc_id'] }
    rarityPools: {
        type: Map,
        of: [mongoose.Schema.Types.ObjectId]
    },
    // Default stat ranges for this item category.
    // Specific models can override these.
    defaultStats: {
        weightRange: { type: [Number], default: [1, 1] }, // [min, max]
        priceRange: { type: [Number], default: [1, 1] },  // [min, max]
        aestheticRange: { type: [Number], default: [1, 100] } // [min, max]
    }
}, { timestamps: true });

module.exports = mongoose.model('BaseItem', baseItemSchema);

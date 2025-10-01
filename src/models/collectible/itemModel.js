const mongoose = require('mongoose');

// This schema defines a specific model of a base item, like "BIC Pencil".
// It corresponds to the data in files like pencils.json.
const itemModelSchema = new mongoose.Schema({
    // Link to the parent base item (e.g., the "Pencil" category)
    baseItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BaseItem',
        required: true
    },
    // A unique identifier for this specific model (e.g., "pencil_bic")
    modelId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    // The display name for this model (e.g., "BIC Pencil")
    name: {
        type: String,
        required: true,
        trim: true
    },
    // The rarity tier for this specific model
    rarity: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    // Possible color options for this item when generated
    colorOptions: {
        type: [String],
        default: []
    },
    // Stat ranges that can override the defaults from the BaseItem
    modelStats: {
        weightRange: [Number],
        priceRange: [Number],
        aestheticRange: [Number]
    },
    // Information for limited edition items
    limitedEdition: {
        isLimited: { type: Boolean, default: false },
        maxSerial: { type: Number, default: 0 }
    }
}, { timestamps: true });

module.exports = mongoose.model('ItemModel', itemModelSchema);

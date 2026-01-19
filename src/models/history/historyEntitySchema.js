const mongoose = require('mongoose');

const historyEntitySchema = new mongoose.Schema({
    // Core Identity
    title: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true 
    },
    slug: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true,
        index: true
    },
    type: {
        type: String,
        enum: ['event', 'actor', 'context', 'theme'],
        required: true
    },

    // Metadata
    era: {
        type: String,
        enum: ['pre-ww1', 'ww1', 'interwar', 'ww2', 'post-ww2', 'general'],
        default: 'general'
    },
    year: { type: Number }, // For sorting timeline
    dateDisplay: { type: String }, // e.g., "June 28, 1914"
    location: { type: String },

    // Content
    summary: { type: String, maxLength: 500 }, // The 1-2 paragraph intro
    content: { type: String }, // The main markdown body
    takeaway: { type: String }, // The "One-Sentence Takeaway"

    // The Structured Knowledge Graph
    // These are the "Typed Links" from your design doc
    connections: [{
        target: { type: mongoose.Schema.Types.ObjectId, ref: 'HistoryEntity' },
        targetTitle: { type: String }, // Cached title for UI performance
        targetSlug: { type: String },  // Cached slug for linking
        type: { 
            type: String, 
            enum: ['caused_by', 'leads_to', 'related_to', 'participated_in'] 
        }
    }],

    // Optional: Coordinates for your Map View later
    geo: {
        lat: Number,
        lng: Number
    }
}, { timestamps: true });

// Text index for search
historyEntitySchema.index({ title: 'text', summary: 'text' });

module.exports = mongoose.model('HistoryEntity', historyEntitySchema);
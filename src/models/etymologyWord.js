const mongoose = require('mongoose');

// NEW: Schema for definition entries
// This allows grouping definitions under a specific part of speech.
const definitionEntrySchema = new mongoose.Schema({
    partOfSpeech: {
        type: String,
        required: true,
        // Enum for the dropdown menu
        enum: [
            'noun', 
            'verb', 
            'adjective', 
            'adverb', 
            'pronoun', 
            'preposition', 
            'conjunction', 
            'interjection', 
            'other'
        ]
    },
    definitions: [{ // An array of definition strings for that part of speech
        type: String,
        trim: true
    }]
}, { _id: false });

// NEW: Schema for dynamic etymology fields
// This allows adding { type: 'Origin', value: '...' } pairs.
const etymologyEntrySchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        // Enum for the dropdown menu
        enum: [
            'Origin', 
            'Morphology', 
            'Proto-Root', 
            'Semantic Shift', 
            'Notes'
        ]
    },
    value: {
        type: String,
        trim: true
    }
}, { _id: false });


// This is the main schema for your word log entries.
const etymologyWordSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudyUser',
        required: true,
        index: true
    },
    word: {
        type: String,
        required: true,
        trim: true
    },
    pronunciation: {
        type: String,
        trim: true
    },
    
    // UPDATED: Use the new nested schemas
    definitions: [definitionEntrySchema],
    etymology: [etymologyEntrySchema],

    relatedWords: [{
        type: String,
        trim: true
    }],
    personalNotes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

etymologyWordSchema.index({ userId: 1, word: 1 }, { unique: true });

const EtymologyWord = mongoose.model('EtymologyWord', etymologyWordSchema);

module.exports = EtymologyWord;


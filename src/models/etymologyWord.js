const mongoose = require('mongoose');

// This is a sub-document schema for the detailed etymology breakdown.
// Using { _id: false } makes it a plain nested object, which is
// simpler to manage unless you need to update fields individually.
const etymologyBreakdownSchema = new mongoose.Schema({
    origin: {
        type: String,
        trim: true
    },
    morphology: {
        type: String,
        trim: true
    },
    protoRoot: {
        type: String,
        trim: true
    },
    semanticShift: {
        type: String,
        trim: true
    },
    notes: {
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
        index: true // Add index for faster querying of a user's words
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
    partOfSpeech: {
        type: String,
        trim: true
    },
    definitions: [{ // An array to hold multiple definitions
        type: String,
        trim: true
    }],
    etymology: etymologyBreakdownSchema, // Nest the breakdown schema
    relatedWords: [{ // An array for related words
        type: String,
        trim: true
    }],
    personalNotes: { // For the main "Notes or reflections"
        type: String,
        trim: true
    }
}, {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true
});

// Create a compound index to prevent a user from entering the exact same word twice.
// This is optional but good for data integrity.
etymologyWordSchema.index({ userId: 1, word: 1 }, { unique: true });

const EtymologyWord = mongoose.model('EtymologyWord', etymologyWordSchema);

module.exports = EtymologyWord;

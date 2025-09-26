const mongoose = require('mongoose');

// Schema for an individual flashcard
const flashcardSchema = new mongoose.Schema({
    front: {
        type: String,
        required: true,
        trim: true
    },
    back: {
        type: String,
        required: true,
        trim: true
    }
});

// Schema for a set of flashcards
const flashcardSetSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudyUser',
        required: true
    },
    flashcards: [flashcardSchema] // Array of flashcards
}, { timestamps: true });

module.exports = mongoose.model('FlashcardSet', flashcardSetSchema);
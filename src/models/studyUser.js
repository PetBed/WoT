const mongoose = require('mongoose');

const studyUserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    securityQuestion: {
        type: String,
        required: true
    },
    securityAnswer: {
        type: String,
        required: true
    },
    studyLogs: {
        type: Map,
        of: Number, // Storing total seconds for each subject
        default: {}
    },
    studyStreak: {
        type: Number,
        default: 0
    },
    lastStudyDay: {
        type: String, // Storing date as 'YYYY-MM-DD'
        default: ''
    },
    settings: {
        darkMode: {
            type: Boolean,
            default: false
        }
    },
    soundLibrary: [{
        name: { type: String, required: true },
        url: { type: String, required: true }
    }],
    accumulatedStudyTime: { // Total seconds studied towards the next drop
        type: Number,
        default: 0
    },
    unclaimedDrops: { // Number of card packs the user can open
        type: Number,
        default: 0
    },
    inventory: [{ // References to the cards the user has collected
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CollectedItem'
    }],
    pendingDrops: {
        type: Array,
        default: []
    }
});

module.exports = mongoose.model('StudyUser', studyUserSchema);


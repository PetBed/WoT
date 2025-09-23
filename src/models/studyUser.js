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
    }
});

module.exports = mongoose.model('StudyUser', studyUserSchema);


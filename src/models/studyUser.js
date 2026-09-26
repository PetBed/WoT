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
        },
        shareLiveStatus: {
            type: Boolean,
            default: true
        },
        shareLeaderboard: {
            type: Boolean,
            default: false
        },
        shareHistory: {
            type: Boolean,
            default: false
        },
        shareSubject: {
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
    },
    semesters: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        startDate: { type: String, default: '' },
        endDate: { type: String, default: '' },
        isActive: { type: Boolean, default: false },
        description: { type: String, default: '' },
        studyLogs: {
            type: Map,
            of: Number,
            default: {}
        },
        exams: [{
            id: { type: String, required: true },
            subject: { type: String, required: true },
            date: { type: String, required: true },
            paper: { type: String, default: '' },
            mark: { type: Number, default: null },
            maxMark: { type: Number, default: 100 },
            letterGrade: { type: String, default: '' },
            weight: { type: Number, default: 0 },
            notes: { type: String, default: '' }
        }],
        subjectFinals: [{
            id: { type: String, required: true },
            subject: { type: String, required: true },
            score: { type: Number, default: null },
            maxScore: { type: Number, default: 100 },
            gpa: { type: Number, default: null },
            letterGrade: { type: String, default: '' },
            creditHours: { type: Number, default: 1 },
            notes: { type: String, default: '' }
        }],
        createdAt: { type: Date, default: Date.now }
    }],
    activeSemesterId: {
        type: String,
        default: ''
    },
    syllabus: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        color: { type: String, default: '#00B4D8' },
        order: { type: Number, default: 0 },
        chapters: [{
            id: { type: String, required: true },
            name: { type: String, default: '' },
            notes: { type: String, default: '' },
            status: {
                type: String,
                enum: ['not_started', 'in_progress', 'review_required', 'mastered'],
                default: 'not_started'
            },
            order: { type: Number, default: 0 },
            subchapters: [{
                id: { type: String, required: true },
                name: { type: String, default: '' },
                notes: { type: String, default: '' },
                status: {
                    type: String,
                    enum: ['not_started', 'in_progress', 'review_required', 'mastered'],
                    default: 'not_started'
                },
                order: { type: Number, default: 0 }
            }]
        }],
        createdAt: { type: Date, default: Date.now }
    }],
    studySessions: [{
        id: { type: String, required: true },
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
        durationSeconds: { type: Number, required: true },
        subject: { type: String, required: true },
        mode: { type: String, enum: ['pomodoro', 'stopwatch'], default: 'pomodoro' },
        semesterId: { type: String, default: '' },
        linkedItem: {
            itemType: { type: String, default: 'none' },
            itemId: { type: String, default: '' },
            subId: { type: String, default: '' },
            title: { type: String, default: '' },
            parentTitle: { type: String, default: '' },
            displayText: { type: String, default: '' }
        },
        createdAt: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('StudyUser', studyUserSchema);


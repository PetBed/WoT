const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        default: 'Untitled Note'
    },
    content: {
        type: String,
        default: ''
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudyUser'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notebookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Notebook',
        default: null
    },
    subject: {
        type: String,
        default: 'Other',
        trim: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    aliases: [{
        type: String,
        trim: true
    }],
    isPinned: {
        type: Boolean,
        default: false
    },
    order: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
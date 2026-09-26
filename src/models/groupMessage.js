const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudyGroup',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudyUser',
        required: true
    },
    senderUsername: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    type: {
        type: String,
        enum: ['text', 'activity_share', 'system'],
        default: 'text'
    },
    activityData: {
        subject: { type: String, default: '' },
        durationSeconds: { type: Number, default: 0 },
        mode: { type: String, default: '' },
        displayText: { type: String, default: '' }
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

groupMessageSchema.index({ groupId: 1, createdAt: 1 });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);

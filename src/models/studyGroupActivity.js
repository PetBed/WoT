const mongoose = require('mongoose');

const studyGroupActivitySchema = new mongoose.Schema({
    clientActivityId: { type: String, required: true, unique: true, index: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyGroup', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyUser', required: true, index: true },
    subject: { type: String, default: '', maxlength: 80 },
    details: { type: String, default: '', maxlength: 300 },
    mode: { type: String, enum: ['pomodoro', 'stopwatch'], default: 'pomodoro' },
    startedAt: { type: Date, required: true },
    stoppedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['active', 'stopped', 'expired'], default: 'active', index: true },
    expiresAt: { type: Date, required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('StudyGroupActivity', studyGroupActivitySchema);

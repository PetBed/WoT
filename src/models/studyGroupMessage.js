const mongoose = require('mongoose');

const studyGroupMessageSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyGroup', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyUser', required: true },
    username: { type: String, required: true, maxlength: 40 },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
    type: { type: String, enum: ['message', 'activity'], default: 'message' }
}, { timestamps: true });

studyGroupMessageSchema.index({ groupId: 1, createdAt: -1 });

module.exports = mongoose.model('StudyGroupMessage', studyGroupMessageSchema);

const mongoose = require('mongoose');

const studyGroupMembershipSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyGroup', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyUser', required: true, index: true },
    role: { type: String, enum: ['owner', 'member'], default: 'member' },
    status: { type: String, enum: ['active', 'pending'], default: 'active' },
    privacy: {
        shareLiveStatus: { type: Boolean, default: true },
        shareLeaderboard: { type: Boolean, default: true },
        shareHistory: { type: Boolean, default: true },
        shareSubject: { type: Boolean, default: true },
        shareActivityDetails: { type: Boolean, default: true }
    }
}, { timestamps: true });

studyGroupMembershipSchema.index({ groupId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('StudyGroupMembership', studyGroupMembershipSchema);

const mongoose = require('mongoose');

const studySessionCheckpointSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyUser', required: true, index: true },
	installationId: { type: String, required: true, maxlength: 100 },
	sequence: { type: Number, required: true, min: 1 },
	sessionId: { type: String, required: true, maxlength: 120 },
	snapshot: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

studySessionCheckpointSchema.index({ userId: 1, installationId: 1 }, { unique: true });

module.exports = mongoose.model('StudySessionCheckpoint', studySessionCheckpointSchema);
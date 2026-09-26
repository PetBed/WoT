const mongoose = require('mongoose');

const studyGroupSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 80 },
    code: { type: String, required: true, unique: true, index: true },
    joinPolicy: { type: String, enum: ['public', 'approval'], default: 'public' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyUser', required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('StudyGroup', studyGroupSchema);

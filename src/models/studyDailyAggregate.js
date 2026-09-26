const mongoose = require('mongoose');

const studyDailyAggregateSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyGroup', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyUser', required: true, index: true },
    studyDay: { type: String, required: true, index: true },
    seconds: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

studyDailyAggregateSchema.index({ groupId: 1, userId: 1, studyDay: 1 }, { unique: true });

module.exports = mongoose.model('StudyDailyAggregate', studyDailyAggregateSchema);

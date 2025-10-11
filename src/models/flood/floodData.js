const mongoose = require('mongoose');

const floodDataSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    waterLevel: {
        type: Number,
        required: true
    },
    rainStatus: {
        type: Number, // 0 for No, 1 for Yes
        required: true
    },
    latitude: {
        type: Number,
        default: 0
    },
    longitude: {
        type: Number,
        default: 0
    },
    isAlarmActive: {
        type: Boolean,
        default: false
    },
    floodDuration: {
        type: Number, // in seconds
        default: 0
    },
    rainDuration: {
        type: Number, // in seconds
        default: 0
    },
    isHeavyRainMode: {
        type: Boolean,
        default: false
    }
});

const FloodData = mongoose.model('FloodData', floodDataSchema);

module.exports = FloodData;

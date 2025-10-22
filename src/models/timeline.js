const mongoose = require('mongoose');

// 1. Define the schema for a single event
const eventSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        // Using Date type allows easy sorting later
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    details: {
        type: String,
        trim: true,
        default: '' // Additional details shown on hover
    }
}, { _id: true }); // Ensures each event has a unique ID within the array

// 2. Define the schema for the main timeline
const timelineSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    // Reference to the existing StudyUser model
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudyUser',
        required: true
    },
    // The collection of events for this timeline
    events: [eventSchema]
}, { timestamps: true }); // Adds createdAt and updatedAt fields

const Timeline = mongoose.model('Timeline', timelineSchema);

module.exports = Timeline;
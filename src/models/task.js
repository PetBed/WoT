const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    time: {
        type: Number,
        required: true
    },
    deadline: {
        type: Date,
        required: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudyUser',
        required: true
    }
});

module.exports = mongoose.model('Task', taskSchema);

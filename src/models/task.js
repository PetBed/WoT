const mongoose = require('mongoose');

// Schema for individual sub-tasks
const subTaskSchema = new mongoose.Schema({
    text: { 
        type: String, 
        required: true 
    },
    completed: { 
        type: Boolean, 
        default: false 
    }
});

// Main task schema now includes an array of sub-tasks
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
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'StudyUser', 
        required: true 
    },
    subTasks: [subTaskSchema] // Array of sub-tasks
});

module.exports = mongoose.model('Task', taskSchema);


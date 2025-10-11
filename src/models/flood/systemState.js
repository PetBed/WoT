const mongoose = require('mongoose');

const systemStateSchema = new mongoose.Schema({
    // The final, derived state sent to the ESP32 ('OFF', 'ON', 'EMERGENCY')
    remoteLedState: {
        type: String,
        default: 'OFF',
        enum: ['OFF', 'ON', 'EMERGENCY']
    },
    // The state of the main "Remote LED" toggle (true for on, false for off)
    remoteLedIsOn: {
        type: Boolean,
        default: false
    },
    // The state of the "Emergency Mode" toggle
    emergencyIsActive: {
        type: Boolean,
        default: false
    },
    // Used for single-action commands like silencing the alarm
    lastCommand: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model('SystemState', systemStateSchema);


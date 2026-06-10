const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  department: {
    type: String,
    required: true,
  },
  examDuration: {
    type: Number,
    required: true,
  },
  examCodes: [{
    type: String,
  }],
  examPassword: {
    type: String,
    default: 'EXAM123', // Default password
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Course', CourseSchema);
const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  studentName: {
    type: String,
    required: true,
  },
  studentUsername: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  courseCode: {
    type: String,
    required: true,
  },
  courseName: {
    type: String,
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
  },
  correctAnswers: {
    type: Number,
    required: true,
  },
  incorrectAnswers: {
    type: Number,
    required: true,
  },
  timeSpent: Number,
  violations: {
    type: Number,
    default: 0,
  },
  completedAt: {
    type: Date,
    default: Date.now,
  },
});

const Result = mongoose.model('Result', ResultSchema);
module.exports = Result;
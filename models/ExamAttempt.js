const mongoose = require('mongoose');

const ExamAttemptSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  studentUsername: {
    type: String,
    required: true,
  },
  courseCode: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
    },
    selectedAnswer: String,
    isCorrect: Boolean,
    questionText: String,
  }],
  score: {
    type: Number,
    default: 0,
  },
  totalQuestions: {
    type: Number,
    default: 0,
  },
  percentage: {
    type: Number,
    default: 0,
  },
  violations: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'auto-submitted'],
    default: 'in-progress',
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,
  timeSpent: Number,
});

// Ensure the model is compiled only once
module.exports = mongoose.models.ExamAttempt || mongoose.model('ExamAttempt', ExamAttemptSchema);
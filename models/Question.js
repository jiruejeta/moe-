const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  options: {
    A: { type: String, required: true },
    B: { type: String, required: true },
    C: { type: String, required: true },
    D: { type: String, required: true },
  },
  correctAnswer: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Question = mongoose.model('Question', QuestionSchema);
module.exports = Question;
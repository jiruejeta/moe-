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
  // NEW — draft by default; publish when ready
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
  },
  publishedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

QuestionSchema.index({ courseCode: 1, status: 1 });

module.exports = mongoose.models.Question || mongoose.model('Question', QuestionSchema);
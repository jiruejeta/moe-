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
    uppercase: true,
  },
  // Main department only (name kept in sync for filtering on the student side)
  department: {
    type: String,
    required: true,
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
  },
  examDuration: {
    type: Number, // minutes
    required: true,
  },
  examCodes: [
    {
      type: String,
    },
  ],
  examPassword: {
    type: String,
    default: 'EXAM123',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

CourseSchema.index({ departmentId: 1 });

module.exports = mongoose.models.Course || mongoose.model('Course', CourseSchema);
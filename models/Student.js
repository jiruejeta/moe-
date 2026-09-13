const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  blindStatus: {
    type: String,
    enum: ['Yes', 'No'],
    default: 'No',
  },
  // The main department (e.g., "Grade 9")
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
  },
  // The class / sub-department (e.g., "Grade 9 A")
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
  },
  // Denormalized names for display
  departmentName: {
    type: String,
    default: '',
  },
  className: {
    type: String,
    default: '',
  },
  enrollmentType: {
    type: String,
    default: 'Regular',
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

StudentSchema.index({ classId: 1 });
StudentSchema.index({ departmentId: 1 });

module.exports = mongoose.models.Student || mongoose.model('Student', StudentSchema);
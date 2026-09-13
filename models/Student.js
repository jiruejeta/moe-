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
  // Denormalized names for fast display (kept in sync on create/update)
  departmentName: {
    type: String,
    default: '',
  },
  className: {
    type: String,
    default: '',
  },
  examCentre: {
    type: String,
    required: true,
  },
  institution: {
    type: String,
    required: true,
  },
  institutionId: {
    type: String,
    required: true,
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

// Indexes for fast lookup by class/department
StudentSchema.index({ classId: 1 });
StudentSchema.index({ departmentId: 1 });

module.exports = mongoose.models.Student || mongoose.model('Student', StudentSchema);
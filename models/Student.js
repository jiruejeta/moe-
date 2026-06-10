const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  blindStatus: {
    type: String,
    enum: ['Yes', 'No'],
    default: 'No',
  },
  department: {
    type: String,
    required: true,
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

// IMPORTANT: This is the correct export syntax
const Student = mongoose.model('Student', StudentSchema);
module.exports = Student;
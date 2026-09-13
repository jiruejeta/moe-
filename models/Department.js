const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    default: '',
  },
  // Parent department reference (for sub-departments)
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
  },
  // Level of the department (main or sub)
  level: {
    type: String,
    enum: ['main', 'sub'],
    default: 'main',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
DepartmentSchema.index({ parentId: 1, level: 1 });

const Department = mongoose.model('Department', DepartmentSchema);
module.exports = Department;
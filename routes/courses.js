const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Generate exam codes
function generateExamCodes(courseName, department) {
  const prefix = courseName.substring(0, 2).toUpperCase();
  const deptCode = department.substring(0, 2).toUpperCase();
  const codes = [];
  for (let i = 1; i <= 4; i++) {
    codes.push(`${deptCode}-${prefix}-${1000 + i}`);
  }
  return codes;
}

// Get all courses
router.get('/', verifyToken, async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get courses by department
router.get('/department/:department', verifyToken, async (req, res) => {
  try {
    const courses = await Course.find({ department: req.params.department });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create course (Admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, code, department, examDuration, examPassword } = req.body;
    
    const existingCourse = await Course.findOne({ $or: [{ name }, { code }] });
    if (existingCourse) {
      return res.status(400).json({ message: 'Course name or code already exists' });
    }
    
    const examCodes = generateExamCodes(name, department);
    
    const course = await Course.create({
      name,
      code,
      department,
      examDuration,
      examCodes,
      examPassword: examPassword || 'EXAM123',
    });
    
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update course (Admin only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { examPassword, ...otherUpdates } = req.body;
    
    const updateData = { ...otherUpdates };
    if (examPassword) {
      updateData.examPassword = examPassword;
    }
    
    const course = await Course.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete course (Admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
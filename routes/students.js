const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Get all students (Admin only)
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    console.error('GET students error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single student
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    console.error('GET student error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create student (Admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    console.log('Received student data:', req.body);
    
    const {
      username,
      password,
      fullName,
      blindStatus,
      department,
      examCentre,
      institution,
      institutionId,
      enrollmentType,
      gender,
    } = req.body;
    
    // Validate required fields
    if (!username || !password || !fullName || !department || !examCentre || !institution || !institutionId || !gender) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['username', 'password', 'fullName', 'department', 'examCentre', 'institution', 'institutionId', 'gender']
      });
    }
    
    // Check if student exists
    const existingStudent = await Student.findOne({ username });
    if (existingStudent) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const student = await Student.create({
      username,
      password: hashedPassword,
      fullName,
      blindStatus: blindStatus || 'No',
      department,
      examCentre,
      institution,
      institutionId,
      enrollmentType: enrollmentType || 'Regular',
      gender,
    });
    
    console.log('Student created:', student._id);
    res.status(201).json({ message: 'Student created successfully', student });
    
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update student (Admin only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const updates = req.body;
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    
    const student = await Student.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.json({ message: 'Student updated successfully', student });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete student (Admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
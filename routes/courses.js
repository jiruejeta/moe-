const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Department = require('../models/Department');
const { verifyToken, isAdmin } = require('../middleware/auth');

// ---------- Exam code generator ----------
function generateExamCodes(courseName, departmentName) {
  const coursePrefix = (courseName || 'XX').replace(/\s+/g, '').substring(0, 2).toUpperCase();
  const deptPrefix = (departmentName || 'XX').replace(/\s+/g, '').substring(0, 2).toUpperCase();
  const codes = [];
  for (let i = 1; i <= 4; i++) {
    codes.push(`${deptPrefix}-${coursePrefix}-${1000 + i}`);
  }
  return codes;
}

// ---------- helper: validate a main department ----------
async function resolveMainDepartment(departmentId) {
  if (!departmentId) throw new Error('Department is required');
  const dept = await Department.findById(departmentId);
  if (!dept) throw new Error('Department not found');
  if (dept.level !== 'main') {
    throw new Error('Courses must belong to a main department, not a class');
  }
  return dept;
}

// ---------- GET all courses ----------
router.get('/', verifyToken, async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ---------- GET courses by department name ----------
router.get('/department/:department', verifyToken, async (req, res) => {
  try {
    const courses = await Course.find({ department: req.params.department });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ---------- CREATE course (Admin only) ----------
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, code, departmentId, examDuration, examPassword } = req.body;

    if (!name || !code || !departmentId || !examDuration) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['name', 'code', 'departmentId', 'examDuration'],
      });
    }

    // Validate department
    let dept;
    try {
      dept = await resolveMainDepartment(departmentId);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    // Duplicate checks
    const existing = await Course.findOne({
      $or: [{ name: name.trim() }, { code: code.trim().toUpperCase() }],
    });
    if (existing) {
      return res.status(400).json({ message: 'Course name or code already exists' });
    }

    const examCodes = generateExamCodes(name, dept.name);

    const course = await Course.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      department: dept.name,
      departmentId: dept._id,
      examDuration,
      examCodes,
      examPassword: examPassword || 'EXAM123',
    });

    res.status(201).json(course);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ---------- UPDATE course (Admin only) ----------
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, code, departmentId, examDuration, examPassword } = req.body;

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const updates = {};

    if (name) updates.name = name.trim();
    if (code) updates.code = code.trim().toUpperCase();
    if (examDuration) updates.examDuration = examDuration;
    if (examPassword) updates.examPassword = examPassword;

    if (departmentId) {
      let dept;
      try {
        dept = await resolveMainDepartment(departmentId);
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }
      updates.departmentId = dept._id;
      updates.department = dept.name;
    }

    const updated = await Course.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ---------- DELETE course (Admin only) ----------
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
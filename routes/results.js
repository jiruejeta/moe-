const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const { verifyToken, isAdmin } = require('../middleware/auth');

// GET /api/results
// Optional filters: ?department=... &className=... &courseCode=...
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.className) filter.className = req.query.className;
    if (req.query.courseCode) filter.courseCode = req.query.courseCode;

    const results = await Result.find(filter).sort({ completedAt: -1 });
    res.json(results);
  } catch (error) {
    console.error('GET results error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/results/department/:department
router.get('/department/:department', verifyToken, isAdmin, async (req, res) => {
  try {
    const results = await Result.find({ department: req.params.department })
      .sort({ completedAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/results/class/:className
router.get('/class/:className', verifyToken, isAdmin, async (req, res) => {
  try {
    const results = await Result.find({ className: req.params.className })
      .sort({ completedAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/results/student/:studentId
router.get('/student/:studentId', verifyToken, async (req, res) => {
  try {
    const results = await Result.find({ studentId: req.params.studentId })
      .sort({ completedAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/results/:id
router.get('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) return res.status(404).json({ message: 'Result not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
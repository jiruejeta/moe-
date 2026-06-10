const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const ExamAttempt = require('../models/ExamAttempt');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Get all results (Admin only)
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const results = await Result.find().sort({ completedAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get results by department
router.get('/department/:department', verifyToken, isAdmin, async (req, res) => {
  try {
    const results = await Result.find({ department: req.params.department }).sort({ completedAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get results by student
router.get('/student/:studentId', verifyToken, async (req, res) => {
  try {
    const results = await Result.find({ studentId: req.params.studentId }).sort({ completedAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single result
router.get('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get flagged questions for a student
router.get('/flagged/:studentId/:courseCode', verifyToken, isAdmin, async (req, res) => {
  try {
    const attempt = await ExamAttempt.findOne({
      studentId: req.params.studentId,
      courseCode: req.params.courseCode,
      status: 'completed',
    });
    
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }
    
    const flaggedQuestions = attempt.answers.filter(a => !a.isCorrect);
    res.json(flaggedQuestions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export results (CSV format)
router.get('/export/csv', verifyToken, isAdmin, async (req, res) => {
  try {
    const results = await Result.find().sort({ completedAt: -1 });
    
    const csvHeader = 'Student Name,Username,Department,Course,Score,Total Questions,Percentage,Time Spent (min),Violations,Completed At\n';
    const csvRows = results.map(r => {
      return `${r.studentName},${r.studentUsername},${r.department},${r.courseName},${r.score},${r.totalQuestions},${r.percentage},${r.timeSpent || 0},${r.violations || 0},${r.completedAt}`;
    }).join('\n');
    
    const csv = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=exam_results.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
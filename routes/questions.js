const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const { verifyToken, isAdmin, isStudent } = require('../middleware/auth');

// =========================================================
// GET /api/questions/course/:courseCode
// Admin sees everything; students see only published
// =========================================================
router.get('/course/:courseCode', verifyToken, async (req, res) => {
  try {
    const filter = { courseCode: req.params.courseCode };

    // Only admins can see drafts
    if (req.user.role !== 'admin') {
      filter.status = 'published';
    }

    const questions = await Question.find(filter).sort({ createdAt: 1 });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =========================================================
// GET /api/questions/course/:courseCode/count
// Returns total + published + draft counts
// =========================================================
router.get('/course/:courseCode/count', verifyToken, async (req, res) => {
  try {
    const courseCode = req.params.courseCode;
    const total = await Question.countDocuments({ courseCode });
    const published = await Question.countDocuments({ courseCode, status: 'published' });
    const draft = await Question.countDocuments({ courseCode, status: 'draft' });
    res.json({ total, published, draft });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =========================================================
// GET /api/questions/:id
// =========================================================
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =========================================================
// POST /api/questions  (create one — draft by default)
// =========================================================
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { courseCode, department, text, options, correctAnswer } = req.body;
    const question = await Question.create({
      courseCode,
      department,
      text,
      options,
      correctAnswer,
      status: 'draft',
    });
    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =========================================================
// POST /api/questions/bulk  (bulk upload — draft by default)
// =========================================================
router.post('/bulk', verifyToken, isAdmin, async (req, res) => {
  try {
    const { questions, courseCode, department } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'questions array is required' });
    }

    const payload = questions.map((q) => ({
      ...q,
      courseCode,
      department,
      status: 'draft',
    }));

    const created = await Question.insertMany(payload);
    res.status(201).json({
      message: `${created.length} question(s) uploaded as DRAFT`,
      count: created.length,
      questions: created,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =========================================================
// PUT /api/questions/:id  (update single)
// =========================================================
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =========================================================
// POST /api/questions/publish/:courseCode
// Publish ALL drafts for a course
// =========================================================
router.post('/publish/:courseCode', verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await Question.updateMany(
      { courseCode: req.params.courseCode, status: 'draft' },
      { $set: { status: 'published', publishedAt: new Date() } }
    );
    res.json({
      message: `${result.modifiedCount} question(s) published`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =========================================================
// POST /api/questions/unpublish/:courseCode
// Move ALL published questions back to draft
// =========================================================
router.post('/unpublish/:courseCode', verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await Question.updateMany(
      { courseCode: req.params.courseCode, status: 'published' },
      { $set: { status: 'draft', publishedAt: null } }
    );
    res.json({
      message: `${result.modifiedCount} question(s) moved back to draft`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =========================================================
// PUT /api/questions/:id/publish  (publish one)
// =========================================================
router.put('/:id/publish', verifyToken, isAdmin, async (req, res) => {
  try {
    const q = await Question.findByIdAndUpdate(
      req.params.id,
      { status: 'published', publishedAt: new Date() },
      { new: true }
    );
    if (!q) return res.status(404).json({ message: 'Question not found' });
    res.json(q);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =========================================================
// PUT /api/questions/:id/draft  (move one back to draft)
// =========================================================
router.put('/:id/draft', verifyToken, isAdmin, async (req, res) => {
  try {
    const q = await Question.findByIdAndUpdate(
      req.params.id,
      { status: 'draft', publishedAt: null },
      { new: true }
    );
    if (!q) return res.status(404).json({ message: 'Question not found' });
    res.json(q);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =========================================================
// DELETE /api/questions/:id
// =========================================================
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
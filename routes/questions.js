const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Get questions by course
router.get('/course/:courseCode', verifyToken, async (req, res) => {
  try {
    const questions = await Question.find({ courseCode: req.params.courseCode });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single question
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create single question (Admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { courseCode, department, text, options, correctAnswer } = req.body;
    
    const question = await Question.create({
      courseCode,
      department,
      text,
      options,
      correctAnswer,
    });
    
    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Bulk upload questions (Admin only)
router.post('/bulk', verifyToken, isAdmin, async (req, res) => {
  try {
    const { questions, courseCode, department } = req.body;
    
    const questionsWithMeta = questions.map(q => ({
      ...q,
      courseCode,
      department,
    }));
    
    const createdQuestions = await Question.insertMany(questionsWithMeta);
    res.status(201).json({ message: `${createdQuestions.length} questions uploaded`, questions: createdQuestions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update question (Admin only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete question (Admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
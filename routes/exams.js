const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ExamAttempt = require('../models/ExamAttempt');
const Question = require('../models/Question');
const Result = require('../models/Result');
const Course = require('../models/Course');
const Student = require('../models/Student');
const { verifyToken, isStudent } = require('../middleware/auth');

// Start exam
router.post('/start', verifyToken, isStudent, async (req, res) => {
  try {
    const { courseCode } = req.body;
    const studentId = req.user.id;
    const studentUsername = req.user.username;
    const department = req.user.department;
    
    console.log('Starting exam for:', { studentId, courseCode });
    
    // Convert studentId to ObjectId
    const objectId = new mongoose.Types.ObjectId(studentId);
    
    // Check if already has in-progress exam
    const existingAttempt = await ExamAttempt.findOne({
      studentId: objectId,
      courseCode,
      status: 'in-progress',
    });
    
    if (existingAttempt) {
      return res.json({ attempt: existingAttempt, message: 'Resuming exam' });
    }
    
    // Get course details
    const course = await Course.findOne({ code: courseCode });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Get all questions for this course
    const questions = await Question.find({ courseCode });
    const totalQuestions = questions.length;
    
    const attempt = await ExamAttempt.create({
      studentId: objectId,
      studentUsername,
      courseCode,
      department,
      answers: [],
      totalQuestions,
      status: 'in-progress',
    });
    
    console.log('Exam started:', attempt._id);
    res.status(201).json({ attempt, totalQuestions, examDuration: course.examDuration });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save answer
router.post('/save-answer', verifyToken, isStudent, async (req, res) => {
  try {
    const { attemptId, questionId, selectedAnswer, questionText } = req.body;
    
    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }
    
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    const isCorrect = selectedAnswer === question.correctAnswer;
    
    // Find if question already answered
    const answerIndex = attempt.answers.findIndex(a => a.questionId && a.questionId.toString() === questionId);
    
    if (answerIndex !== -1) {
      // Update existing answer
      attempt.answers[answerIndex] = {
        questionId,
        selectedAnswer,
        isCorrect,
        questionText: questionText || question.text,
      };
    } else {
      // Add new answer
      attempt.answers.push({
        questionId,
        selectedAnswer,
        isCorrect,
        questionText: questionText || question.text,
      });
    }
    
    await attempt.save();
    res.json({ message: 'Answer saved', isCorrect });
  } catch (error) {
    console.error('Save answer error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit exam
router.post('/submit', verifyToken, isStudent, async (req, res) => {
  try {
    const { attemptId, violations, timeSpent } = req.body;
    
    console.log('=== SUBMIT EXAM ===');
    console.log('Received:', { attemptId, violations, timeSpent });
    
    if (!attemptId) {
      return res.status(400).json({ message: 'Attempt ID is required' });
    }
    
    // Convert attemptId to ObjectId
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(attemptId);
    } catch (err) {
      console.log('Invalid attemptId format:', attemptId);
      return res.status(400).json({ message: 'Invalid attempt ID format' });
    }
    
    const attempt = await ExamAttempt.findById(objectId);
    if (!attempt) {
      console.log('Attempt not found:', attemptId);
      return res.status(404).json({ message: 'Attempt not found' });
    }
    
    console.log('Found attempt:', attempt._id);
    console.log('Student ID:', attempt.studentId);
    console.log('Total questions:', attempt.totalQuestions);
    console.log('Answers count:', attempt.answers?.length || 0);
    
    // Calculate score
    let correctCount = 0;
    if (attempt.answers && attempt.answers.length > 0) {
      attempt.answers.forEach(answer => {
        if (answer.isCorrect) correctCount++;
      });
    }
    
    const score = correctCount;
    const percentage = attempt.totalQuestions > 0 ? (correctCount / attempt.totalQuestions) * 100 : 0;
    
    console.log('Score:', score, 'Percentage:', percentage);
    
    // Update attempt
    attempt.score = score;
    attempt.percentage = percentage;
    attempt.violations = violations || 0;
    attempt.status = 'completed';
    attempt.completedAt = new Date();
    attempt.timeSpent = timeSpent || 0;
    
    await attempt.save();
    console.log('Attempt saved');
    
    // Get student details
    let student = null;
    try {
      student = await Student.findById(attempt.studentId);
      console.log('Student found:', student ? student.fullName : 'No');
    } catch (err) {
      console.log('Student lookup error:', err.message);
    }
    
    // Get course details
    let course = null;
    try {
      course = await Course.findOne({ code: attempt.courseCode });
      console.log('Course found:', course ? course.name : 'No');
    } catch (err) {
      console.log('Course lookup error:', err.message);
    }
    
    // Create result
    const result = await Result.create({
      studentId: attempt.studentId,
      studentName: student?.fullName || 'Unknown Student',
      studentUsername: attempt.studentUsername || 'unknown',
      department: attempt.department || 'Unknown',
      courseCode: attempt.courseCode,
      courseName: course?.name || attempt.courseCode,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions || 0,
      percentage: attempt.percentage || 0,
      correctAnswers: correctCount,
      incorrectAnswers: (attempt.totalQuestions || 0) - correctCount,
      timeSpent: timeSpent || 0,
      violations: violations || 0,
    });
    
    console.log('Result created:', result._id);
    console.log('=== SUBMIT SUCCESS ===');
    
    res.json({ message: 'Exam submitted successfully' });
    
  } catch (error) {
    console.error('=== SUBMIT ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Log violation
router.post('/log-violation', verifyToken, isStudent, async (req, res) => {
  try {
    const { attemptId, violationType } = req.body;
    
    const attempt = await ExamAttempt.findById(attemptId);
    if (attempt) {
      attempt.violations = (attempt.violations || 0) + 1;
      await attempt.save();
      console.log('Violation logged for attempt:', attemptId, 'Type:', violationType);
    }
    
    res.json({ message: 'Violation logged' });
  } catch (error) {
    console.error('Log violation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get exam attempt
router.get('/attempt/:attemptId', verifyToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(attemptId);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid attempt ID format' });
    }
    
    const attempt = await ExamAttempt.findById(objectId);
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }
    
    // Check if user is authorized (admin or the student who took the exam)
    if (req.user.role !== 'admin' && req.user.id !== attempt.studentId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    res.json(attempt);
  } catch (error) {
    console.error('Get attempt error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
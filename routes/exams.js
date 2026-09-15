const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ExamAttempt = require('../models/ExamAttempt');
const Question = require('../models/Question');
const Result = require('../models/Result');
const Course = require('../models/Course');
const Student = require('../models/Student');
const { verifyToken, isStudent } = require('../middleware/auth');

// =========================================================
// START EXAM
// =========================================================
router.post('/start', verifyToken, isStudent, async (req, res) => {
  try {
    const { courseCode } = req.body;
    const studentId = req.user.id;

    console.log('Starting exam for:', { studentId, courseCode });

    if (!courseCode) {
      return res.status(400).json({ message: 'Exam code is required' });
    }

    // Load the student so we can grab departmentName + className
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Find course by code OR by exam code
    const course = await Course.findOne({
      $or: [{ code: courseCode }, { examCodes: courseCode }],
    });
    if (!course) {
      return res.status(404).json({ message: 'Invalid exam code' });
    }

    // Resume an in-progress attempt if one exists
    const existingAttempt = await ExamAttempt.findOne({
      studentId: student._id,
      courseCode: course.code,
      status: 'in-progress',
    });
    if (existingAttempt) {
      return res.json({
        attempt: existingAttempt,
        totalQuestions: existingAttempt.totalQuestions,
        examDuration: course.examDuration,
        message: 'Resuming exam',
      });
    }

    // ONLY published questions count toward the exam
    const totalQuestions = await Question.countDocuments({
      courseCode: course.code,
      status: 'published',
    });

    if (totalQuestions === 0) {
      return res.status(400).json({
        message: 'This exam has no published questions yet. Please contact your administrator.',
      });
    }

    const attempt = await ExamAttempt.create({
      studentId: student._id,
      studentUsername: student.username,
      courseCode: course.code,
      department: student.departmentName || '',
      className: student.className || '',
      answers: [],
      totalQuestions,
      status: 'in-progress',
      startedAt: new Date(),
    });

    console.log('Exam started:', attempt._id);
    res.status(201).json({
      attempt,
      totalQuestions,
      examDuration: course.examDuration,
    });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =========================================================
// SAVE ANSWER
// =========================================================
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

    // Students can only answer published questions
    if (question.status !== 'published') {
      return res.status(403).json({ message: 'This question is not available' });
    }

    const isCorrect = selectedAnswer === question.correctAnswer;

    const answerIndex = attempt.answers.findIndex(
      (a) => a.questionId && a.questionId.toString() === questionId
    );

    if (answerIndex !== -1) {
      attempt.answers[answerIndex] = {
        questionId,
        selectedAnswer,
        isCorrect,
        questionText: questionText || question.text,
      };
    } else {
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

// =========================================================
// SUBMIT EXAM
// =========================================================
router.post('/submit', verifyToken, isStudent, async (req, res) => {
  try {
    const { attemptId, violations, timeSpent } = req.body;

    console.log('=== SUBMIT EXAM ===');
    console.log('Received:', { attemptId, violations, timeSpent });

    if (!attemptId) {
      return res.status(400).json({ message: 'Attempt ID is required' });
    }

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

    // Calculate score
    let correctCount = 0;
    if (attempt.answers && attempt.answers.length > 0) {
      attempt.answers.forEach((a) => {
        if (a.isCorrect) correctCount++;
      });
    }

    const score = correctCount;
    const percentage =
      attempt.totalQuestions > 0
        ? (correctCount / attempt.totalQuestions) * 100
        : 0;

    attempt.score = score;
    attempt.percentage = percentage;
    attempt.violations = violations || 0;
    attempt.status = 'completed';
    attempt.completedAt = new Date();
    attempt.timeSpent = timeSpent || 0;

    await attempt.save();
    console.log('Attempt saved');

    // Load student + course
    let student = null;
    try {
      student = await Student.findById(attempt.studentId);
    } catch (err) {
      console.log('Student lookup error:', err.message);
    }

    let course = null;
    try {
      course = await Course.findOne({ code: attempt.courseCode });
    } catch (err) {
      console.log('Course lookup error:', err.message);
    }

    // Create the result
    const result = await Result.create({
      studentId: attempt.studentId,
      studentName: student?.fullName || 'Unknown Student',
      studentUsername: attempt.studentUsername || 'unknown',
      department: attempt.department || 'Unknown',
      className: student?.className || attempt.className || '',
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
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =========================================================
// LOG VIOLATION
// =========================================================
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

// =========================================================
// GET EXAM ATTEMPT
// =========================================================
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

    if (
      req.user.role !== 'admin' &&
      req.user.id !== attempt.studentId.toString()
    ) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(attempt);
  } catch (error) {
    console.error('Get attempt error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
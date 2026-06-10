const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Admin = require('../models/Admin');
const Student = require('../models/Student');


// =======================
// 🔐 ADMIN LOGIN
// =======================
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const admin = await Admin.findOne({ username });

    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: admin._id,
        username: admin.username,
        role: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none', // IMPORTANT for Vercel + Render
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: 'Admin login successful',
      role: 'admin'
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});


// =======================
// 🎓 STUDENT LOGIN
// =======================
router.post('/student/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const student = await Student.findOne({ username });

    if (!student) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, student.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: student._id,
        username: student.username,
        role: 'student',
        department: student.department
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: 'Student login successful',
      role: 'student',
      student: {
        id: student._id,
        username: student.username,
        fullName: student.fullName,
        department: student.department,
        institution: student.institution,
        gender: student.gender
      }
    });

  } catch (error) {
    console.error('Student login error:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});


// =======================
// 🆕 CREATE ADMIN (ONE TIME)
// =======================
router.post('/create-admin', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const exists = await Admin.findOne({ username });

    if (exists) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      username,
      password: hashedPassword
    });

    return res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        id: admin._id,
        username: admin.username
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});


// =======================
// 🚪 LOGOUT
// =======================
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    sameSite: 'none',
    secure: process.env.NODE_ENV === 'production'
  });

  return res.json({ message: 'Logged out successfully' });
});


// =======================
// 👤 GET CURRENT USER
// =======================
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.auth_token;

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    return res.json({
      success: true,
      user: decoded
    });

  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
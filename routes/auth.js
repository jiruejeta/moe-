const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Student = require('../models/Student');

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });
    
    res.json({ message: 'Login successful', role: 'admin' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/// Student Login
router.post('/student/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const student = await Student.findOne({ username });
    if (!student) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, student.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: student._id, username: student.username, role: 'student', department: student.department },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });
    
    // Return ALL student data
    res.json({ 
      message: 'Login successful', 
      role: 'student', 
      student: {
        id: student._id,
        username: student.username,
        fullName: student.fullName,
        department: student.department,
        blindStatus: student.blindStatus,
        examCentre: student.examCentre,
        institution: student.institution,
        institutionId: student.institutionId,
        enrollmentType: student.enrollmentType,
        gender: student.gender,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create Admin (One-time use)
router.post('/create-admin', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      username,
      password: hashedPassword,
    });
    
    res.status(201).json({ 
      success: true,
      message: 'Admin created successfully', 
      admin: { 
        id: admin._id,
        username: admin.username 
      } 
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.auth_token;
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user: decoded });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
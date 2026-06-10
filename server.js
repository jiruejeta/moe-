const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS configuration - Allow all origins for testing
app.use(cors({
  origin: true, // This allows all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With']
}));

// Also handle preflight requests
app.options('*', cors());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!', environment: process.env.NODE_ENV });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/results', require('./routes/results'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
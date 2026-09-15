const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

console.log('🔵 STARTING SERVER...');

// ========== CORS CONFIGURATION ==========
// Every origin that is allowed to call this API.
// Includes Vercel production, Vercel previews, localhost, and the env var.
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://bako-highschool.vercel.app',
  'https://moe-exam.vercel.app',
  'https://moe-exam-frontend-lsr1.vercel.app',
  'https://moe-exam-frontend-lsr1-git-main-jiruejetas-projects.vercel.app',
  'https://moe-exam-frontend-lsr1-tr2rnv0sg-jiruejetas-projects.vercel.app',
  process.env.CORS_ORIGIN,   // dynamic fallback from Render env vars
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Only set the header if the origin is in the allow-list
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Cookie, X-Requested-With'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// ========== REQUEST LOGGER ==========
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

app.use(express.json());
app.use(cookieParser());

// ========== TEST ROUTE ==========
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend is working!',
    environment: process.env.NODE_ENV || 'production',
  });
});

// ========== DATABASE ==========
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));

// ========== ROUTES ==========
console.log('🔵 Loading routes...');
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/results', require('./routes/results'));
console.log('🔵 Routes loaded');

// ========== START ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔵 Test: http://localhost:${PORT}/api/test`);
});
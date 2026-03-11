const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 4000;
const SECRET_KEY = 'your_jwt_secret';

// generated-by-copilot: general rate limiter applied to all API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

// generated-by-copilot: stricter rate limiter for auth endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' },
});

app.use(cors());
app.use(bodyParser.json());
// generated-by-copilot: general rate limiter for all API routes; auth routes additionally use authLimiter for stricter per-endpoint limiting
app.use('/api', apiLimiter);


const isTest = process.env.TEST_MODE === '1';
const booksFile = isTest
  ? path.join(__dirname, 'data', 'test-books.json')
  : path.join(__dirname, 'data', 'books.json');
const usersFile = isTest
  ? path.join(__dirname, 'data', 'test-users.json')
  : path.join(__dirname, 'data', 'users.json');

// Helper functions
function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}



// Use central API router
const createApiRouter = require('./routes');
app.use('/api', createApiRouter({
  usersFile,
  booksFile,
  readJSON,
  writeJSON,
  authenticateToken,
  SECRET_KEY,
  authLimiter,
}));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

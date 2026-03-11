const express = require('express');
const jwt = require('jsonwebtoken');

function createAuthRouter({ usersFile, readJSON, writeJSON, SECRET_KEY, authLimiter }) {
  const router = express.Router();
  // generated-by-copilot: use authLimiter if provided, otherwise use a no-op middleware
  const limiter = authLimiter || ((req, res, next) => next());

  router.post('/register', limiter, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });
    const users = readJSON(usersFile);
    if (users.find(u => u.username === username)) {
      return res.status(409).json({ message: 'User already exists' });
    }
    users.push({ username, password, favorites: [] });
    writeJSON(usersFile, users);
    res.status(201).json({ message: 'User registered' });
  });

  router.post('/login', limiter, (req, res) => {
    const { username, password } = req.body;
    const users = readJSON(usersFile);
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  });

  return router;
}

module.exports = createAuthRouter;

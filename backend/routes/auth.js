const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const router = express.Router();

const JWT_SECRET = 'your_jwt_secret_key_for_hackathon';

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  const sql = 'SELECT * FROM users WHERE username = ?';
  db.get(sql, [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

// Register (for demo purposes)
router.post('/register', (req, res) => {
  const { username, password, role } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  const sql = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
  db.run(sql, [username, hashedPassword, role || 'staff'], function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(201).json({
      message: 'User created successfully',
      userId: this.lastID
    });
  });
});

module.exports = router;
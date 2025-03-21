const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
  const { userId, password } = req.body;

  // Input validation
  if (!userId || !password) {
    return res.status(400).json({ message: 'User ID and password are required' });
  }

  try {
    // Check if user exists
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found. Please register first.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.json({ token, userId: user.userId });
  } catch (err) {
    console.error('Error in login route:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Optional: Separate registration route (if needed)
/*
router.post('/register', async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ message: 'User ID and password are required' });
  }

  try {
    let user = await User.findOne({ userId });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ userId, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Error in register route:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
*/

module.exports = router;
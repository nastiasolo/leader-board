const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const registrationDisabledMessage =
  'Self-registration is disabled. Ask an admin to create your account.';

function signUserToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      is_admin: user.is_admin,
      is_display: user.is_display,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
}

router.post('/register', (request, response) => {
  return response.status(403).json({
    error: registrationDisabledMessage,
  });
});

router.post('/login', async (request, response) => {
  const { email, password } = request.body;

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password
  ) {
    return response.status(400).json({
      error: 'Email and password are required',
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, email, name, password_hash, photo_url, is_admin, is_display
       FROM employees
       WHERE email = $1`,
      [email.trim().toLowerCase()],
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return response.status(401).json({
        error: 'Invalid email or password',
      });
    }

    return response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        photo_url: user.photo_url,
        is_admin: user.is_admin,
        is_display: user.is_display,
      },
      token: signUserToken(user),
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authMiddleware, async (request, response) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, photo_url, is_admin, is_display, created_at
       FROM employees
       WHERE id = $1`,
      [request.user.id],
    );
    const user = result.rows[0];

    if (!user) {
      return response.status(404).json({ error: 'User not found' });
    }

    return response.json({
      id: user.id,
      email: user.email,
      name: user.name,
      photo_url: user.photo_url,
      is_admin: user.is_admin,
      is_display: user.is_display,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware, requireAdmin);

function parseUserId(value) {
  const userId = Number(value);
  return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
}

function getUserInput(body) {
  const values = body && typeof body === 'object' ? body : {};
  const { email, password, name, photo_url: photoUrl, is_admin: isAdmin } = values;

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    typeof name !== 'string' ||
    !email.trim() ||
    !password ||
    !name.trim()
  ) {
    return {
      error: 'Email, password, and name are required',
    };
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters' };
  }

  if (photoUrl !== undefined && photoUrl !== null && typeof photoUrl !== 'string') {
    return { error: 'Photo URL must be a string' };
  }

  if (isAdmin !== undefined && typeof isAdmin !== 'boolean') {
    return { error: 'Admin role must be true or false' };
  }

  return {
    email: email.trim().toLowerCase(),
    password,
    name: name.trim(),
    photoUrl: photoUrl?.trim() || null,
    isAdmin: isAdmin ?? false,
  };
}

router.get('/users', async (request, response) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, photo_url, is_admin, created_at
       FROM employees
       ORDER BY created_at DESC, id DESC`,
    );

    return response.json(result.rows);
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/sales', async (request, response) => {
  try {
    const result = await pool.query(
      `SELECT sales.id,
              sales.employee_id,
              sales.amount,
              sales.commission,
              sales.date::text AS date,
              sales.created_at,
              employees.name,
              employees.email,
              employees.photo_url
       FROM sales
       JOIN employees ON employees.id = sales.employee_id
       ORDER BY sales.date DESC, sales.created_at DESC, sales.id DESC`,
    );

    return response.json(result.rows);
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Failed to fetch sales' });
  }
});

router.post('/users', async (request, response) => {
  const user = getUserInput(request.body);
  if (user.error) {
    return response.status(400).json({ error: user.error });
  }

  try {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const result = await pool.query(
      `INSERT INTO employees (email, password_hash, name, photo_url, is_admin)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, photo_url, is_admin, created_at`,
      [user.email, passwordHash, user.name, user.photoUrl, user.isAdmin],
    );

    return response.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return response.status(409).json({ error: 'Email already exists' });
    }

    console.error(error);
    return response.status(500).json({ error: 'Failed to create user' });
  }
});

router.delete('/users/:id', async (request, response) => {
  const userId = parseUserId(request.params.id);
  if (!userId) {
    return response.status(400).json({ error: 'Invalid user id' });
  }

  if (userId === request.user.id) {
    return response.status(400).json({
      error: 'You cannot delete your own user',
    });
  }

  try {
    const result = await pool.query(
      'DELETE FROM employees WHERE id = $1 RETURNING id',
      [userId],
    );

    if (result.rowCount === 0) {
      return response.status(404).json({ error: 'User not found' });
    }

    return response.status(204).send();
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;

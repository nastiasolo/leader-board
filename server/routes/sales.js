const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const {
  parseSaleAmounts,
  validateSaleAmounts,
  validateSaleDate,
} = require('../lib/saleValidation');

const router = express.Router();

function denyDisplayAccount(request, response, next) {
  if (request.user.is_display) {
    return response.status(403).json({
      error: 'Display accounts are read-only',
    });
  }

  return next();
}

router.use(authMiddleware, denyDisplayAccount);

function parseSaleId(value) {
  const saleId = Number(value);
  return Number.isSafeInteger(saleId) && saleId > 0 ? saleId : null;
}

function getSaleInput(body) {
  const values = body && typeof body === 'object' ? body : {};
  const { amount, commission } = parseSaleAmounts(values);
  const amountError = validateSaleAmounts(amount, commission);
  const dateError = validateSaleDate(values.date);

  if (amountError || dateError) {
    return { error: amountError || dateError };
  }

  return { amount, commission, date: values.date };
}

function canManageSale(user, sale) {
  return user.is_admin || sale.employee_id === user.id;
}

router.get('/', async (request, response) => {
  try {
    const result = await pool.query(
      `SELECT id, amount, commission, date::text AS date, created_at
       FROM sales
       WHERE employee_id = $1
       ORDER BY date DESC, created_at DESC`,
      [request.user.id],
    );

    return response.json(result.rows);
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Failed to fetch sales' });
  }
});

router.post('/', async (request, response) => {
  const sale = getSaleInput(request.body);
  if (sale.error) {
    return response.status(400).json({ error: sale.error });
  }

  try {
    const result = await pool.query(
      `INSERT INTO sales (employee_id, amount, commission, date)
       VALUES ($1, $2, $3, $4::date)
       RETURNING id, amount, commission, date::text AS date, created_at`,
      [request.user.id, sale.amount, sale.commission, sale.date],
    );

    return response.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Failed to create sale' });
  }
});

router.put('/:id', async (request, response) => {
  const saleId = parseSaleId(request.params.id);
  if (!saleId) {
    return response.status(400).json({ error: 'Invalid sale id' });
  }

  const saleInput = getSaleInput(request.body);
  if (saleInput.error) {
    return response.status(400).json({ error: saleInput.error });
  }

  try {
    const existing = await pool.query(
      'SELECT employee_id FROM sales WHERE id = $1',
      [saleId],
    );
    const sale = existing.rows[0];

    if (!sale) {
      return response.status(404).json({ error: 'Sale not found' });
    }
    if (!canManageSale(request.user, sale)) {
      return response.status(403).json({
        error: 'Not allowed to edit this sale',
      });
    }

    const result = await pool.query(
      `UPDATE sales
       SET amount = $1, commission = $2, date = $3::date
       WHERE id = $4
       RETURNING id, employee_id, amount, commission,
                 date::text AS date, created_at`,
      [saleInput.amount, saleInput.commission, saleInput.date, saleId],
    );

    return response.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Failed to update sale' });
  }
});

router.delete('/:id', async (request, response) => {
  const saleId = parseSaleId(request.params.id);
  if (!saleId) {
    return response.status(400).json({ error: 'Invalid sale id' });
  }

  try {
    const existing = await pool.query(
      'SELECT employee_id FROM sales WHERE id = $1',
      [saleId],
    );
    const sale = existing.rows[0];

    if (!sale) {
      return response.status(404).json({ error: 'Sale not found' });
    }
    if (!canManageSale(request.user, sale)) {
      return response.status(403).json({
        error: 'Not allowed to delete this sale',
      });
    }

    await pool.query('DELETE FROM sales WHERE id = $1', [saleId]);
    return response.status(204).send();
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Failed to delete sale' });
  }
});

module.exports = router;

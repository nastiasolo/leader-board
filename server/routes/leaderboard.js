const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const periodStartExpressions = new Map([
  ['week', "DATE_TRUNC('week', CURRENT_DATE)::date"],
  ['month', "DATE_TRUNC('month', CURRENT_DATE)::date"],
  ['year', "DATE_TRUNC('year', CURRENT_DATE)::date"],
]);

router.use(authMiddleware);

router.get('/', async (request, response) => {
  const requestedPeriod = request.query.period;
  let period = 'month';

  if (requestedPeriod) {
    if (typeof requestedPeriod !== 'string') {
      return response.status(400).json({
        error: 'Invalid period. Use week, month, or year.',
      });
    }

    period = requestedPeriod.toLowerCase();
  }

  const startExpression = periodStartExpressions.get(period);
  if (!startExpression) {
    return response.status(400).json({
      error: 'Invalid period. Use week, month, or year.',
    });
  }

  try {
    const rangeResult = await pool.query(
      `SELECT ${startExpression}::text AS start,
              CURRENT_DATE::text AS end`,
    );
    const range = rangeResult.rows[0];
    const result = await pool.query(
      `SELECT employees.id AS employee_id,
              employees.name,
              employees.photo_url,
              SUM(sales.amount)::numeric(12, 2) AS total_sales
       FROM employees
       JOIN sales ON sales.employee_id = employees.id
       WHERE sales.date >= $1::date AND sales.date <= $2::date
       GROUP BY employees.id, employees.name, employees.photo_url
       ORDER BY SUM(sales.amount) DESC, employees.id`,
      [range.start, range.end],
    );

    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      employee_id: row.employee_id,
      name: row.name,
      photo_url: row.photo_url,
      total_sales: Number(row.total_sales),
    }));

    return response.json({ period, ...range, leaderboard });
  } catch (error) {
    console.error(error);
    return response.status(500).json({
      error: 'Failed to fetch leaderboard',
    });
  }
});

module.exports = router;

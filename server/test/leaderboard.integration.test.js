const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { after, before, beforeEach, test } = require('node:test');

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'Set TEST_DATABASE_URL to run leaderboard integration tests.',
  );
}

process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET = 'test-secret-for-sales-leaderboard';

const app = require('../app');
const { pool } = require('../config/db');
const { demoAccounts, resetDemoData } = require('../lib/demoSeed');
const schemaPath = path.join(__dirname, '../../database/schema.sql');
let server;
let baseUrl;

before(async () => {
  // Given: the test database has the app schema and demo accounts
  const schema = readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  await resetDemoData(pool);

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
  // Given: each test starts from the same demo dataset
  await resetDemoData(pool);
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  await pool.end();
});

async function login(account) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: account.email,
      password: account.password,
    }),
  });

  return (await response.json()).token;
}

async function requestLeaderboard(period, token) {
  const query = period ? `?period=${encodeURIComponent(period)}` : '';
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${baseUrl}/api/leaderboard${query}`, {
    headers,
  });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  return { response, body };
}

// Describe: leaderboard access and period filters
test(
  'Given no token, When requesting rankings, Then access is denied',
  async () => {
    // Given: a request without a bearer token

    // When: the client requests the leaderboard
    const { response, body } = await requestLeaderboard('month');

    // Then: the endpoint requires authentication
    assert.equal(response.status, 401);
    assert.deepEqual(body, { error: 'Authentication required' });
  },
);

test(
  'Given no period, When requesting rankings, Then the current month is used',
  async () => {
    // Given: an authenticated employee
    const token = await login(demoAccounts[1]);

    // When: the employee requests the leaderboard without a period
    const { response, body } = await requestLeaderboard(null, token);
    const expectedRange = await pool.query(
      `SELECT DATE_TRUNC('month', CURRENT_DATE)::date::text AS start,
              CURRENT_DATE::text AS end`,
    );

    // Then: the response includes the current month range and ranking
    assert.equal(response.status, 200);
    assert.equal(body.period, 'month');
    assert.equal(body.start, expectedRange.rows[0].start);
    assert.equal(body.end, expectedRange.rows[0].end);
    assert.equal(Array.isArray(body.leaderboard), true);
  },
);

for (const period of ['week', 'month', 'year']) {
  test(
    `Given ${period}, When ranking, Then amount totals are ordered`,
    async () => {
      // Given: an employee token and seeded sales
      const token = await login(demoAccounts[1]);

      // When: the employee requests this period
      const { response, body } = await requestLeaderboard(period, token);
      const expectedRange = await pool.query(
        `SELECT DATE_TRUNC($1, CURRENT_DATE)::date::text AS start,
                CURRENT_DATE::text AS end`,
        [period],
      );
      const expectedTotals = await pool.query(
        `SELECT employees.id AS employee_id,
                employees.name,
                employees.photo_url,
                SUM(sales.amount)::numeric(12, 2) AS total_sales
         FROM employees
         JOIN sales ON sales.employee_id = employees.id
         WHERE sales.date >= $1::date AND sales.date <= $2::date
         GROUP BY employees.id, employees.name, employees.photo_url
         ORDER BY SUM(sales.amount) DESC, employees.id`,
        [expectedRange.rows[0].start, expectedRange.rows[0].end],
      );

      // Then: dates, ranks, and totals match sales in that period
      assert.equal(response.status, 200);
      assert.equal(body.period, period);
      assert.equal(body.start, expectedRange.rows[0].start);
      assert.equal(body.end, expectedRange.rows[0].end);
      assert.deepEqual(
        body.leaderboard.map((entry) => ({
          rank: entry.rank,
          employee_id: entry.employee_id,
          name: entry.name,
          photo_url: entry.photo_url,
          total_sales: entry.total_sales,
        })),
        expectedTotals.rows.map((entry, index) => ({
          rank: index + 1,
          employee_id: entry.employee_id,
          name: entry.name,
          photo_url: entry.photo_url,
          total_sales: Number(entry.total_sales),
        })),
      );
    },
  );
}

test(
  'Given an unsupported period, When ranking, Then the API returns 400',
  async () => {
    // Given: an authenticated employee and unsupported period
    const token = await login(demoAccounts[1]);

    // When: the employee requests a quarter ranking
    const { response, body } = await requestLeaderboard('quarter', token);

    // Then: the API lists the supported periods
    assert.equal(response.status, 400);
    assert.deepEqual(body, {
      error: 'Invalid period. Use week, month, or year.',
    });
  },
);

test(
  'Given no sales in a period, When ranking, Then the employee is omitted',
  async () => {
    // Given: an employee with no sales in the seeded data
    const token = await login(demoAccounts[1]);
    await pool.query(
      `INSERT INTO employees (email, password_hash, name)
       VALUES ('no-sales@demo.com', 'not-a-login', 'No Sales')`,
    );

    // When: the yearly leaderboard is requested
    const { response, body } = await requestLeaderboard('year', token);

    // Then: only employees with sales appear
    assert.equal(response.status, 200);
    assert.equal(
      body.leaderboard.some((entry) => entry.name === 'No Sales'),
      false,
    );
  },
);

test(
  'Given sale commissions, When ranking, Then only sale amounts are summed',
  async () => {
    // Given: an employee token and the current month range
    const token = await login(demoAccounts[1]);

    // When: the current month leaderboard is requested
    const { response, body } = await requestLeaderboard('month', token);

    // Then: the total equals sale amount and excludes commission
    assert.equal(response.status, 200);
    const leader = body.leaderboard[0];
    const totals = await pool.query(
      `SELECT SUM(amount)::numeric(12, 2) AS amount,
              SUM(commission)::numeric(12, 2) AS commission
       FROM sales
       WHERE employee_id = $1 AND date >= $2::date AND date <= $3::date`,
      [leader.employee_id, body.start, body.end],
    );

    assert.equal(leader.total_sales, Number(totals.rows[0].amount));
    assert.notEqual(
      leader.total_sales,
      Number(totals.rows[0].amount) + Number(totals.rows[0].commission),
    );
  },
);

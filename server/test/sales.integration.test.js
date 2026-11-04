const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { after, before, beforeEach, test } = require('node:test');

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Set TEST_DATABASE_URL to run sales integration tests.');
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
  // Given: the test database has the schema and demo accounts
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

async function requestSales(pathname, options = {}) {
  const headers = {};

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined
      ? undefined
      : JSON.stringify(options.body),
  });
  let body = null;

  if (response.status !== 204) {
    const contentType = response.headers.get('content-type') || '';
    body = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
  }

  return { response, body };
}

async function findSaleId(email) {
  const result = await pool.query(
    `SELECT sales.id
     FROM sales
     JOIN employees ON employees.id = sales.employee_id
     WHERE employees.email = $1
     ORDER BY sales.id
     LIMIT 1`,
    [email],
  );

  return result.rows[0].id;
}

async function today() {
  const result = await pool.query('SELECT CURRENT_DATE::text AS date');
  return result.rows[0].date;
}

// Describe: employee sales access
test('Given no token, When listing sales, Then access is denied', async () => {
  // Given: a request without a bearer token

  // When: the client asks for sales
  const { response, body } = await requestSales('/api/sales');

  // Then: authentication is required
  assert.equal(response.status, 401);
  assert.deepEqual(body, { error: 'Authentication required' });
});

test(
  'Given a display account, When accessing data, Then only the leaderboard is readable',
  async () => {
    // Given: a token for the dedicated display account
    const token = await login({
      email: 'screen@demo.com',
      password: 'DemoPass123!',
    });

    // When: the display account reads the leaderboard and accesses sales
    const leaderboardResult = await requestSales(
      '/api/leaderboard?period=month',
      { token },
    );
    const listResult = await requestSales('/api/sales', { token });
    const createResult = await requestSales('/api/sales', {
      method: 'POST',
      token,
      body: {
        amount: 100,
        commission: 10,
        date: await today(),
      },
    });

    // Then: leaderboard access works while sales access is denied
    assert.equal(leaderboardResult.response.status, 200);
    assert.equal(listResult.response.status, 403);
    assert.equal(createResult.response.status, 403);
    assert.deepEqual(listResult.body, {
      error: 'Display accounts are read-only',
    });
    assert.deepEqual(createResult.body, {
      error: 'Display accounts are read-only',
    });
  },
);

test('Given employee, When listing, Then only own sales return', async () => {
  // Given: a seeded employee with demo sales
  const token = await login(demoAccounts[1]);

  // When: the employee lists sales
  const { response, body } = await requestSales('/api/sales', { token });
  const employeeSales = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM sales
     WHERE employee_id = (
       SELECT id FROM employees WHERE email = $1
     )`,
    [demoAccounts[1].email],
  );

  // Then: the response contains only the employee's sales
  assert.equal(response.status, 200);
  assert.equal(body.length, employeeSales.rows[0].count);
  assert.equal(body.every((sale) => 'commission' in sale), true);
  assert.equal(
    body.every((sale) => /^\d{4}-\d{2}-\d{2}$/.test(sale.date)),
    true,
  );
});

test('Given values, When creating, Then the sale is stored', async () => {
  // Given: an employee token and a valid date
  const token = await login(demoAccounts[1]);
  const date = await today();

  // When: the employee creates a sale with a commission
  const { response, body } = await requestSales('/api/sales', {
    method: 'POST',
    token,
    body: { amount: 1250.5, commission: 125, date },
  });

  // Then: the sale is created with both monetary values
  assert.equal(response.status, 201);
  assert.equal(body.amount, '1250.50');
  assert.equal(body.commission, '125.00');
  assert.equal(body.date, date);
});

test('Given zeros, When creating, Then the sale is rejected', async () => {
  // Given: an employee token and an empty sale
  const token = await login(demoAccounts[1]);

  // When: the employee submits zero amount and commission
  const { response, body } = await requestSales('/api/sales', {
    method: 'POST',
    token,
    body: { amount: 0, commission: 0, date: await today() },
  });

  // Then: the API requires at least one positive value
  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    error: 'At least one of amount or commission must be greater than zero',
  });
});

test('Given negative commission, When creating, Then reject', async () => {
  // Given: an employee token and a negative commission
  const token = await login(demoAccounts[1]);

  // When: the employee submits the invalid sale
  const { response, body } = await requestSales('/api/sales', {
    method: 'POST',
    token,
    body: { amount: 100, commission: -1, date: await today() },
  });

  // Then: the API returns an amount validation error
  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    error: 'Amount and commission must be valid non-negative numbers',
  });
});

test('Given invalid date, When creating, Then it is rejected', async () => {
  // Given: an employee token and an impossible calendar date
  const token = await login(demoAccounts[1]);

  // When: the employee submits the invalid date
  const { response, body } = await requestSales('/api/sales', {
    method: 'POST',
    token,
    body: { amount: 100, commission: 0, date: '2026-02-30' },
  });

  // Then: the API reports the invalid date format
  assert.equal(response.status, 400);
  assert.deepEqual(body, { error: 'Invalid amount or date format' });
});

test('Given an owner, When updating, Then new values are saved', async () => {
  // Given: an employee token and their sale
  const token = await login(demoAccounts[1]);
  const saleId = await findSaleId(demoAccounts[1].email);
  const date = await today();

  // When: the owner updates the sale
  const { response, body } = await requestSales(`/api/sales/${saleId}`, {
    method: 'PUT',
    token,
    body: { amount: 2500, commission: 250, date },
  });

  // Then: the API returns the updated sale
  assert.equal(response.status, 200);
  assert.equal(body.amount, '2500.00');
  assert.equal(body.commission, '250.00');
});

test('Given another employee, When editing, Then reject', async () => {
  // Given: an employee token and a sale owned by another employee
  const token = await login(demoAccounts[1]);
  const saleId = await findSaleId(demoAccounts[2].email);

  // When: the employee attempts to update that sale
  const { response, body } = await requestSales(`/api/sales/${saleId}`, {
    method: 'PUT',
    token,
    body: { amount: 2500, commission: 250, date: await today() },
  });

  // Then: the API rejects the change
  assert.equal(response.status, 403);
  assert.deepEqual(body, { error: 'Not allowed to edit this sale' });
});

test('Given admin, When editing another sale, Then it is allowed', async () => {
  // Given: an admin token and an employee-owned sale
  const token = await login(demoAccounts[0]);
  const saleId = await findSaleId(demoAccounts[2].email);

  // When: the admin updates that sale
  const { response, body } = await requestSales(`/api/sales/${saleId}`, {
    method: 'PUT',
    token,
    body: { amount: 3200, commission: 320, date: await today() },
  });

  // Then: the API returns the updated employee sale
  assert.equal(response.status, 200);
  assert.equal(body.amount, '3200.00');
  assert.equal(body.commission, '320.00');
});

test('Given the owner, When deleting a sale, Then it is removed', async () => {
  // Given: an employee token and their sale
  const token = await login(demoAccounts[1]);
  const saleId = await findSaleId(demoAccounts[1].email);

  // When: the owner deletes the sale
  const { response } = await requestSales(`/api/sales/${saleId}`, {
    method: 'DELETE',
    token,
  });

  // Then: the API returns no content and the database row is gone
  assert.equal(response.status, 204);
  const result = await pool.query(
    'SELECT id FROM sales WHERE id = $1',
    [saleId],
  );
  assert.equal(result.rowCount, 0);
});

test('Given another owner, When deleting, Then access is denied', async () => {
  // Given: an employee token and another employee's sale
  const token = await login(demoAccounts[1]);
  const saleId = await findSaleId(demoAccounts[2].email);

  // When: the employee attempts to delete the sale
  const { response, body } = await requestSales(`/api/sales/${saleId}`, {
    method: 'DELETE',
    token,
  });

  // Then: the API rejects the deletion
  assert.equal(response.status, 403);
  assert.deepEqual(body, { error: 'Not allowed to delete this sale' });
});

test('Given admin, When deleting another sale, Then allowed', async () => {
  // Given: an admin token and an employee-owned sale
  const token = await login(demoAccounts[0]);
  const saleId = await findSaleId(demoAccounts[2].email);

  // When: the admin deletes that sale
  const { response } = await requestSales(`/api/sales/${saleId}`, {
    method: 'DELETE',
    token,
  });

  // Then: the API returns no content
  assert.equal(response.status, 204);
  const result = await pool.query(
    'SELECT id FROM sales WHERE id = $1',
    [saleId],
  );
  assert.equal(result.rowCount, 0);
});

test('Given invalid id, When updating, Then 400 is returned', async () => {
  // Given: an employee token and a non-numeric sale id
  const token = await login(demoAccounts[1]);

  // When: the employee updates the invalid sale id
  const { response, body } = await requestSales('/api/sales/invalid', {
    method: 'PUT',
    token,
    body: { amount: 100, commission: 0, date: await today() },
  });

  // Then: the API reports an invalid identifier
  assert.equal(response.status, 400);
  assert.deepEqual(body, { error: 'Invalid sale id' });
});

test('Given missing sale, When updating, Then 404 is returned', async () => {
  // Given: an employee token and a sale id that does not exist
  const token = await login(demoAccounts[1]);

  // When: the employee updates the missing sale id
  const { response, body } = await requestSales('/api/sales/999999', {
    method: 'PUT',
    token,
    body: { amount: 100, commission: 0, date: await today() },
  });

  // Then: the API reports that the sale was not found
  assert.equal(response.status, 404);
  assert.deepEqual(body, { error: 'Sale not found' });
});

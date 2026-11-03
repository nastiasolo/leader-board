const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { after, before, beforeEach, test } = require('node:test');

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Set TEST_DATABASE_URL to run admin integration tests.');
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
  // Given: the test database has the application schema and demo accounts.
  const schema = readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  await resetDemoData(pool);

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
  // Given: each scenario starts from the same fake employee accounts.
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

async function requestAdmin(pathname, options = {}) {
  const headers = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${baseUrl}/api/admin${pathname}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined
      ? undefined
      : JSON.stringify(options.body),
  });
  const body = response.status === 204 ? null : await response.json();

  return { response, body };
}

test(
  'Given no token, When listing users, Then admin authentication is required',
  async () => {
    // Given: a request without an Authorization header.

    // When: a visitor requests the user list.
    const { response, body } = await requestAdmin('/users');

    // Then: the admin route rejects the unauthenticated request.
    assert.equal(response.status, 401);
    assert.deepEqual(body, { error: 'Authentication required' });
  },
);

test(
  'Given a regular employee, When listing users, Then admin access is denied',
  async () => {
    // Given: a token belonging to a non-admin demo employee.
    const token = await login(demoAccounts[1]);

    // When: the employee requests the user list.
    const { response, body } = await requestAdmin('/users', { token });

    // Then: the API returns the admin-only access error.
    assert.equal(response.status, 403);
    assert.deepEqual(body, { error: 'Admin access required' });
  },
);

test(
  'Given the admin, When listing users, Then safe employee profiles are returned',
  async () => {
    // Given: a token for the seeded admin account.
    const token = await login(demoAccounts[0]);

    // When: the admin requests all employees.
    const { response, body } = await requestAdmin('/users', { token });

    // Then: all fake employees are listed without password hashes.
    assert.equal(response.status, 200);
    assert.equal(body.length, demoAccounts.length);
    assert.equal(body.some((user) => 'password_hash' in user), false);
    assert.deepEqual(
      body.map((user) => user.email).sort(),
      demoAccounts.map((user) => user.email).sort(),
    );
  },
);

test(
  'Given valid employee details, When the admin creates a user, Then the account can log in',
  async () => {
    // Given: valid details for a new non-admin employee.
    const token = await login(demoAccounts[0]);
    const account = {
      name: 'Sam Rivera',
      email: ' SAM.RIVERA@EXAMPLE.COM ',
      password: 'DemoPass456!',
      photo_url: '',
      is_admin: false,
    };

    // When: the admin creates the employee account.
    const { response, body } = await requestAdmin('/users', {
      method: 'POST',
      token,
      body: account,
    });

    // Then: the API returns a normalized safe profile.
    assert.equal(response.status, 201);
    assert.equal(body.email, 'sam.rivera@example.com');
    assert.equal(body.name, 'Sam Rivera');
    assert.equal(body.is_admin, false);
    assert.equal(body.photo_url, null);
    assert.equal('password_hash' in body, false);

    // When: the new employee logs in with the supplied password.
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sam.rivera@example.com',
        password: account.password,
      }),
    });

    // Then: the created account authenticates as a regular employee.
    assert.equal(loginResponse.status, 200);
    assert.equal((await loginResponse.json()).user.is_admin, false);
  },
);

test(
  'Given an existing email, When the admin creates another user, Then a conflict is returned',
  async () => {
    // Given: the admin and an email already present in the demo data.
    const token = await login(demoAccounts[0]);
    const existingEmployee = demoAccounts[1];

    // When: the admin attempts to create a duplicate account.
    const { response, body } = await requestAdmin('/users', {
      method: 'POST',
      token,
      body: {
        name: 'Duplicate Employee',
        email: existingEmployee.email,
        password: 'DemoPass456!',
      },
    });

    // Then: the API reports the email conflict.
    assert.equal(response.status, 409);
    assert.deepEqual(body, { error: 'Email already exists' });
  },
);

test(
  'Given the admin account, When deleting its own user, Then the request is rejected',
  async () => {
    // Given: the seeded admin token and its user id.
    const token = await login(demoAccounts[0]);
    const profile = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const admin = await profile.json();

    // When: the admin attempts to delete their own account.
    const { response, body } = await requestAdmin(`/users/${admin.id}`, {
      method: 'DELETE',
      token,
    });

    // Then: self-deletion is rejected with a clear response.
    assert.equal(response.status, 400);
    assert.deepEqual(body, { error: 'You cannot delete your own user' });
  },
);

test(
  'Given another employee, When the admin deletes the user, Then the account is removed',
  async () => {
    // Given: the admin token and an employee id from the database.
    const token = await login(demoAccounts[0]);
    const employeeResult = await pool.query(
      'SELECT id FROM employees WHERE email = $1',
      [demoAccounts[1].email],
    );
    const employeeId = employeeResult.rows[0].id;

    // When: the admin deletes that employee account.
    const { response, body } = await requestAdmin(`/users/${employeeId}`, {
      method: 'DELETE',
      token,
    });

    // Then: the account is removed with an empty success response.
    assert.equal(response.status, 204);
    assert.equal(body, null);
    const remaining = await pool.query(
      'SELECT id FROM employees WHERE id = $1',
      [employeeId],
    );
    assert.equal(remaining.rowCount, 0);
  },
);

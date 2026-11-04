const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { after, before, test } = require('node:test');
const jwt = require('jsonwebtoken');

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Set TEST_DATABASE_URL to run auth integration tests.');
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

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  await pool.end();
});

// Describe: login and current user endpoints
test(
  'Given an admin, When logging in, Then a JWT is returned',
  async () => {
    // Given: the seeded admin credentials
    const admin = demoAccounts[0];

    // When: the admin submits their credentials
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ` ${admin.email.toUpperCase()} `,
        password: admin.password,
      }),
    });

    // Then: the API returns a safe profile and admin token
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.user.email, admin.email);
    assert.equal(body.user.is_admin, true);
    assert.equal('password_hash' in body.user, false);
    assert.equal(jwt.verify(body.token, process.env.JWT_SECRET).is_admin, true);
  },
);

test(
  'Given a wrong password, When logging in, Then credentials are rejected',
  async () => {
    // Given: a real demo email and an incorrect password
    const employee = demoAccounts[1];

    // When: the employee submits the incorrect password
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: employee.email, password: 'incorrect' }),
    });

    // Then: the API does not expose which field failed
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: 'Invalid email or password',
    });
  },
);

test(
  'Given no token, When requesting a profile, Then access is denied',
  async () => {
    // Given: a request without an Authorization header

    // When: the client requests its current profile
    const response = await fetch(`${baseUrl}/api/auth/me`);

    // Then: the API requires authentication
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: 'Authentication required',
    });
  },
);

test(
  'Given a valid token, When requesting a profile, Then profile is returned',
  async () => {
    // Given: a token from a successful employee login
    const employee = demoAccounts[1];
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: employee.email,
        password: employee.password,
      }),
    });
    const login = await loginResponse.json();

    // When: the employee requests their current profile
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${login.token}` },
    });

    // Then: the API returns the profile without a password hash
    assert.equal(response.status, 200);
    const profile = await response.json();
    assert.equal(profile.email, employee.email);
    assert.equal(profile.name, employee.name);
    assert.equal(profile.is_admin, false);
    assert.equal('password_hash' in profile, false);
  },
);

test(
  'Given a display account, When logging in, Then its read-only role is returned',
  async () => {
    // Given: the dedicated display account's demo credentials
    const displayAccount = {
      email: 'screen@demo.com',
      password: 'DemoPass123!',
    };

    // When: the display account signs in and requests its profile
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(displayAccount),
    });
    const login = await loginResponse.json();
    const profileResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${login.token}` },
    });
    const profile = await profileResponse.json();

    // Then: both the login response and verified token identify a display account
    assert.equal(loginResponse.status, 200);
    assert.equal(login.user.is_display, true);
    assert.equal(jwt.verify(login.token, process.env.JWT_SECRET).is_display, true);
    assert.equal(profileResponse.status, 200);
    assert.equal(profile.is_display, true);
  },
);

test(
  'Given a bad token, When requesting a profile, Then access is denied',
  async () => {
    // Given: an invalid bearer token

    // When: the client requests its current profile
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer invalid-token' },
    });

    // Then: the API rejects the token
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: 'Invalid or expired token',
    });
  },
);

test(
  'Given registration is disabled, When registering, Then API returns 403',
  async () => {
    // Given: a visitor submits new account details

    // When: the visitor requests account registration
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Visitor', email: 'visitor@example.com' }),
    });

    // Then: account creation remains an admin-only operation
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      error: 'Self-registration is disabled. ' +
        'Ask an admin to create your account.',
    });
  },
);

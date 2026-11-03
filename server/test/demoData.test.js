const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { demoAccounts, resetDemoData } = require('../lib/demoSeed');

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Set TEST_DATABASE_URL to run database integration tests.');
}

const pool = new Pool({ connectionString: databaseUrl });
const schemaPath = path.join(__dirname, '../../database/schema.sql');

before(async () => {
  // Given: the dedicated test database is available
  const schema = readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
});

after(async () => {
  await pool.end();
});

// Describe: demo seed data
test(
  'Given demo data, When seeding, Then users and sales are created',
  async () => {
    // Given: the test database contains the application schema
    await resetDemoData(pool);

    // When: demo account and sales records are queried
    const users = await pool.query(
      `SELECT email, password_hash, is_admin, photo_url
       FROM employees
       ORDER BY email`,
    );
    const sales = await pool.query(
      'SELECT COUNT(*)::int AS count FROM sales',
    );

    // Then: demo logins exist and their passwords are hashed
    assert.equal(users.rowCount, demoAccounts.length);
    assert.equal(users.rows.filter((user) => user.is_admin).length, 1);
    assert.equal(sales.rows[0].count >= 8, true);

    const photosByEmail = Object.fromEntries(
      users.rows.map((user) => [user.email, user.photo_url]),
    );
    assert.deepEqual(photosByEmail, {
      'admin@demo.com': '/avatars/avery.png',
      'alex@demo.com': '/avatars/alex.png',
      'jordan@demo.com': '/avatars/jordan.png',
      'taylor@demo.com': '/avatars/taylor.png',
    });

    const admin = users.rows.find((user) => user.is_admin);
    assert.equal(
      await bcrypt.compare(demoAccounts[0].password, admin.password_hash),
      true,
    );
  },
);

test(
  'Given visitor changes, When reseeding, Then demo data is restored',
  async () => {
    // Given: the demo data and one visitor-created employee
    await resetDemoData(pool);
    await pool.query(
      `INSERT INTO employees (email, password_hash, name)
       VALUES ('visitor@example.com', 'not-a-login', 'Visitor')`,
    );

    // When: the manual demo reset is run again
    await resetDemoData(pool);

    // Then: the visitor record is removed and demo users return
    const visitor = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM employees
       WHERE email = 'visitor@example.com'`,
    );
    const users = await pool.query(
      'SELECT COUNT(*)::int AS count FROM employees',
    );

    assert.equal(visitor.rows[0].count, 0);
    assert.equal(users.rows[0].count, demoAccounts.length);
  },
);

test(
  'Given demo data, When checking today, Then every employee has a sale',
  async () => {
    // Given: a freshly seeded demo database
    await resetDemoData(pool);

    // When: sales recorded today are counted
    const result = await pool.query(
      `SELECT COUNT(DISTINCT employee_id)::int AS count
       FROM sales
       WHERE date = CURRENT_DATE`,
    );

    // Then: every demo employee has a current-period sale
    assert.equal(result.rows[0].count, demoAccounts.length);
  },
);

test(
  'Given a sale, When commission is set, Then DKK values are stored',
  async () => {
    // Given: the demo employee exists
    await resetDemoData(pool);
    const employee = await pool.query(
      'SELECT id FROM employees WHERE email = $1',
      [demoAccounts[1].email],
    );

    // When: a sale with a commission is stored
    const sale = await pool.query(
      `INSERT INTO sales (employee_id, amount, commission, date)
       VALUES ($1, 1250.00, 125.00, CURRENT_DATE)
       RETURNING amount, commission`,
      [employee.rows[0].id],
    );

    // Then: both monetary values are retained to two decimal places
    assert.equal(sale.rows[0].amount, '1250.00');
    assert.equal(sale.rows[0].commission, '125.00');
  },
);

test(
  'Given a sale, When commission is negative, Then it is rejected',
  async () => {
    // Given: the demo employee exists
    await resetDemoData(pool);
    const employee = await pool.query(
      'SELECT id FROM employees WHERE email = $1',
      [demoAccounts[1].email],
    );

    // When: a sale is saved with a negative commission
    const invalidSale = pool.query(
      `INSERT INTO sales (employee_id, amount, commission, date)
       VALUES ($1, 1000.00, -1.00, CURRENT_DATE)`,
      [employee.rows[0].id],
    );

    // Then: the database constraint rejects the invalid value
    await assert.rejects(invalidSale, { code: '23514' });
  },
);

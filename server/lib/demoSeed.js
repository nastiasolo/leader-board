const bcrypt = require('bcrypt');

const demoAccounts = [
  {
    email: 'admin@demo.com',
    name: 'Avery Johnson',
    isAdmin: true,
    password: 'DemoPass123!',
  },
  {
    email: 'alex@demo.com',
    name: 'Alex Morgan',
    isAdmin: false,
    password: 'DemoPass123!',
  },
  {
    email: 'jordan@demo.com',
    name: 'Jordan Lee',
    isAdmin: false,
    password: 'DemoPass123!',
  },
  {
    email: 'taylor@demo.com',
    name: 'Taylor Kim',
    isAdmin: false,
    password: 'DemoPass123!',
  },
];

const demoSales = [
  { email: 'admin@demo.com', amount: 6000, commission: 600, daysAgo: 0 },
  { email: 'admin@demo.com', amount: 8200, commission: 820, daysAgo: 2 },
  { email: 'admin@demo.com', amount: 6300, commission: 630, daysAgo: 16 },
  { email: 'admin@demo.com', amount: 5400, commission: 540, daysAgo: 72 },
  { email: 'alex@demo.com', amount: 7000, commission: 700, daysAgo: 0 },
  { email: 'alex@demo.com', amount: 9100, commission: 910, daysAgo: 1 },
  { email: 'alex@demo.com', amount: 4700, commission: 470, daysAgo: 12 },
  { email: 'alex@demo.com', amount: 3600, commission: 360, daysAgo: 58 },
  { email: 'jordan@demo.com', amount: 5800, commission: 580, daysAgo: 0 },
  { email: 'jordan@demo.com', amount: 7600, commission: 760, daysAgo: 3 },
  { email: 'jordan@demo.com', amount: 6800, commission: 680, daysAgo: 20 },
  { email: 'jordan@demo.com', amount: 5900, commission: 590, daysAgo: 86 },
  { email: 'taylor@demo.com', amount: 5100, commission: 510, daysAgo: 0 },
  { email: 'taylor@demo.com', amount: 6900, commission: 690, daysAgo: 5 },
  { email: 'taylor@demo.com', amount: 5200, commission: 520, daysAgo: 25 },
  { email: 'taylor@demo.com', amount: 4100, commission: 410, daysAgo: 104 },
];

async function resetDemoData(pool) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `TRUNCATE TABLE sales, employees
       RESTART IDENTITY CASCADE`,
    );

    const employeeIds = new Map();

    for (const account of demoAccounts) {
      const passwordHash = await bcrypt.hash(account.password, 10);
      const result = await client.query(
        `INSERT INTO employees (email, password_hash, name, is_admin)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [account.email, passwordHash, account.name, account.isAdmin],
      );

      employeeIds.set(account.email, result.rows[0].id);
    }

    for (const sale of demoSales) {
      await client.query(
        `INSERT INTO sales (employee_id, amount, commission, date)
         VALUES ($1, $2, $3, CURRENT_DATE - ($4 * INTERVAL '1 day'))`,
        [
          employeeIds.get(sale.email),
          sale.amount,
          sale.commission,
          sale.daysAgo,
        ],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { demoAccounts, resetDemoData };

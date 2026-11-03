const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { pool } = require('../config/db');
const { resetDemoData } = require('../lib/demoSeed');

async function seedDemo() {
  try {
    await resetDemoData(pool);
    console.log('Demo employees and sales have been reset.');
  } finally {
    await pool.end();
  }
}

seedDemo().catch((error) => {
  console.error('Could not reset demo data.', error);
  process.exitCode = 1;
});

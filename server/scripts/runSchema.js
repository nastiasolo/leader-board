const { readFileSync } = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { pool } = require('../config/db');
const schemaPath = path.join(__dirname, '../../database/schema.sql');

async function runSchema() {
  const schema = readFileSync(schemaPath, 'utf8');

  try {
    await pool.query(schema);
    console.log('Database schema is ready.');
  } finally {
    await pool.end();
  }
}

runSchema().catch((error) => {
  console.error('Could not apply the database schema.', error);
  process.exitCode = 1;
});

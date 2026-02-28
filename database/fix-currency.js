const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', database: 'triumph', user: 'postgres', password: '123', port: 5432 });

async function fix() {
  const r = await pool.query("UPDATE app_settings SET value = 'Rs' WHERE key = 'currency_symbol'");
  console.log('Currency updated, rows:', r.rowCount);
  await pool.end();
}
fix().catch(console.error);

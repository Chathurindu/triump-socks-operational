const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', database: 'triumph', user: 'postgres', password: '123', port: 5432 });

async function fixPasswords() {
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('password123', 10);
  console.log('New hash:', hash);
  const verify = await bcrypt.compare('password123', hash);
  console.log('Verify:', verify);
  const result = await pool.query('UPDATE users SET password_hash = $1', [hash]);
  console.log('Updated', result.rowCount, 'user records');
  await pool.end();
}

fixPasswords().catch(console.error);

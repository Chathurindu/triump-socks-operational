const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host:     'localhost',
  port:     5432,
  database: 'triumph',
  user:     'postgres',
  password: '123',
});

async function initDB() {
  const client = await pool.connect();
  try {
    console.log('🔌 Connected to PostgreSQL...');

    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    console.log('📐 Creating schema...');
    await client.query(schema);
    console.log('✅ Schema created.');

    const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    console.log('🌱 Seeding data...');
    await client.query(seed);
    console.log('✅ Seed data inserted.');

    console.log('\n🎉 Database initialized successfully!');
    console.log('📧 Login: admin@triumphsocks.com | Password: password123');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDB();

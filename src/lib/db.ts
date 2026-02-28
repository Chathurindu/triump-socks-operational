import { Pool } from 'pg';

const isSupabase = (process.env.DB_HOST || '').includes('supabase');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'triumph',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
  max:      isSupabase ? 5 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on('error', (err) => {
  console.error('Unexpected DB client error', err);
});

export const db = {
  query: (text: string, params?: unknown[]) => pool.query(text, params),
  getClient: () => pool.connect(),
};

export default pool;

import { Pool } from 'pg';

const isSupabase = (process.env.DB_HOST || '').includes('supabase');
const isServerless = !!process.env.VERCEL;

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'triumph',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
  // Serverless: keep 1 conn per function instance; local dev: 20
  max:      isServerless ? 1 : (isSupabase ? 5 : 20),
  idleTimeoutMillis: isServerless ? 10000 : 30000,
  connectionTimeoutMillis: 10000,
  ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on('error', (err) => {
  console.error('Unexpected DB client error', err);
});

// Force UTF-8 on every connection (PgBouncer/Supabase pooler may not negotiate it)
pool.on('connect', (client) => {
  client.query("SET client_encoding TO 'UTF8'");
});

export const db = {
  query: (text: string, params?: unknown[]) => pool.query(text, params),
  getClient: () => pool.connect(),
};

export default pool;

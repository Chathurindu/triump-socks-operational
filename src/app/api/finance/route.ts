import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type   = searchParams.get('type') ?? '';
  const from   = searchParams.get('from') ?? '';
  const to     = searchParams.get('to') ?? '';
  const search = searchParams.get('search') ?? '';

  try {
    const res = await db.query(`
      SELECT t.*, a.name AS account_name
      FROM transactions t
      LEFT JOIN accounts a ON a.id = t.account_id
      WHERE ($1 = '' OR t.txn_type = $1)
        AND ($2 = '' OR t.txn_date >= $2::date)
        AND ($3 = '' OR t.txn_date <= $3::date)
        AND ($4 = '' OR t.description ILIKE $4 OR t.category ILIKE $4)
      ORDER BY t.txn_date DESC, t.created_at DESC
      LIMIT 200
    `, [type, from, to, `%${search}%`]);

    const summary = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN txn_type='income'  THEN amount END),0) AS total_income,
        COALESCE(SUM(CASE WHEN txn_type='expense' THEN amount END),0) AS total_expense
      FROM transactions
      WHERE ($1='' OR txn_date >= $1::date) AND ($2='' OR txn_date <= $2::date)
    `, [from, to]);

    const accounts = await db.query(`SELECT * FROM accounts ORDER BY type, name`);

    return NextResponse.json({ data: res.rows, summary: summary.rows[0], accounts: accounts.rows });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch finance data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const res = await db.query(
      `INSERT INTO transactions (txn_date,txn_type,category,description,amount,account_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [b.txn_date,b.txn_type,b.category,b.description,b.amount,b.account_id]
    );
    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

const SORT_MAP: Record<string, string> = {
  txn_date: 't.txn_date', txn_type: 't.txn_type', category: 't.category',
  description: 't.description', amount: 't.amount', account_name: 'a.name',
  created_at: 't.created_at',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get('meta') === '1') {
    const accts = await db.query(`SELECT id, name, type FROM accounts ORDER BY type, name`);
    return NextResponse.json({ accounts: accts.rows });
  }

  const search  = searchParams.get('search') ?? '';
  const type    = searchParams.get('type') ?? '';
  const from    = searchParams.get('from') ?? '';
  const to      = searchParams.get('to') ?? '';
  const page    = parseInt(searchParams.get('page') ?? '1');
  const limit   = parseInt(searchParams.get('limit') ?? '15');
  const offset  = (page - 1) * limit;
  const sortKey = searchParams.get('sortKey') ?? 'created_at';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'ASC' : 'DESC';
  const orderCol = SORT_MAP[sortKey] ?? 't.created_at';

  try {
    const typeF = type ? `AND t.txn_type = '${type.replace(/'/g, "''")}'` : '';
    const fromF = from ? `AND t.txn_date >= '${from}'` : '';
    const toF   = to   ? `AND t.txn_date <= '${to}'` : '';
    const whereBase = `
      FROM transactions t
      LEFT JOIN accounts a ON a.id = t.account_id
      WHERE (t.description ILIKE $1 OR t.category ILIKE $1 OR a.name ILIKE $1)
      ${typeF} ${fromF} ${toF}
    `;
    const [res, countRes, summaryRes, accountsRes] = await Promise.all([
      db.query(`SELECT t.*, a.name AS account_name ${whereBase} ORDER BY ${orderCol} ${sortDir} LIMIT $2 OFFSET $3`, [`%${search}%`, limit, offset]),
      db.query(`SELECT COUNT(*) ${whereBase}`, [`%${search}%`]),
      db.query(`
        SELECT COUNT(*)::int AS total_txns,
          COALESCE(SUM(amount) FILTER (WHERE txn_type='income'),0)::numeric AS total_income,
          COALESCE(SUM(amount) FILTER (WHERE txn_type='expense'),0)::numeric AS total_expense
        FROM transactions
        WHERE ($1='' OR txn_date >= $1::date) AND ($2='' OR txn_date <= $2::date)
      `, [from || '', to || '']),
      db.query(`SELECT * FROM accounts ORDER BY type, name`),
    ]);
    return NextResponse.json({
      data: res.rows,
      total: parseInt(countRes.rows[0].count),
      summary: summaryRes.rows[0],
      accounts: accountsRes.rows,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch finance data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireRole('manager');
  if (guard) return guard;
  try {
    const b = await req.json();
    const res = await db.query(
      `INSERT INTO transactions (txn_date,txn_type,category,description,amount,account_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [b.txn_date, b.txn_type, b.category || null, b.description || null, b.amount || 0, b.account_id || null]
    );
    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireRole('manager');
  if (guard) return guard;
  try {
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await db.query(
      `UPDATE transactions SET txn_date=$1, txn_type=$2, category=$3, description=$4, amount=$5, account_id=$6
       WHERE id=$7 RETURNING *`,
      [b.txn_date, b.txn_type, b.category || null, b.description || null, b.amount || 0, b.account_id || null, b.id]
    );
    return NextResponse.json({ data: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireRole('admin');
  if (guard) return guard;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    await db.query(`DELETE FROM transactions WHERE id=$1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

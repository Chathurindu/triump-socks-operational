import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, getSession } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);

  // Return categories for form
  if (searchParams.get('meta') === '1') {
    const cats = await db.query(`SELECT * FROM expense_categories ORDER BY name`);
    return NextResponse.json({ categories: cats.rows });
  }

  // Monthly report endpoint
  if (searchParams.get('report') === '1') {
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));
    try {
      const [monthly, byCategory, totals] = await Promise.all([
        db.query(
          `SELECT EXTRACT(MONTH FROM expense_date)::int AS month,
                  COALESCE(SUM(amount),0)::numeric AS total
           FROM expenses
           WHERE EXTRACT(YEAR FROM expense_date) = $1
           GROUP BY month ORDER BY month`,
          [year]
        ),
        db.query(
          `SELECT ec.name AS category, ec.color,
                  COALESCE(SUM(e.amount),0)::numeric AS total,
                  COUNT(*)::int AS count
           FROM expenses e
           LEFT JOIN expense_categories ec ON ec.id = e.category_id
           WHERE EXTRACT(YEAR FROM expense_date) = $1
           GROUP BY ec.name, ec.color
           ORDER BY total DESC`,
          [year]
        ),
        db.query(
          `SELECT COALESCE(SUM(amount),0)::numeric AS year_total,
                  COALESCE(SUM(amount) FILTER (WHERE DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', CURRENT_DATE)),0)::numeric AS month_total,
                  COALESCE(AVG(amount),0)::numeric AS avg_expense,
                  COUNT(*)::int AS total_count
           FROM expenses WHERE EXTRACT(YEAR FROM expense_date) = $1`,
          [year]
        ),
      ]);
      return NextResponse.json({
        monthly: monthly.rows,
        byCategory: byCategory.rows,
        totals: totals.rows[0],
      });
    } catch (err) {
      console.error('Expense report error:', err);
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
  }

  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? '';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const page   = parseInt(searchParams.get('page') ?? '1');
  const limit  = parseInt(searchParams.get('limit') ?? '15');
  const offset = (page - 1) * limit;
  const sortKey = searchParams.get('sortKey') ?? 'expense_date';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'ASC' : 'DESC';

  const SORT_MAP: Record<string, string> = {
    expense_date: 'e.expense_date', category: 'ec.name', amount: 'e.amount',
    payment_method: 'e.payment_method', created_at: 'e.created_at',
  };
  const orderCol = SORT_MAP[sortKey] ?? 'e.expense_date';

  try {
    const params: any[] = [`%${search}%`];
    let idx = 2;
    let filters = '';
    if (category) { filters += ` AND e.category_id = $${idx}::int`; params.push(category); idx++; }
    if (from) { filters += ` AND e.expense_date >= $${idx}`; params.push(from); idx++; }
    if (to) { filters += ` AND e.expense_date <= $${idx}`; params.push(to); idx++; }

    const whereBase = `
      FROM expenses e
      LEFT JOIN expense_categories ec ON ec.id = e.category_id
      WHERE (e.description ILIKE $1 OR ec.name ILIKE $1)
      ${filters}
    `;

    const [res, countRes, summaryRes] = await Promise.all([
      db.query(
        `SELECT e.*, ec.name AS category_name, ec.color AS category_color, ec.icon AS category_icon ${whereBase} ORDER BY ${orderCol} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) ${whereBase}`, params),
      db.query(`
        SELECT COALESCE(SUM(amount),0)::numeric AS total_amount,
          COUNT(*)::int AS total_count,
          COALESCE(SUM(amount) FILTER (WHERE DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', CURRENT_DATE)),0)::numeric AS this_month,
          COALESCE(AVG(amount),0)::numeric AS avg_expense
        FROM expenses
      `),
    ]);

    return NextResponse.json({
      data: res.rows,
      total: parseInt(countRes.rows[0].count),
      summary: summaryRes.rows[0],
    });
  } catch (err) {
    console.error('Expenses GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const session = await getSession();

  try {
    const { expense_date, category_id, description, amount, payment_method, receipt_url, notes } = await req.json();
    if (!amount) return NextResponse.json({ error: 'Amount is required' }, { status: 400 });

    const result = await db.query(
      `INSERT INTO expenses (expense_date, category_id, description, amount, payment_method, receipt_url, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [expense_date || new Date().toISOString().slice(0, 10), category_id || null, description || null, amount, payment_method || 'cash', receipt_url || null, notes || null, (session?.user as any)?.id || null]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    console.error('Expenses POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;

  try {
    const { id, expense_date, category_id, description, amount, payment_method, receipt_url, notes } = await req.json();
    await db.query(
      `UPDATE expenses SET expense_date=$1, category_id=$2, description=$3, amount=$4, payment_method=$5, receipt_url=$6, notes=$7
       WHERE id=$8`,
      [expense_date, category_id || null, description || null, amount, payment_method || 'cash', receipt_url || null, notes || null, id]
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Expenses PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireRole('manager');
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    await db.query(`DELETE FROM expenses WHERE id=$1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Expenses DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

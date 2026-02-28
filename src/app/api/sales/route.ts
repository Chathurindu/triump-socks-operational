import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

const SORT_MAP: Record<string, string> = {
  order_number: 'so.order_number', customer_name: 'c.name', order_date: 'so.order_date',
  delivery_date: 'so.delivery_date', grand_total: 'so.grand_total', status: 'so.status',
  payment_status: 'so.payment_status', created_at: 'so.created_at',
};

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const { searchParams } = new URL(req.url);

  if (searchParams.get('meta') === '1') {
    const custs = await db.query(`SELECT id, name, customer_type FROM customers WHERE is_active=TRUE ORDER BY name`);
    return NextResponse.json({ customers: custs.rows });
  }

  const search  = searchParams.get('search') ?? '';
  const status  = searchParams.get('status') ?? '';
  const page    = parseInt(searchParams.get('page') ?? '1');
  const limit   = parseInt(searchParams.get('limit') ?? '15');
  const offset  = (page - 1) * limit;
  const sortKey = searchParams.get('sortKey') ?? 'created_at';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'ASC' : 'DESC';
  const orderCol = SORT_MAP[sortKey] ?? 'so.created_at';

  try {
    const params: any[] = [`%${search}%`];
    let idx = 2;
    let statusF = '';
    if (status) { statusF = `AND so.status = $${idx}`; params.push(status); idx++; }
    const whereBase = `
      FROM sales_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      WHERE (so.order_number ILIKE $1 OR c.name ILIKE $1)
      ${statusF}
    `;
    const [res, countRes, summaryRes] = await Promise.all([
      db.query(`SELECT so.*, c.name AS customer_name, c.customer_type ${whereBase} ORDER BY ${orderCol} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]),
      db.query(`SELECT COUNT(*) ${whereBase}`, params),
      db.query(`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status='pending')::int AS pending,
          COUNT(*) FILTER (WHERE status='confirmed')::int AS confirmed,
          COUNT(*) FILTER (WHERE status='delivered')::int AS delivered,
          COUNT(*) FILTER (WHERE payment_status='paid')::int AS paid,
          COALESCE(SUM(grand_total),0)::numeric AS total_revenue
        FROM sales_orders
      `),
    ]);
    return NextResponse.json({ data: res.rows, total: parseInt(countRes.rows[0].count), summary: summaryRes.rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireRole('staff');
  if (guard) return guard;
  try {
    const b = await req.json();
    const countRes = await db.query(`SELECT COUNT(*) FROM sales_orders`);
    const num = String(parseInt(countRes.rows[0].count) + 1).padStart(3, '0');
    const orderNumber = `SO-${new Date().getFullYear()}-${num}`;
    const res = await db.query(
      `INSERT INTO sales_orders (order_number,customer_id,order_date,delivery_date,status,total_amount,discount,tax_amount,payment_status,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [orderNumber, b.customer_id || null, b.order_date || new Date().toISOString().split('T')[0], b.delivery_date || null, b.status || 'pending', b.total_amount || 0, b.discount || 0, b.tax_amount || 0, b.payment_status || 'unpaid', b.notes || null]
    );
    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireRole('staff');
  if (guard) return guard;
  try {
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await db.query(
      `UPDATE sales_orders SET customer_id=$1, order_date=$2, delivery_date=$3, status=$4, total_amount=$5, discount=$6, tax_amount=$7, payment_status=$8, notes=$9
       WHERE id=$10 RETURNING *`,
      [b.customer_id || null, b.order_date, b.delivery_date || null, b.status, b.total_amount || 0, b.discount || 0, b.tax_amount || 0, b.payment_status, b.notes || null, b.id]
    );
    return NextResponse.json({ data: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireRole('manager');
  if (guard) return guard;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    await db.query(`DELETE FROM sales_orders WHERE id=$1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

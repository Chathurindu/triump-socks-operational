import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

const SORT_MAP: Record<string, string> = {
  po_number: 'po.po_number', supplier_name: 's.name', order_date: 'po.order_date',
  expected_date: 'po.expected_date', total_amount: 'po.total_amount', status: 'po.status',
  created_at: 'po.created_at',
};

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const { searchParams } = new URL(req.url);

  if (searchParams.get('meta') === '1') {
    const sups = await db.query(`SELECT id, name, category FROM suppliers WHERE is_active=TRUE ORDER BY name`);
    return NextResponse.json({ suppliers: sups.rows });
  }

  const search  = searchParams.get('search') ?? '';
  const status  = searchParams.get('status') ?? '';
  const page    = parseInt(searchParams.get('page') ?? '1');
  const limit   = parseInt(searchParams.get('limit') ?? '15');
  const offset  = (page - 1) * limit;
  const sortKey = searchParams.get('sortKey') ?? 'created_at';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'ASC' : 'DESC';
  const orderCol = SORT_MAP[sortKey] ?? 'po.created_at';

  try {
    const params: any[] = [`%${search}%`];
    let idx = 2;
    let statusF = '';
    if (status) { statusF = `AND po.status = $${idx}`; params.push(status); idx++; }
    const whereBase = `
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      WHERE (po.po_number ILIKE $1 OR s.name ILIKE $1)
      ${statusF}
    `;
    const dataQ = `SELECT po.*, s.name AS supplier_name, s.category AS supplier_category ${whereBase} ORDER BY ${orderCol} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`;
    const countQ = `SELECT COUNT(*) ${whereBase}`;
    const summaryQ = `
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status='pending')::int AS pending,
        COUNT(*) FILTER (WHERE status='confirmed')::int AS confirmed,
        COUNT(*) FILTER (WHERE status='received')::int AS received,
        COALESCE(SUM(total_amount),0)::numeric AS total_value
      FROM purchase_orders
    `;
    const [res, countRes, summaryRes] = await Promise.all([
      db.query(dataQ, [...params, limit, offset]),
      db.query(countQ, params),
      db.query(summaryQ),
    ]);
    return NextResponse.json({ data: res.rows, total: parseInt(countRes.rows[0].count), summary: summaryRes.rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireRole('staff');
  if (guard) return guard;
  try {
    const b = await req.json();
    const countRes = await db.query(`SELECT COUNT(*) FROM purchase_orders`);
    const num = String(parseInt(countRes.rows[0].count) + 1).padStart(3, '0');
    const poNumber = `PO-${new Date().getFullYear()}-${num}`;
    const res = await db.query(
      `INSERT INTO purchase_orders (po_number,supplier_id,order_date,expected_date,status,total_amount,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [poNumber, b.supplier_id || null, b.order_date || new Date().toISOString().split('T')[0], b.expected_date || null, b.status || 'pending', b.total_amount || 0, b.notes || null]
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
      `UPDATE purchase_orders SET supplier_id=$1, order_date=$2, expected_date=$3, status=$4, total_amount=$5, notes=$6
       WHERE id=$7 RETURNING *`,
      [b.supplier_id || null, b.order_date, b.expected_date || null, b.status, b.total_amount || 0, b.notes || null, b.id]
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
    await db.query(`DELETE FROM purchase_orders WHERE id=$1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

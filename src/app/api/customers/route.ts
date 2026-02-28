import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const SORT_MAP: Record<string, string> = {
  name: 'c.name', contact: 'c.contact', phone: 'c.phone', email: 'c.email',
  customer_type: 'c.customer_type', is_active: 'c.is_active', created_at: 'c.created_at',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get('meta') === '1') {
    const types = await db.query(`SELECT DISTINCT customer_type FROM customers WHERE customer_type IS NOT NULL ORDER BY customer_type`);
    return NextResponse.json({ types: types.rows.map((r: any) => r.customer_type) });
  }

  const search  = searchParams.get('search') ?? '';
  const type    = searchParams.get('type') ?? '';
  const status  = searchParams.get('status') ?? '';
  const page    = parseInt(searchParams.get('page') ?? '1');
  const limit   = parseInt(searchParams.get('limit') ?? '15');
  const offset  = (page - 1) * limit;
  const sortKey = searchParams.get('sortKey') ?? 'created_at';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'ASC' : 'DESC';
  const orderCol = SORT_MAP[sortKey] ?? 'c.created_at';

  try {
    const typeF   = type   ? `AND c.customer_type = '${type.replace(/'/g, "''")}'` : '';
    const statusF = status === 'active' ? `AND c.is_active = true` : status === 'inactive' ? `AND c.is_active = false` : '';
    const whereBase = `
      FROM customers c
      WHERE (c.name ILIKE $1 OR c.contact ILIKE $1 OR c.email ILIKE $1 OR c.phone ILIKE $1)
      ${typeF} ${statusF}
    `;
    const [res, countRes, summaryRes] = await Promise.all([
      db.query(`SELECT c.* ${whereBase} ORDER BY ${orderCol} ${sortDir} LIMIT $2 OFFSET $3`, [`%${search}%`, limit, offset]),
      db.query(`SELECT COUNT(*) ${whereBase}`, [`%${search}%`]),
      db.query(`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE is_active = true)::int AS active,
          COUNT(*) FILTER (WHERE is_active = false)::int AS inactive,
          COUNT(DISTINCT customer_type)::int AS types_count
        FROM customers
      `),
    ]);
    return NextResponse.json({
      data: res.rows,
      total: parseInt(countRes.rows[0].count),
      summary: summaryRes.rows[0],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const res = await db.query(
      `INSERT INTO customers (name, contact, phone, email, address, customer_type, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [b.name, b.contact || null, b.phone || null, b.email || null, b.address || null, b.customer_type ?? 'retail', b.is_active ?? true]
    );
    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await db.query(
      `UPDATE customers SET name=$1, contact=$2, phone=$3, email=$4, address=$5, customer_type=$6, is_active=$7
       WHERE id=$8 RETURNING *`,
      [b.name, b.contact || null, b.phone || null, b.email || null, b.address || null, b.customer_type ?? 'retail', b.is_active ?? true, b.id]
    );
    return NextResponse.json({ data: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    await db.query(`DELETE FROM customers WHERE id=$1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

const SORT_MAP: Record<string, string> = {
  name: 's.name', contact: 's.contact', phone: 's.phone', email: 's.email',
  category: 's.category', rating: 's.rating', is_active: 's.is_active', created_at: 's.created_at',
};

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const { searchParams } = new URL(req.url);

  if (searchParams.get('meta') === '1') {
    const cats = await db.query(`SELECT DISTINCT category FROM suppliers WHERE category IS NOT NULL ORDER BY category`);
    return NextResponse.json({ categories: cats.rows.map((r: any) => r.category) });
  }

  const search  = searchParams.get('search') ?? '';
  const cat     = searchParams.get('category') ?? '';
  const page    = parseInt(searchParams.get('page') ?? '1');
  const limit   = parseInt(searchParams.get('limit') ?? '15');
  const offset  = (page - 1) * limit;
  const sortKey = searchParams.get('sortKey') ?? 'created_at';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'ASC' : 'DESC';
  const orderCol = SORT_MAP[sortKey] ?? 's.created_at';

  try {
    const params: any[] = [`%${search}%`];
    let idx = 2;
    let catF = '';
    if (cat) { catF = `AND s.category = $${idx}`; params.push(cat); idx++; }
    const whereBase = `
      FROM suppliers s
      WHERE (s.name ILIKE $1 OR s.contact ILIKE $1 OR s.email ILIKE $1 OR s.phone ILIKE $1)
      ${catF}
    `;
    const [res, countRes, summaryRes] = await Promise.all([
      db.query(`SELECT s.* ${whereBase} ORDER BY ${orderCol} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]),
      db.query(`SELECT COUNT(*) ${whereBase}`, params),
      db.query(`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE is_active=TRUE)::int AS active,
          COUNT(*) FILTER (WHERE is_active=FALSE)::int AS inactive,
          ROUND(AVG(rating)::numeric, 1) AS avg_rating
        FROM suppliers
      `),
    ]);
    return NextResponse.json({ data: res.rows, total: parseInt(countRes.rows[0].count), summary: summaryRes.rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireRole('staff');
  if (guard) return guard;
  try {
    const b = await req.json();
    const res = await db.query(
      `INSERT INTO suppliers (name,contact,phone,email,address,category,rating,is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [b.name, b.contact || null, b.phone || null, b.email || null, b.address || null, b.category || null, b.rating || 5, b.is_active !== false]
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
      `UPDATE suppliers SET name=$1, contact=$2, phone=$3, email=$4, address=$5, category=$6, rating=$7, is_active=$8
       WHERE id=$9 RETURNING *`,
      [b.name, b.contact || null, b.phone || null, b.email || null, b.address || null, b.category || null, b.rating || 5, b.is_active !== false, b.id]
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
    await db.query(`DELETE FROM suppliers WHERE id=$1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

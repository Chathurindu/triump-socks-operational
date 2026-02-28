import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

/* ── sort whitelist ── */
const SORT_MAP: Record<string, string> = {
  machine_code: 'm.machine_code',
  name: 'm.name',
  type: 'm.type',
  brand: 'm.brand',
  model: 'm.model',
  status: 'm.status',
  purchase_date: 'm.purchase_date',
  last_maintenance: 'm.last_maintenance',
  next_maintenance: 'm.next_maintenance',
  created_at: 'm.created_at',
};

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const { searchParams } = new URL(req.url);

  /* ── meta endpoint ── */
  if (searchParams.get('meta') === '1') {
    const types = await db.query(`SELECT DISTINCT type FROM machines WHERE type IS NOT NULL ORDER BY type`);
    return NextResponse.json({ types: types.rows.map((r: any) => r.type) });
  }

  const search  = searchParams.get('search') ?? '';
  const type    = searchParams.get('type') ?? '';
  const page    = parseInt(searchParams.get('page') ?? '1');
  const limit   = parseInt(searchParams.get('limit') ?? '15');
  const offset  = (page - 1) * limit;
  const sortKey = searchParams.get('sortKey') ?? 'created_at';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'ASC' : 'DESC';
  const orderCol = SORT_MAP[sortKey] ?? 'm.created_at';

  try {
    const params: any[] = [`%${search}%`];
    let idx = 2;
    let typeFilter = '';
    if (type) { typeFilter = `AND m.type = $${idx}`; params.push(type); idx++; }
    const whereBase = `
      FROM machines m
      WHERE (m.name ILIKE $1 OR m.machine_code ILIKE $1 OR m.brand ILIKE $1)
      ${typeFilter}
    `;

    const dataQ = `
      SELECT m.*,
        CASE WHEN m.next_maintenance <= CURRENT_DATE AND m.status = 'operational'
             THEN TRUE ELSE FALSE END AS maintenance_due
      ${whereBase}
      ORDER BY ${orderCol} ${sortDir}
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const countQ = `SELECT COUNT(*) ${whereBase}`;
    const summaryQ = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'operational')::int AS operational,
        COUNT(*) FILTER (WHERE status = 'maintenance')::int AS in_maintenance,
        COUNT(*) FILTER (WHERE status = 'idle')::int AS idle,
        COUNT(*) FILTER (WHERE status = 'retired')::int AS retired,
        COUNT(*) FILTER (WHERE next_maintenance <= CURRENT_DATE AND status = 'operational')::int AS maintenance_due
      FROM machines
    `;

    const [res, countRes, summaryRes] = await Promise.all([
      db.query(dataQ, [...params, limit, offset]),
      db.query(countQ, params),
      db.query(summaryQ),
    ]);

    return NextResponse.json({
      data: res.rows,
      total: parseInt(countRes.rows[0].count),
      summary: summaryRes.rows[0] ?? null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch machines' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireRole('staff');
  if (guard) return guard;
  try {
    const b = await req.json();
    const res = await db.query(
      `INSERT INTO machines (machine_code, name, type, brand, model, purchase_date, purchase_price, status, last_maintenance, next_maintenance, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [b.machine_code, b.name, b.type || null, b.brand || null, b.model || null,
       b.purchase_date || null, b.purchase_price || null, b.status || 'operational',
       b.last_maintenance || null, b.next_maintenance || null, b.notes || null]
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
      `UPDATE machines SET
         machine_code = COALESCE($1, machine_code),
         name = COALESCE($2, name),
         type = $3,
         brand = $4,
         model = $5,
         purchase_date = $6,
         purchase_price = $7,
         status = COALESCE($8, status),
         last_maintenance = $9,
         next_maintenance = $10,
         notes = $11
       WHERE id = $12 RETURNING *`,
      [b.machine_code, b.name, b.type || null, b.brand || null, b.model || null,
       b.purchase_date || null, b.purchase_price || null, b.status || 'operational',
       b.last_maintenance || null, b.next_maintenance || null, b.notes || null, b.id]
    );
    if (res.rowCount === 0) return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
    return NextResponse.json({ data: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireRole('manager');
  if (guard) return guard;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    await db.query(`DELETE FROM machines WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

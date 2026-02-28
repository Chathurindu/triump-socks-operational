import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

/* ────────────────────── GET ────────────────────── */
export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const sp = req.nextUrl.searchParams;

  /* meta endpoint — products, machines, employees for form dropdowns */
  if (sp.get('meta') === '1') {
    const [products, machines, employees] = await Promise.all([
      db.query(`SELECT id, name FROM products WHERE is_active = true ORDER BY name`),
      db.query(`SELECT id, name FROM machines WHERE status != 'retired' ORDER BY name`),
      db.query(`SELECT id, full_name FROM employees WHERE status = 'active' ORDER BY full_name`),
    ]);
    return NextResponse.json({
      products: products.rows,
      machines: machines.rows,
      employees: employees.rows,
    });
  }

  const status  = sp.get('status') ?? '';
  const search  = sp.get('search') ?? '';
  const page    = Math.max(1, parseInt(sp.get('page') ?? '1'));
  const limit   = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '15')));
  const sortKey = sp.get('sortKey') ?? 'created_at';
  const sortDir = sp.get('sortDir') === 'asc' ? 'ASC' : 'DESC';
  const offset  = (page - 1) * limit;

  /* whitelist sortable columns */
  const sortWhitelist: Record<string, string> = {
    order_number:    'po.order_number',
    product_name:    'p.name',
    quantity:        'po.quantity',
    produced_qty:    'po.produced_qty',
    status:          'po.status',
    start_date:      'po.start_date',
    machine_name:    'm.name',
    supervisor_name: 'e.full_name',
    created_at:      'po.created_at',
  };
  const orderCol = sortWhitelist[sortKey] ?? 'po.created_at';

  try {
    const where: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (status) { where.push(`po.status = $${idx++}`); params.push(status); }
    if (search) {
      where.push(`(po.order_number ILIKE $${idx} OR p.name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countQ = await db.query(
      `SELECT COUNT(*) FROM production_orders po
       LEFT JOIN products p ON p.id = po.product_id
       ${whereClause}`,
      params,
    );
    const total = parseInt(countQ.rows[0].count);

    const dataQ = await db.query(
      `SELECT po.*, p.name AS product_name, m.name AS machine_name,
              e.full_name AS supervisor_name
       FROM production_orders po
       LEFT JOIN products p ON p.id = po.product_id
       LEFT JOIN machines m ON m.id = po.machine_id
       LEFT JOIN employees e ON e.id = po.supervisor_id
       ${whereClause}
       ORDER BY ${orderCol} ${sortDir}
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );

    const summaryQ = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status='planned')     AS planned,
        COUNT(*) FILTER (WHERE status='in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status='completed')   AS completed,
        COALESCE(SUM(quantity),0)::int   AS total_qty,
        COALESCE(SUM(produced_qty),0)::int AS total_produced
      FROM production_orders
    `);

    return NextResponse.json({
      data: dataQ.rows,
      total,
      page,
      limit,
      summary: summaryQ.rows[0],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ────────────────────── POST ────────────────────── */
export async function POST(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  try {
    const b = await req.json();
    const countRes = await db.query(`SELECT COUNT(*)::int FROM production_orders`);
    const num = String(countRes.rows[0].count + 1).padStart(3, '0');
    const orderNumber = `PRD-${new Date().getFullYear()}-${num}`;

    const res = await db.query(
      `INSERT INTO production_orders (order_number, product_id, quantity, produced_qty, status, start_date, end_date, machine_id, supervisor_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        orderNumber,
        b.product_id || null,
        parseInt(b.quantity) || 0,
        parseInt(b.produced_qty) || 0,
        b.status || 'planned',
        b.start_date || null,
        b.end_date || null,
        b.machine_id || null,
        b.supervisor_id || null,
        b.notes || null,
      ],
    );
    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ────────────────────── PATCH ────────────────────── */
export async function PATCH(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  try {
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const res = await db.query(
      `UPDATE production_orders
       SET product_id    = COALESCE($2, product_id),
           quantity       = COALESCE($3, quantity),
           produced_qty   = COALESCE($4, produced_qty),
           status         = COALESCE($5, status),
           start_date     = COALESCE($6, start_date),
           end_date       = COALESCE($7, end_date),
           machine_id     = COALESCE($8, machine_id),
           supervisor_id  = COALESCE($9, supervisor_id),
           notes          = COALESCE($10, notes),
           updated_at     = NOW()
       WHERE id = $1 RETURNING *`,
      [
        b.id,
        b.product_id || null,
        b.quantity != null ? parseInt(b.quantity) : null,
        b.produced_qty != null ? parseInt(b.produced_qty) : null,
        b.status || null,
        b.start_date || null,
        b.end_date || null,
        b.machine_id || null,
        b.supervisor_id || null,
        b.notes ?? null,
      ],
    );
    if (res.rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ────────────────────── DELETE ────────────────────── */
export async function DELETE(req: NextRequest) {
  const authErr = await requireRole('manager');
  if (authErr) return authErr;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  try {
    const res = await db.query(`DELETE FROM production_orders WHERE id = $1 RETURNING id`, [id]);
    if (res.rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

/* ── sort whitelist ── */
const SORT_MAP: Record<string, string> = {
  sku: 'i.sku',
  name: 'i.name',
  category_name: 'ic.name',
  unit: 'i.unit',
  current_stock: 'i.current_stock',
  reorder_level: 'i.reorder_level',
  unit_cost: 'i.unit_cost',
  location: 'i.location',
  supplier_name: 's.name',
  created_at: 'i.created_at',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  /* ── meta endpoint: categories + suppliers for forms ── */
  if (searchParams.get('meta') === '1') {
    const [cats, sups] = await Promise.all([
      db.query(`SELECT id, name, type FROM item_categories ORDER BY type, name`),
      db.query(`SELECT id, name FROM suppliers ORDER BY name`),
    ]);
    return NextResponse.json({ categories: cats.rows, suppliers: sups.rows });
  }

  const search  = searchParams.get('search') ?? '';
  const catType = searchParams.get('catType') ?? '';
  const page    = parseInt(searchParams.get('page')  ?? '1');
  const limit   = parseInt(searchParams.get('limit') ?? '15');
  const offset  = (page - 1) * limit;
  const sortKey = searchParams.get('sortKey') ?? 'created_at';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'ASC' : 'DESC';

  const orderCol = SORT_MAP[sortKey] ?? 'i.created_at';

  try {
    const catFilter = catType ? `AND ic.type = '${catType.replace(/'/g, "''")}'` : '';
    const whereBase = `
      FROM inventory_items i
      LEFT JOIN item_categories ic ON ic.id = i.category_id
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      WHERE i.is_active = TRUE
        AND (i.name ILIKE $1 OR i.sku ILIKE $1)
        ${catFilter}
    `;

    const dataQ = `
      SELECT i.*, ic.name AS category_name, ic.type AS category_type,
             s.name AS supplier_name,
             CASE WHEN i.current_stock <= i.reorder_level THEN TRUE ELSE FALSE END AS low_stock
      ${whereBase}
      ORDER BY ${orderCol} ${sortDir}
      LIMIT $2 OFFSET $3
    `;
    const countQ = `SELECT COUNT(*) ${whereBase}`;
    const summaryQ = `
      SELECT
        COUNT(*)::int AS total_items,
        COUNT(*) FILTER (WHERE i.current_stock <= i.reorder_level)::int AS low_stock,
        COUNT(*) FILTER (WHERE i.current_stock > i.reorder_level)::int AS in_stock,
        COALESCE(SUM(i.current_stock * i.unit_cost), 0)::numeric AS total_value,
        COALESCE(COUNT(DISTINCT ic.type), 0)::int AS category_types
      FROM inventory_items i
      LEFT JOIN item_categories ic ON ic.id = i.category_id
      WHERE i.is_active = TRUE
    `;

    const [res, countRes, summaryRes] = await Promise.all([
      db.query(dataQ, [`%${search}%`, limit, offset]),
      db.query(countQ, [`%${search}%`]),
      db.query(summaryQ),
    ]);

    return NextResponse.json({
      data: res.rows,
      total: parseInt(countRes.rows[0].count),
      summary: summaryRes.rows[0] ?? null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireRole('staff');
  if (guard) return guard;
  try {
    const body = await req.json();
    const { sku, name, category_id, unit, current_stock, reorder_level, unit_cost, supplier_id, location, description } = body;
    const res = await db.query(
      `INSERT INTO inventory_items (sku,name,category_id,unit,current_stock,reorder_level,unit_cost,supplier_id,location,description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [sku, name, category_id || null, unit, current_stock ?? 0, reorder_level ?? 0, unit_cost ?? 0, supplier_id || null, location ?? null, description ?? null]
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
    const body = await req.json();
    const { id, sku, name, category_id, unit, current_stock, reorder_level, unit_cost, supplier_id, location, description } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await db.query(
      `UPDATE inventory_items SET
         sku=$1, name=$2, category_id=$3, unit=$4, current_stock=$5,
         reorder_level=$6, unit_cost=$7, supplier_id=$8, location=$9, description=$10,
         updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [sku, name, category_id || null, unit, current_stock ?? 0, reorder_level ?? 0, unit_cost ?? 0, supplier_id || null, location ?? null, description ?? null, id]
    );
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
    await db.query(`UPDATE inventory_items SET is_active=FALSE WHERE id=$1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search  = searchParams.get('search') ?? '';
  const catType = searchParams.get('catType') ?? '';   // raw_material | finished_good | …
  const page    = parseInt(searchParams.get('page')  ?? '1');
  const limit   = parseInt(searchParams.get('limit') ?? '15');
  const offset  = (page - 1) * limit;

  // Metadata endpoint: returns categories + suppliers for forms
  if (searchParams.get('meta') === '1') {
    const [cats, sups] = await Promise.all([
      db.query(`SELECT id, name, type FROM item_categories ORDER BY type, name`),
      db.query(`SELECT id, name FROM suppliers ORDER BY name`),
    ]);
    return NextResponse.json({ categories: cats.rows, suppliers: sups.rows });
  }

  try {
    const catFilter = catType ? `AND ic.type = '${catType.replace(/'/g, "''")}'` : '';
    const query = `
      SELECT i.*, ic.name AS category_name, ic.type AS category_type,
             s.name AS supplier_name,
             CASE WHEN i.current_stock <= i.reorder_level THEN TRUE ELSE FALSE END AS low_stock
      FROM inventory_items i
      LEFT JOIN item_categories ic ON ic.id = i.category_id
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      WHERE i.is_active = TRUE
        AND (i.name ILIKE $1 OR i.sku ILIKE $1)
        ${catFilter}
      ORDER BY ic.type, i.name
      LIMIT $2 OFFSET $3
    `;
    const countQ = `
      SELECT COUNT(*) FROM inventory_items i
      LEFT JOIN item_categories ic ON ic.id = i.category_id
      WHERE i.is_active=TRUE
        AND (i.name ILIKE $1 OR i.sku ILIKE $1)
        ${catFilter}
    `;
    const [res, countRes] = await Promise.all([
      db.query(query, [`%${search}%`, limit, offset]),
      db.query(countQ, [`%${search}%`]),
    ]);
    return NextResponse.json({ data: res.rows, total: parseInt(countRes.rows[0].count) });
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



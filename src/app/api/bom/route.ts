import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const sp = req.nextUrl.searchParams;

  // Meta — dropdowns
  if (sp.get('meta') === '1') {
    const [products, items] = await Promise.all([
      db.query(`SELECT id, name FROM products WHERE is_active=TRUE ORDER BY name`),
      db.query(`SELECT id, name, unit FROM inventory_items WHERE is_active=TRUE ORDER BY name`),
    ]);
    return NextResponse.json({ products: products.rows, items: items.rows });
  }

  // Single BOM with items
  if (sp.get('id')) {
    const bom = await db.query(`SELECT b.*, p.name AS product_name FROM bom_templates b LEFT JOIN products p ON p.id=b.product_id WHERE b.id=$1`, [sp.get('id')]);
    const items = await db.query(`SELECT bi.*, i.name AS item_name, i.unit AS item_unit, i.unit_price FROM bom_items bi LEFT JOIN inventory_items i ON i.id=bi.item_id WHERE bi.bom_id=$1 ORDER BY bi.sort_order`, [sp.get('id')]);
    return NextResponse.json({ bom: bom.rows[0] ?? null, items: items.rows });
  }

  // List
  const search = sp.get('search') || '';
  const page = Math.max(1, parseInt(sp.get('page') || '1'));
  const limit = 15;
  const offset = (page - 1) * limit;
  const params: any[] = [];
  let where = 'WHERE 1=1';
  if (search) { params.push(`%${search}%`); where += ` AND (b.name ILIKE $${params.length} OR p.name ILIKE $${params.length})`; }

  const [rows, countR, summary] = await Promise.all([
    db.query(`SELECT b.*, p.name AS product_name, (SELECT COUNT(*) FROM bom_items WHERE bom_id=b.id) AS item_count FROM bom_templates b LEFT JOIN products p ON p.id=b.product_id ${where} ORDER BY b.created_at DESC LIMIT ${limit} OFFSET ${offset}`, params),
    db.query(`SELECT COUNT(*) FROM bom_templates b LEFT JOIN products p ON p.id=b.product_id ${where}`, params),
    db.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER(WHERE is_active=TRUE) AS active FROM bom_templates`),
  ]);
  return NextResponse.json({ rows: rows.rows, total: parseInt(countR.rows[0].count), summary: summary.rows[0] });
}

export async function POST(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const body = await req.json();
  const { product_id, name, version, notes, items } = body;
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const bomR = await client.query(`INSERT INTO bom_templates (product_id, name, version, notes) VALUES ($1,$2,$3,$4) RETURNING *`, [product_id || null, name, version || '1.0', notes || null]);
    const bomId = bomR.rows[0].id;
    if (items?.length) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await client.query(`INSERT INTO bom_items (bom_id, item_id, quantity, unit, waste_percent, notes, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [bomId, it.item_id, it.quantity || 1, it.unit || 'pcs', it.waste_percent || 0, it.notes || null, i]);
      }
    }
    await client.query('COMMIT');
    return NextResponse.json({ success: true, id: bomId });
  } catch (e: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally { client.release(); }
}

export async function PATCH(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const body = await req.json();
  const { id, product_id, name, version, notes, is_active, items } = body;
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE bom_templates SET product_id=$1, name=$2, version=$3, notes=$4, is_active=COALESCE($5, is_active), updated_at=NOW() WHERE id=$6`,
      [product_id || null, name, version, notes || null, is_active, id]);
    if (items) {
      await client.query(`DELETE FROM bom_items WHERE bom_id=$1`, [id]);
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await client.query(`INSERT INTO bom_items (bom_id, item_id, quantity, unit, waste_percent, notes, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [id, it.item_id, it.quantity || 1, it.unit || 'pcs', it.waste_percent || 0, it.notes || null, i]);
      }
    }
    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (e: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally { client.release(); }
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireRole('manager');
  if (authErr) return authErr;
  const { id } = await req.json();
  await db.query(`DELETE FROM bom_templates WHERE id=$1`, [id]);
  return NextResponse.json({ success: true });
}

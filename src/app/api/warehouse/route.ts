import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const sp = req.nextUrl.searchParams;

  if (sp.get('meta') === '1') {
    const items = await db.query(`SELECT id, name, unit FROM inventory_items WHERE is_active=TRUE ORDER BY name`);
    return NextResponse.json({ items: items.rows });
  }

  const search = sp.get('search') || '';
  const zone = sp.get('zone') || '';
  const params: any[] = [];
  let where = 'WHERE 1=1';
  if (search) { params.push(`%${search}%`); where += ` AND (wl.code ILIKE $${params.length} OR i.name ILIKE $${params.length})`; }
  if (zone) { params.push(zone); where += ` AND wl.zone=$${params.length}`; }

  const [rows, zones, summary] = await Promise.all([
    db.query(`SELECT wl.*, i.name AS item_name, i.unit FROM warehouse_locations wl LEFT JOIN inventory_items i ON i.id=wl.item_id ${where} ORDER BY wl.code`, params),
    db.query(`SELECT DISTINCT zone FROM warehouse_locations WHERE zone IS NOT NULL ORDER BY zone`),
    db.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER(WHERE current_qty>0) AS occupied, COUNT(*) FILTER(WHERE current_qty=0) AS empty, SUM(current_qty) AS total_qty FROM warehouse_locations WHERE is_active=TRUE`),
  ]);
  return NextResponse.json({ rows: rows.rows, zones: zones.rows.map((r: any) => r.zone), summary: summary.rows[0] });
}

export async function POST(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const b = await req.json();
  const r = await db.query(`INSERT INTO warehouse_locations (code, zone, aisle, rack, shelf, bin, capacity, item_id, current_qty, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [b.code, b.zone || null, b.aisle || null, b.rack || null, b.shelf || null, b.bin || null, b.capacity || 0, b.item_id || null, b.current_qty || 0, b.notes || null]);
  return NextResponse.json({ success: true, row: r.rows[0] });
}

export async function PATCH(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const b = await req.json();
  await db.query(`UPDATE warehouse_locations SET code=$1, zone=$2, aisle=$3, rack=$4, shelf=$5, bin=$6, capacity=$7, item_id=$8, current_qty=$9, notes=$10, is_active=COALESCE($11,is_active) WHERE id=$12`,
    [b.code, b.zone || null, b.aisle || null, b.rack || null, b.shelf || null, b.bin || null, b.capacity || 0, b.item_id || null, b.current_qty || 0, b.notes || null, b.is_active, b.id]);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireRole('manager');
  if (authErr) return authErr;
  const { id } = await req.json();
  await db.query(`DELETE FROM warehouse_locations WHERE id=$1`, [id]);
  return NextResponse.json({ success: true });
}

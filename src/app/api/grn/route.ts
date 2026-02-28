import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

async function nextGrnNumber() {
  const r = await db.query(`SELECT grn_number FROM grn ORDER BY created_at DESC LIMIT 1`);
  if (!r.rows.length) return 'GRN-0001';
  const num = parseInt(r.rows[0].grn_number.replace('GRN-', '')) + 1;
  return `GRN-${String(num).padStart(4, '0')}`;
}

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const sp = req.nextUrl.searchParams;

  if (sp.get('meta') === '1') {
    const [pos, suppliers, employees, items, bins] = await Promise.all([
      db.query(`SELECT po.id, po.po_number, s.name AS supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON s.id=po.supplier_id ORDER BY po.created_at DESC LIMIT 50`),
      db.query(`SELECT id, name FROM suppliers WHERE is_active=TRUE ORDER BY name`),
      db.query(`SELECT id, full_name AS name FROM employees WHERE status='active' ORDER BY full_name`),
      db.query(`SELECT id, name, unit FROM inventory_items WHERE is_active=TRUE ORDER BY name`),
      db.query(`SELECT id, code FROM warehouse_locations WHERE is_active=TRUE ORDER BY code`),
    ]);
    const nextNum = await nextGrnNumber();
    return NextResponse.json({ purchaseOrders: pos.rows, suppliers: suppliers.rows, employees: employees.rows, items: items.rows, bins: bins.rows, nextNumber: nextNum });
  }

  // Detail
  if (sp.get('id')) {
    const [grn, grnItems] = await Promise.all([
      db.query(`SELECT g.*, s.name AS supplier_name, e.first_name||' '||e.last_name AS received_by_name, po.po_number
        FROM grn g LEFT JOIN suppliers s ON s.id=g.supplier_id LEFT JOIN employees e ON e.id=g.received_by LEFT JOIN purchase_orders po ON po.id=g.po_id
        WHERE g.id=$1`, [sp.get('id')]),
      db.query(`SELECT gi.*, i.name AS item_name, wl.code AS bin_code FROM grn_items gi LEFT JOIN inventory_items i ON i.id=gi.item_id LEFT JOIN warehouse_locations wl ON wl.id=gi.bin_location_id WHERE gi.grn_id=$1`, [sp.get('id')]),
    ]);
    return NextResponse.json({ grn: grn.rows[0], items: grnItems.rows });
  }

  const search = sp.get('search') || '';
  const status = sp.get('status') || '';
  const page = Math.max(1, parseInt(sp.get('page') || '1'));
  const limit = 15;
  const offset = (page - 1) * limit;
  const params: any[] = [];
  let where = 'WHERE 1=1';
  if (search) { params.push(`%${search}%`); where += ` AND (g.grn_number ILIKE $${params.length} OR s.name ILIKE $${params.length})`; }
  if (status) { params.push(status); where += ` AND g.status=$${params.length}`; }

  const [rows, countR, summary] = await Promise.all([
    db.query(`SELECT g.*, s.name AS supplier_name, po.po_number, (SELECT COUNT(*) FROM grn_items WHERE grn_id=g.id) AS item_count
      FROM grn g LEFT JOIN suppliers s ON s.id=g.supplier_id LEFT JOIN purchase_orders po ON po.id=g.po_id
      ${where} ORDER BY g.created_at DESC LIMIT ${limit} OFFSET ${offset}`, params),
    db.query(`SELECT COUNT(*) FROM grn g LEFT JOIN suppliers s ON s.id=g.supplier_id ${where}`, params),
    db.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER(WHERE status='accepted') AS accepted, COUNT(*) FILTER(WHERE status='rejected') AS rejected FROM grn`),
  ]);
  return NextResponse.json({ rows: rows.rows, total: parseInt(countR.rows[0].count), summary: summary.rows[0] });
}

export async function POST(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const b = await req.json();
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const grnR = await client.query(`INSERT INTO grn (grn_number, po_id, supplier_id, received_by, received_date, status, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [b.grn_number, b.po_id || null, b.supplier_id || null, b.received_by || null, b.received_date || new Date().toISOString().slice(0,10), b.status || 'draft', b.notes || null]);
    const grnId = grnR.rows[0].id;
    if (b.items?.length) {
      for (const it of b.items) {
        await client.query(`INSERT INTO grn_items (grn_id, item_id, ordered_qty, received_qty, accepted_qty, rejected_qty, rejection_reason, bin_location_id, notes)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [grnId, it.item_id, it.ordered_qty || 0, it.received_qty || 0, it.accepted_qty || 0, it.rejected_qty || 0, it.rejection_reason || null, it.bin_location_id || null, it.notes || null]);
      }
    }
    await client.query('COMMIT');
    return NextResponse.json({ success: true, id: grnId });
  } catch (e: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally { client.release(); }
}

export async function PATCH(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const b = await req.json();
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE grn SET po_id=$1, supplier_id=$2, received_by=$3, received_date=$4, status=$5, notes=$6 WHERE id=$7`,
      [b.po_id || null, b.supplier_id || null, b.received_by || null, b.received_date, b.status, b.notes || null, b.id]);
    if (b.items) {
      await client.query(`DELETE FROM grn_items WHERE grn_id=$1`, [b.id]);
      for (const it of b.items) {
        await client.query(`INSERT INTO grn_items (grn_id, item_id, ordered_qty, received_qty, accepted_qty, rejected_qty, rejection_reason, bin_location_id, notes)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [b.id, it.item_id, it.ordered_qty || 0, it.received_qty || 0, it.accepted_qty || 0, it.rejected_qty || 0, it.rejection_reason || null, it.bin_location_id || null, it.notes || null]);
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
  await db.query(`DELETE FROM grn WHERE id=$1`, [id]);
  return NextResponse.json({ success: true });
}

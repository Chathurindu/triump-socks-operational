import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

async function nextDeliveryNumber() {
  const r = await db.query(`SELECT delivery_number FROM deliveries ORDER BY created_at DESC LIMIT 1`);
  if (!r.rows.length) return 'DEL-0001';
  const num = parseInt(r.rows[0].delivery_number.replace('DEL-', '')) + 1;
  return `DEL-${String(num).padStart(4, '0')}`;
}

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const sp = req.nextUrl.searchParams;

  if (sp.get('meta') === '1') {
    const [customers, invoices] = await Promise.all([
      db.query(`SELECT id, name FROM customers WHERE is_active=TRUE ORDER BY name`),
      db.query(`SELECT id, invoice_number FROM invoices ORDER BY created_at DESC LIMIT 50`),
    ]);
    const nextNum = await nextDeliveryNumber();
    return NextResponse.json({ customers: customers.rows, invoices: invoices.rows, nextNumber: nextNum });
  }

  const search = sp.get('search') || '';
  const status = sp.get('status') || '';
  const page = Math.max(1, parseInt(sp.get('page') || '1'));
  const limit = 15;
  const offset = (page - 1) * limit;
  const params: any[] = [];
  let where = 'WHERE 1=1';
  if (search) { params.push(`%${search}%`); where += ` AND (d.delivery_number ILIKE $${params.length} OR c.name ILIKE $${params.length} OR d.driver_name ILIKE $${params.length})`; }
  if (status) { params.push(status); where += ` AND d.status=$${params.length}`; }

  const [rows, countR, summary] = await Promise.all([
    db.query(`SELECT d.*, c.name AS customer_name, i.invoice_number
      FROM deliveries d LEFT JOIN customers c ON c.id=d.customer_id LEFT JOIN invoices i ON i.id=d.invoice_id
      ${where} ORDER BY d.created_at DESC LIMIT ${limit} OFFSET ${offset}`, params),
    db.query(`SELECT COUNT(*) FROM deliveries d LEFT JOIN customers c ON c.id=d.customer_id ${where}`, params),
    db.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER(WHERE status='pending') AS pending, COUNT(*) FILTER(WHERE status='dispatched' OR status='in_transit') AS in_transit,
      COUNT(*) FILTER(WHERE status='delivered') AS delivered, COUNT(*) FILTER(WHERE status='returned') AS returned FROM deliveries`),
  ]);
  return NextResponse.json({ rows: rows.rows, total: parseInt(countR.rows[0].count), summary: summary.rows[0] });
}

export async function POST(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const b = await req.json();
  const r = await db.query(`INSERT INTO deliveries (delivery_number, sales_order_id, invoice_id, customer_id, dispatch_date, expected_date, delivered_date, status, driver_name, vehicle_number, tracking_ref, delivery_address, items, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [b.delivery_number, b.sales_order_id || null, b.invoice_id || null, b.customer_id || null, b.dispatch_date || null, b.expected_date || null, b.delivered_date || null,
     b.status || 'pending', b.driver_name || null, b.vehicle_number || null, b.tracking_ref || null, b.delivery_address || null, JSON.stringify(b.items || []), b.notes || null]);
  return NextResponse.json({ success: true, row: r.rows[0] });
}

export async function PATCH(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const b = await req.json();
  await db.query(`UPDATE deliveries SET sales_order_id=$1, invoice_id=$2, customer_id=$3, dispatch_date=$4, expected_date=$5, delivered_date=$6, status=$7,
    driver_name=$8, vehicle_number=$9, tracking_ref=$10, delivery_address=$11, items=$12, notes=$13, updated_at=NOW() WHERE id=$14`,
    [b.sales_order_id || null, b.invoice_id || null, b.customer_id || null, b.dispatch_date || null, b.expected_date || null, b.delivered_date || null, b.status,
     b.driver_name || null, b.vehicle_number || null, b.tracking_ref || null, b.delivery_address || null, JSON.stringify(b.items || []), b.notes || null, b.id]);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireRole('manager');
  if (authErr) return authErr;
  const { id } = await req.json();
  await db.query(`DELETE FROM deliveries WHERE id=$1`, [id]);
  return NextResponse.json({ success: true });
}

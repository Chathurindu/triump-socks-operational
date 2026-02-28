import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const sp = req.nextUrl.searchParams;

  if (sp.get('meta') === '1') {
    const [prodOrders, products, machines, employees] = await Promise.all([
      db.query(`SELECT po.id, po.order_number, p.name AS product_name FROM production_orders po LEFT JOIN products p ON p.id=po.product_id ORDER BY po.created_at DESC LIMIT 50`),
      db.query(`SELECT id, name FROM products WHERE is_active=TRUE ORDER BY name`),
      db.query(`SELECT id, name FROM machines ORDER BY name`),
      db.query(`SELECT id, full_name AS name FROM employees WHERE status='active' ORDER BY full_name`),
    ]);
    return NextResponse.json({ productionOrders: prodOrders.rows, products: products.rows, machines: machines.rows, employees: employees.rows });
  }

  // Report
  if (sp.get('report') === '1') {
    const year = sp.get('year') || new Date().getFullYear();
    const [monthly, byType, byCause, topProducts] = await Promise.all([
      db.query(`SELECT EXTRACT(MONTH FROM waste_date)::int AS month, SUM(quantity) AS qty, SUM(total_cost) AS cost FROM waste_records WHERE EXTRACT(YEAR FROM waste_date)=$1 GROUP BY month ORDER BY month`, [year]),
      db.query(`SELECT waste_type, COUNT(*) AS count, SUM(quantity) AS qty, SUM(total_cost) AS cost FROM waste_records WHERE EXTRACT(YEAR FROM waste_date)=$1 GROUP BY waste_type ORDER BY cost DESC`, [year]),
      db.query(`SELECT cause, COUNT(*) AS count, SUM(total_cost) AS cost FROM waste_records WHERE cause IS NOT NULL AND EXTRACT(YEAR FROM waste_date)=$1 GROUP BY cause ORDER BY cost DESC LIMIT 10`, [year]),
      db.query(`SELECT p.name, SUM(w.quantity) AS qty, SUM(w.total_cost) AS cost FROM waste_records w LEFT JOIN products p ON p.id=w.product_id WHERE EXTRACT(YEAR FROM waste_date)=$1 GROUP BY p.name ORDER BY cost DESC LIMIT 10`, [year]),
    ]);
    return NextResponse.json({ monthly: monthly.rows, byType: byType.rows, byCause: byCause.rows, topProducts: topProducts.rows });
  }

  const search = sp.get('search') || '';
  const wasteType = sp.get('waste_type') || '';
  const page = Math.max(1, parseInt(sp.get('page') || '1'));
  const limit = 15;
  const offset = (page - 1) * limit;
  const params: any[] = [];
  let where = 'WHERE 1=1';
  if (search) { params.push(`%${search}%`); where += ` AND (w.cause ILIKE $${params.length} OR po.order_number ILIKE $${params.length})`; }
  if (wasteType) { params.push(wasteType); where += ` AND w.waste_type=$${params.length}`; }

  const [rows, countR, summary] = await Promise.all([
    db.query(`SELECT w.*, po.order_number, p.name AS product_name, m.name AS machine_name, e.first_name||' '||e.last_name AS reported_by_name
      FROM waste_records w LEFT JOIN production_orders po ON po.id=w.production_order_id LEFT JOIN products p ON p.id=w.product_id
      LEFT JOIN machines m ON m.id=w.machine_id LEFT JOIN employees e ON e.id=w.reported_by
      ${where} ORDER BY w.waste_date DESC LIMIT ${limit} OFFSET ${offset}`, params),
    db.query(`SELECT COUNT(*) FROM waste_records w LEFT JOIN production_orders po ON po.id=w.production_order_id ${where}`, params),
    db.query(`SELECT COUNT(*) AS total, SUM(quantity) AS total_qty, SUM(total_cost) AS total_cost,
      COUNT(*) FILTER(WHERE waste_type='damage') AS damage_count, COUNT(*) FILTER(WHERE waste_type='defect') AS defect_count FROM waste_records`),
  ]);
  return NextResponse.json({ rows: rows.rows, total: parseInt(countR.rows[0].count), summary: summary.rows[0] });
}

export async function POST(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const b = await req.json();
  const r = await db.query(`INSERT INTO waste_records (production_order_id, product_id, waste_type, quantity, unit_cost, cause, machine_id, reported_by, waste_date, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [b.production_order_id || null, b.product_id || null, b.waste_type, b.quantity || 0, b.unit_cost || 0, b.cause || null, b.machine_id || null, b.reported_by || null, b.waste_date || new Date().toISOString().slice(0,10), b.notes || null]);
  return NextResponse.json({ success: true, row: r.rows[0] });
}

export async function PATCH(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const b = await req.json();
  await db.query(`UPDATE waste_records SET production_order_id=$1, product_id=$2, waste_type=$3, quantity=$4, unit_cost=$5, cause=$6, machine_id=$7, reported_by=$8, waste_date=$9, notes=$10 WHERE id=$11`,
    [b.production_order_id || null, b.product_id || null, b.waste_type, b.quantity, b.unit_cost, b.cause || null, b.machine_id || null, b.reported_by || null, b.waste_date, b.notes || null, b.id]);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireRole('manager');
  if (authErr) return authErr;
  const { id } = await req.json();
  await db.query(`DELETE FROM waste_records WHERE id=$1`, [id]);
  return NextResponse.json({ success: true });
}

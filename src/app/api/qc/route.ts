import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const sp = req.nextUrl.searchParams;

  if (sp.get('meta') === '1') {
    const [checklists, prodOrders, employees] = await Promise.all([
      db.query(`SELECT id, name FROM qc_checklists WHERE is_active=TRUE ORDER BY name`),
      db.query(`SELECT po.id, po.order_number, p.name AS product_name FROM production_orders po LEFT JOIN products p ON p.id=po.product_id ORDER BY po.created_at DESC LIMIT 50`),
      db.query(`SELECT id, full_name AS name FROM employees WHERE status='active' ORDER BY full_name`),
    ]);
    return NextResponse.json({ checklists: checklists.rows, productionOrders: prodOrders.rows, employees: employees.rows });
  }

  // Checklists CRUD
  if (sp.get('checklists') === '1') {
    const rows = await db.query(`SELECT * FROM qc_checklists ORDER BY created_at DESC`);
    return NextResponse.json({ rows: rows.rows });
  }

  // List inspections
  const search = sp.get('search') || '';
  const status = sp.get('status') || '';
  const page = Math.max(1, parseInt(sp.get('page') || '1'));
  const limit = 15;
  const offset = (page - 1) * limit;
  const params: any[] = [];
  let where = 'WHERE 1=1';
  if (search) { params.push(`%${search}%`); where += ` AND (qi.batch_number ILIKE $${params.length} OR po.order_number ILIKE $${params.length})`; }
  if (status) { params.push(status); where += ` AND qi.status=$${params.length}`; }

  const [rows, countR, summary] = await Promise.all([
    db.query(`SELECT qi.*, po.order_number, p.name AS product_name, e.first_name||' '||e.last_name AS inspector_name, cl.name AS checklist_name
      FROM qc_inspections qi
      LEFT JOIN production_orders po ON po.id=qi.production_order_id
      LEFT JOIN products p ON p.id=po.product_id
      LEFT JOIN employees e ON e.id=qi.inspector_id
      LEFT JOIN qc_checklists cl ON cl.id=qi.checklist_id
      ${where} ORDER BY qi.created_at DESC LIMIT ${limit} OFFSET ${offset}`, params),
    db.query(`SELECT COUNT(*) FROM qc_inspections qi LEFT JOIN production_orders po ON po.id=qi.production_order_id ${where}`, params),
    db.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER(WHERE status='passed') AS passed, COUNT(*) FILTER(WHERE status='failed') AS failed, COUNT(*) FILTER(WHERE status='rework') AS rework,
      COALESCE(AVG(CASE WHEN sample_size>0 THEN pass_count*100.0/sample_size END),0)::numeric(5,1) AS avg_pass_rate FROM qc_inspections`),
  ]);
  return NextResponse.json({ rows: rows.rows, total: parseInt(countR.rows[0].count), summary: summary.rows[0] });
}

export async function POST(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const body = await req.json();

  // Create checklist
  if (body.type === 'checklist') {
    const r = await db.query(`INSERT INTO qc_checklists (name, description, items) VALUES ($1,$2,$3) RETURNING *`, [body.name, body.description || null, JSON.stringify(body.items || [])]);
    return NextResponse.json({ success: true, row: r.rows[0] });
  }

  // Create inspection
  const { production_order_id, checklist_id, inspector_id, inspection_date, batch_number, sample_size, pass_count, fail_count, results, status, notes } = body;
  const r = await db.query(`INSERT INTO qc_inspections (production_order_id, checklist_id, inspector_id, inspection_date, batch_number, sample_size, pass_count, fail_count, results, status, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [production_order_id || null, checklist_id || null, inspector_id || null, inspection_date || new Date().toISOString().slice(0, 10), batch_number || null, sample_size || 0, pass_count || 0, fail_count || 0, JSON.stringify(results || []), status || 'pending', notes || null]);
  return NextResponse.json({ success: true, row: r.rows[0] });
}

export async function PATCH(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const body = await req.json();

  if (body.type === 'checklist') {
    await db.query(`UPDATE qc_checklists SET name=$1, description=$2, items=$3, is_active=COALESCE($4, is_active) WHERE id=$5`,
      [body.name, body.description || null, JSON.stringify(body.items || []), body.is_active, body.id]);
    return NextResponse.json({ success: true });
  }

  const { id, production_order_id, checklist_id, inspector_id, inspection_date, batch_number, sample_size, pass_count, fail_count, results, status, notes } = body;
  await db.query(`UPDATE qc_inspections SET production_order_id=$1, checklist_id=$2, inspector_id=$3, inspection_date=$4, batch_number=$5, sample_size=$6, pass_count=$7, fail_count=$8, results=$9, status=$10, notes=$11 WHERE id=$12`,
    [production_order_id || null, checklist_id || null, inspector_id || null, inspection_date, batch_number, sample_size || 0, pass_count || 0, fail_count || 0, JSON.stringify(results || []), status, notes || null, id]);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireRole('manager');
  if (authErr) return authErr;
  const { id, type } = await req.json();
  if (type === 'checklist') await db.query(`DELETE FROM qc_checklists WHERE id=$1`, [id]);
  else await db.query(`DELETE FROM qc_inspections WHERE id=$1`, [id]);
  return NextResponse.json({ success: true });
}

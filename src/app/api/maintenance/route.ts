import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const sp = req.nextUrl.searchParams;

  if (sp.get('meta') === '1') {
    const [machines, employees] = await Promise.all([
      db.query(`SELECT id, name, machine_code FROM machines ORDER BY name`),
      db.query(`SELECT id, full_name AS name FROM employees WHERE status='active' ORDER BY full_name`),
    ]);
    return NextResponse.json({ machines: machines.rows, employees: employees.rows });
  }

  // Stats for a single machine
  if (sp.get('machine_id')) {
    const mid = sp.get('machine_id');
    const [history, stats] = await Promise.all([
      db.query(`SELECT mm.*, m.name AS machine_name FROM machine_maintenance mm LEFT JOIN machines m ON m.id=mm.machine_id WHERE mm.machine_id=$1 ORDER BY mm.start_date DESC LIMIT 50`, [mid]),
      db.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER(WHERE type='breakdown') AS breakdowns, SUM(cost) AS total_cost, SUM(downtime_hours) AS total_downtime,
        COUNT(*) FILTER(WHERE status='open' OR status='in_progress') AS open_tickets FROM machine_maintenance WHERE machine_id=$1`, [mid]),
    ]);
    return NextResponse.json({ history: history.rows, stats: stats.rows[0] });
  }

  const search = sp.get('search') || '';
  const type = sp.get('type') || '';
  const status = sp.get('status') || '';
  const page = Math.max(1, parseInt(sp.get('page') || '1'));
  const limit = 15;
  const offset = (page - 1) * limit;
  const params: any[] = [];
  let where = 'WHERE 1=1';
  if (search) { params.push(`%${search}%`); where += ` AND (mm.title ILIKE $${params.length} OR m.name ILIKE $${params.length})`; }
  if (type) { params.push(type); where += ` AND mm.type=$${params.length}`; }
  if (status) { params.push(status); where += ` AND mm.status=$${params.length}`; }

  const [rows, countR, summary] = await Promise.all([
    db.query(`SELECT mm.*, m.name AS machine_name, m.machine_code, e.first_name||' '||e.last_name AS reporter_name
      FROM machine_maintenance mm LEFT JOIN machines m ON m.id=mm.machine_id LEFT JOIN employees e ON e.id=mm.reported_by
      ${where} ORDER BY mm.created_at DESC LIMIT ${limit} OFFSET ${offset}`, params),
    db.query(`SELECT COUNT(*) FROM machine_maintenance mm LEFT JOIN machines m ON m.id=mm.machine_id ${where}`, params),
    db.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER(WHERE status='open') AS open, COUNT(*) FILTER(WHERE status='in_progress') AS in_progress,
      COUNT(*) FILTER(WHERE type='breakdown') AS breakdowns, SUM(cost) AS total_cost, SUM(downtime_hours) AS total_downtime FROM machine_maintenance`),
  ]);
  return NextResponse.json({ rows: rows.rows, total: parseInt(countR.rows[0].count), summary: summary.rows[0] });
}

export async function POST(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const b = await req.json();
  const r = await db.query(`INSERT INTO machine_maintenance (machine_id, type, title, description, reported_by, assigned_to, start_date, end_date, cost, parts_used, status, priority, downtime_hours, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [b.machine_id, b.type, b.title, b.description || null, b.reported_by || null, b.assigned_to || null, b.start_date || new Date().toISOString().slice(0,10), b.end_date || null,
     b.cost || 0, JSON.stringify(b.parts_used || []), b.status || 'open', b.priority || 'medium', b.downtime_hours || 0, b.notes || null]);
  return NextResponse.json({ success: true, row: r.rows[0] });
}

export async function PATCH(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const b = await req.json();
  await db.query(`UPDATE machine_maintenance SET machine_id=$1, type=$2, title=$3, description=$4, reported_by=$5, assigned_to=$6, start_date=$7, end_date=$8, cost=$9, parts_used=$10, status=$11, priority=$12, downtime_hours=$13, notes=$14, updated_at=NOW() WHERE id=$15`,
    [b.machine_id, b.type, b.title, b.description || null, b.reported_by || null, b.assigned_to || null, b.start_date, b.end_date || null,
     b.cost || 0, JSON.stringify(b.parts_used || []), b.status, b.priority, b.downtime_hours || 0, b.notes || null, b.id]);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireRole('manager');
  if (authErr) return authErr;
  const { id } = await req.json();
  await db.query(`DELETE FROM machine_maintenance WHERE id=$1`, [id]);
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

const SORT_MAP: Record<string, string> = {
  employee_name: 'e.full_name', emp_code: 'e.emp_code', leave_type_name: 'lt.name',
  from_date: 'lr.from_date', to_date: 'lr.to_date', status: 'lr.status',
  created_at: 'lr.created_at',
};

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const { searchParams } = new URL(req.url);

  if (searchParams.get('meta') === '1') {
    const [emps, types] = await Promise.all([
      db.query(`SELECT id, emp_code, full_name FROM employees WHERE status='active' ORDER BY emp_code`),
      db.query(`SELECT id, name, days_allowed FROM leave_types ORDER BY name`),
    ]);
    return NextResponse.json({ employees: emps.rows, leave_types: types.rows });
  }

  const search  = searchParams.get('search') ?? '';
  const status  = searchParams.get('status') ?? '';
  const page    = parseInt(searchParams.get('page') ?? '1');
  const limit   = parseInt(searchParams.get('limit') ?? '15');
  const offset  = (page - 1) * limit;
  const sortKey = searchParams.get('sortKey') ?? 'created_at';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'ASC' : 'DESC';
  const orderCol = SORT_MAP[sortKey] ?? 'lr.created_at';

  try {
    const params: any[] = [`%${search}%`];
    let idx = 2;
    let statusF = '';
    if (status) { statusF = `AND lr.status = $${idx}`; params.push(status); idx++; }
    const whereBase = `
      FROM leave_requests lr
      JOIN employees e ON e.id = lr.employee_id
      JOIN leave_types lt ON lt.id = lr.leave_type_id
      LEFT JOIN employees approver ON approver.user_id = lr.approved_by
      WHERE (e.full_name ILIKE $1 OR e.emp_code ILIKE $1 OR lt.name ILIKE $1)
      ${statusF}
    `;
    const [res, countRes, summaryRes] = await Promise.all([
      db.query(`SELECT lr.*, e.full_name AS employee_name, e.emp_code, lt.name AS leave_type_name, lt.days_allowed, approver.full_name AS approved_by_name ${whereBase} ORDER BY ${orderCol} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]),
      db.query(`SELECT COUNT(*) ${whereBase}`, params),
      db.query(`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status='pending')::int AS pending,
          COUNT(*) FILTER (WHERE status='approved')::int AS approved,
          COUNT(*) FILTER (WHERE status='rejected')::int AS rejected
        FROM leave_requests
      `),
    ]);
    return NextResponse.json({ data: res.rows, total: parseInt(countRes.rows[0].count), summary: summaryRes.rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireRole('staff');
  if (guard) return guard;
  try {
    const b = await req.json();
    const { rows } = await db.query(
      `INSERT INTO leave_requests (employee_id, leave_type_id, from_date, to_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [b.employee_id, b.leave_type_id, b.from_date, b.to_date, b.reason || null]
    );
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireRole('manager');
  if (guard) return guard;
  try {
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const { rows } = await db.query(
      `UPDATE leave_requests SET status=$2, approved_by=$3 WHERE id=$1 RETURNING *`,
      [b.id, b.status, b.approved_by ?? null]
    );
    return NextResponse.json({ data: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireRole('manager');
  if (guard) return guard;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    await db.query(`DELETE FROM leave_requests WHERE id=$1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

const SORT_MAP: Record<string, string> = {
  emp_code: 'e.emp_code', full_name: 'e.full_name', department_name: 'd.name',
  date: 'a.date', check_in: 'a.check_in', check_out: 'a.check_out',
  status: 'a.status', overtime_hrs: 'a.overtime_hrs',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get('meta') === '1') {
    const emps = await db.query(`SELECT id, emp_code, full_name FROM employees WHERE status='active' ORDER BY emp_code`);
    return NextResponse.json({ employees: emps.rows });
  }

  const search  = searchParams.get('search') ?? '';
  const date    = searchParams.get('date') ?? new Date().toISOString().split('T')[0];
  const status  = searchParams.get('status') ?? '';
  const page    = parseInt(searchParams.get('page') ?? '1');
  const limit   = parseInt(searchParams.get('limit') ?? '15');
  const offset  = (page - 1) * limit;
  const sortKey = searchParams.get('sortKey') ?? 'emp_code';
  const sortDir = searchParams.get('sortDir') === 'desc' ? 'DESC' : 'ASC';
  const orderCol = SORT_MAP[sortKey] ?? 'e.emp_code';

  try {
    const statusF = status ? `AND a.status = '${status.replace(/'/g, "''")}'` : '';
    const whereBase = `
      FROM attendance a
      JOIN employees e ON e.id = a.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE a.date = $1
      AND (e.full_name ILIKE $2 OR e.emp_code ILIKE $2)
      ${statusF}
    `;
    const [res, countRes, summaryRes] = await Promise.all([
      db.query(`SELECT a.*, e.full_name, e.emp_code, d.name AS department_name ${whereBase} ORDER BY ${orderCol} ${sortDir} LIMIT $3 OFFSET $4`, [date, `%${search}%`, limit, offset]),
      db.query(`SELECT COUNT(*) ${whereBase}`, [date, `%${search}%`]),
      db.query(`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status='present')::int AS present,
          COUNT(*) FILTER (WHERE status='absent')::int AS absent,
          COUNT(*) FILTER (WHERE status='late')::int AS late,
          COUNT(*) FILTER (WHERE status='leave')::int AS on_leave,
          COALESCE(SUM(overtime_hrs),0)::numeric AS total_overtime
        FROM attendance WHERE date = $1
      `, [date]),
    ]);
    return NextResponse.json({ data: res.rows, total: parseInt(countRes.rows[0].count), summary: summaryRes.rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireRole('staff');
  if (guard) return guard;
  try {
    const b = await req.json();
    const res = await db.query(
      `INSERT INTO attendance (employee_id,date,check_in,check_out,status,overtime_hrs,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (employee_id,date) DO UPDATE SET check_in=$3,check_out=$4,status=$5,overtime_hrs=$6,notes=$7
       RETURNING *`,
      [b.employee_id, b.date, b.check_in || null, b.check_out || null, b.status || 'present', b.overtime_hrs || 0, b.notes || null]
    );
    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
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
    await db.query(`DELETE FROM attendance WHERE id=$1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

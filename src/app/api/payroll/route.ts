import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

const SORT_MAP: Record<string, string> = {
  emp_code: 'e.emp_code', full_name: 'e.full_name', department_name: 'd.name',
  basic_salary: 'p.basic_salary', net_salary: 'p.net_salary',
  payment_status: 'p.payment_status', payment_date: 'p.payment_date',
};

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const { searchParams } = new URL(req.url);

  if (searchParams.get('meta') === '1') {
    const emps = await db.query(`SELECT id, emp_code, full_name, salary FROM employees WHERE status='active' ORDER BY emp_code`);
    return NextResponse.json({ employees: emps.rows });
  }

  const search  = searchParams.get('search') ?? '';
  const month   = searchParams.get('month') ?? String(new Date().getMonth() + 1);
  const year    = searchParams.get('year') ?? String(new Date().getFullYear());
  const page    = parseInt(searchParams.get('page') ?? '1');
  const limit   = parseInt(searchParams.get('limit') ?? '15');
  const offset  = (page - 1) * limit;
  const sortKey = searchParams.get('sortKey') ?? 'emp_code';
  const sortDir = searchParams.get('sortDir') === 'desc' ? 'DESC' : 'ASC';
  const orderCol = SORT_MAP[sortKey] ?? 'e.emp_code';

  try {
    const whereBase = `
      FROM payroll p
      JOIN employees e ON e.id = p.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE p.period_month = $1 AND p.period_year = $2
      AND (e.full_name ILIKE $3 OR e.emp_code ILIKE $3)
    `;
    const [res, countRes, summaryRes] = await Promise.all([
      db.query(`SELECT p.*, e.full_name, e.emp_code, d.name AS department_name ${whereBase} ORDER BY ${orderCol} ${sortDir} LIMIT $4 OFFSET $5`, [month, year, `%${search}%`, limit, offset]),
      db.query(`SELECT COUNT(*) ${whereBase}`, [month, year, `%${search}%`]),
      db.query(`
        SELECT COUNT(*)::int AS total_records,
          COALESCE(SUM(basic_salary),0)::numeric AS total_basic,
          COALESCE(SUM(allowances),0)::numeric AS total_allowances,
          COALESCE(SUM(deductions),0)::numeric AS total_deductions,
          COALESCE(SUM(net_salary),0)::numeric AS total_net,
          COUNT(*) FILTER (WHERE payment_status='paid')::int AS paid,
          COUNT(*) FILTER (WHERE payment_status='pending')::int AS pending
        FROM payroll WHERE period_month=$1 AND period_year=$2
      `, [month, year]),
    ]);
    return NextResponse.json({ data: res.rows, total: parseInt(countRes.rows[0].count), summary: summaryRes.rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch payroll' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireRole('manager');
  if (guard) return guard;
  try {
    const b = await req.json();
    const res = await db.query(
      `INSERT INTO payroll (employee_id,period_month,period_year,basic_salary,allowances,deductions,overtime_pay,bonus,tax,payment_date,payment_status,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [b.employee_id, b.period_month, b.period_year, b.basic_salary, b.allowances || 0, b.deductions || 0, b.overtime_pay || 0, b.bonus || 0, b.tax || 0, b.payment_date || null, b.payment_status || 'pending', b.notes || null]
    );
    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
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
    const res = await db.query(
      `UPDATE payroll SET basic_salary=$1, allowances=$2, deductions=$3, overtime_pay=$4, bonus=$5, tax=$6, payment_date=$7, payment_status=$8, notes=$9
       WHERE id=$10 RETURNING *`,
      [b.basic_salary, b.allowances || 0, b.deductions || 0, b.overtime_pay || 0, b.bonus || 0, b.tax || 0, b.payment_date || null, b.payment_status, b.notes || null, b.id]
    );
    return NextResponse.json({ data: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireRole('admin');
  if (guard) return guard;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    await db.query(`DELETE FROM payroll WHERE id=$1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

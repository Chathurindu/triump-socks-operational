import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month') ?? String(new Date().getMonth() + 1);
  const year  = searchParams.get('year')  ?? String(new Date().getFullYear());

  try {
    const res = await db.query(`
      SELECT p.*, e.full_name, e.emp_code, d.name AS department_name
      FROM payroll p
      JOIN employees e ON e.id = p.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE p.period_month = $1 AND p.period_year = $2
      ORDER BY e.emp_code
    `, [month, year]);

    const summary = await db.query(`
      SELECT 
        COUNT(*) AS total_employees,
        SUM(net_salary) AS total_net,
        COUNT(*) FILTER (WHERE payment_status='paid') AS paid_count,
        COUNT(*) FILTER (WHERE payment_status='pending') AS pending_count
      FROM payroll WHERE period_month=$1 AND period_year=$2
    `,[month,year]);

    return NextResponse.json({ data: res.rows, summary: summary.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch payroll' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const res = await db.query(
      `INSERT INTO payroll (employee_id,period_month,period_year,basic_salary,allowances,deductions,overtime_pay,bonus,tax,payment_date,payment_status,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [b.employee_id,b.period_month,b.period_year,b.basic_salary,b.allowances??0,b.deductions??0,b.overtime_pay??0,b.bonus??0,b.tax??0,b.payment_date,b.payment_status??'pending',b.notes]
    );
    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

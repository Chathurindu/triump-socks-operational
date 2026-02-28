import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

/**
 * Payroll Calculator API
 * GET  ?meta=1              → employees + leave_types + company config
 * GET  ?employee_id=...     → fetch employee details for pre-fill
 * POST                      → save a calculated payroll record
 */

/* ── Sri Lanka / Generic statutory rates (configurable) ── */
const STATUTORY = {
  epf_employee_rate: 0.08,   // 8% employee contribution
  epf_employer_rate: 0.12,   // 12% employer contribution
  etf_rate:          0.03,   // 3% ETF (employer only)
  /* PAYE progressive tax brackets (annual) */
  paye_brackets: [
    { upTo: 1200000, rate: 0.00 },   // First 1.2M exempt
    { upTo: 1700000, rate: 0.06 },   // Next 500K @ 6%
    { upTo: 2200000, rate: 0.12 },   // Next 500K @ 12%
    { upTo: 2700000, rate: 0.18 },   // Next 500K @ 18%
    { upTo: 3200000, rate: 0.24 },   // Next 500K @ 24%
    { upTo: 3700000, rate: 0.30 },   // Next 500K @ 30%
    { upTo: Infinity, rate: 0.36 },  // Above 3.7M @ 36%
  ],
};

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const { searchParams } = new URL(req.url);

  /* Meta – return employees and statutory config */
  if (searchParams.get('meta') === '1') {
    const emps = await db.query(
      `SELECT e.id, e.emp_code, e.full_name, e.salary, d.name AS department_name
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.status = 'active' ORDER BY e.emp_code`
    );

    return NextResponse.json({
      employees: emps.rows,
      statutory: STATUTORY,
    });
  }

  /* Single employee lookup */
  const empId = searchParams.get('employee_id');
  if (empId) {
    const emp = await db.query(
      `SELECT e.*, d.name AS department_name
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.id = $1`,
      [empId]
    );
    if (!emp.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    /* Also fetch how many leave days they used this year */
    const year = new Date().getFullYear();
    const leave = await db.query(
      `SELECT COALESCE(SUM(to_date - from_date + 1), 0)::int AS days_used
       FROM leave_requests WHERE employee_id = $1 AND status = 'approved'
       AND EXTRACT(YEAR FROM from_date) = $2`,
      [empId, year]
    );

    /* Fetch YTD payroll totals */
    const ytd = await db.query(
      `SELECT COALESCE(SUM(basic_salary),0)::numeric AS ytd_basic,
              COALESCE(SUM(allowances),0)::numeric AS ytd_allowances,
              COALESCE(SUM(deductions),0)::numeric AS ytd_deductions,
              COALESCE(SUM(overtime_pay),0)::numeric AS ytd_overtime,
              COALESCE(SUM(bonus),0)::numeric AS ytd_bonus,
              COALESCE(SUM(tax),0)::numeric AS ytd_tax,
              COALESCE(SUM(net_salary),0)::numeric AS ytd_net,
              COUNT(*)::int AS months_paid
       FROM payroll WHERE employee_id = $1 AND period_year = $2`,
      [empId, year]
    );

    return NextResponse.json({
      employee: emp.rows[0],
      leave_days_used: leave.rows[0].days_used,
      ytd: ytd.rows[0],
    });
  }

  return NextResponse.json({ error: 'Provide meta=1 or employee_id' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const authErr = await requireRole('manager');
  if (authErr) return authErr;
  try {
    const b = await req.json();
    const res = await db.query(
      `INSERT INTO payroll (employee_id, period_month, period_year, basic_salary, allowances, deductions, overtime_pay, bonus, tax, payment_date, payment_status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        b.employee_id, b.period_month, b.period_year,
        b.basic_salary, b.allowances || 0, b.deductions || 0,
        b.overtime_pay || 0, b.bonus || 0, b.tax || 0,
        b.payment_date || null, b.payment_status || 'pending',
        b.notes || null,
      ]
    );
    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

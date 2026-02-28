import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date   = searchParams.get('date') ?? new Date().toISOString().split('T')[0];
  const empId  = searchParams.get('emp_id') ?? '';
  const month  = searchParams.get('month') ?? '';
  const year   = searchParams.get('year') ?? '';

  try {
    let query: string, params: (string|number)[];

    if (month && year) {
      query = `
        SELECT a.*, e.full_name, e.emp_code, d.name AS department_name
        FROM attendance a
        JOIN employees e ON e.id = a.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE EXTRACT(MONTH FROM a.date) = $1 AND EXTRACT(YEAR FROM a.date) = $2
        ORDER BY a.date DESC, e.emp_code
      `;
      params = [parseInt(month), parseInt(year)];
    } else {
      query = `
        SELECT a.*, e.full_name, e.emp_code, d.name AS department_name
        FROM attendance a
        JOIN employees e ON e.id = a.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE a.date = $1
        ORDER BY e.emp_code
      `;
      params = [date];
    }

    const res = await db.query(query, params);

    // Summary
    const summary = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status='present')  AS present,
        COUNT(*) FILTER (WHERE status='absent')   AS absent,
        COUNT(*) FILTER (WHERE status='late')     AS late,
        COUNT(*) FILTER (WHERE status='leave')    AS leave
      FROM attendance WHERE date = $1
    `, [date]);

    return NextResponse.json({ data: res.rows, summary: summary.rows[0], total: res.rows.length });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const res = await db.query(
      `INSERT INTO attendance (employee_id,date,check_in,check_out,status,overtime_hrs,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (employee_id,date) DO UPDATE SET check_in=$3,check_out=$4,status=$5,overtime_hrs=$6,notes=$7
       RETURNING *`,
      [b.employee_id,b.date,b.check_in,b.check_out,b.status,b.overtime_hrs??0,b.notes]
    );
    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

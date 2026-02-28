import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status      = searchParams.get('status');
    const employee_id = searchParams.get('employee_id');

    let query = `
      SELECT lr.*, e.full_name AS employee_name, e.emp_code,
             lt.name AS leave_type_name, lt.days_allowed,
             approver.full_name AS approved_by_name
      FROM leave_requests lr
      JOIN employees e ON e.id = lr.employee_id
      JOIN leave_types lt ON lt.id = lr.leave_type_id
      LEFT JOIN employees approver ON approver.user_id = lr.approved_by
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (status) { query += ` AND lr.status = $${idx++}`; params.push(status); }
    if (employee_id) { query += ` AND lr.employee_id = $${idx++}`; params.push(employee_id); }

    query += ' ORDER BY lr.created_at DESC';

    const { rows } = await db.query(query, params);
    return NextResponse.json({ data: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, leave_type_id, from_date, to_date, reason } = body;

    const { rows } = await db.query(
      `INSERT INTO leave_requests (employee_id, leave_type_id, from_date, to_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [employee_id, leave_type_id, from_date, to_date, reason]
    );

    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, approved_by } = body;

    const { rows } = await db.query(
      `UPDATE leave_requests SET status=$2, approved_by=$3 WHERE id=$1 RETURNING *`,
      [id, status, approved_by ?? null]
    );
    return NextResponse.json({ data: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


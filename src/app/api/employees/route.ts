import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const dept   = searchParams.get('dept') ?? '';
  const page   = parseInt(searchParams.get('page')  ?? '1');
  const limit  = parseInt(searchParams.get('limit') ?? '15');
  const offset = (page - 1) * limit;

  // Metadata: departments list
  if (searchParams.get('meta') === '1') {
    const d = await db.query(`SELECT id, name FROM departments ORDER BY name`);
    return NextResponse.json({ departments: d.rows });
  }

  try {
    const [res, countRes] = await Promise.all([
      db.query(`
        SELECT e.*, d.name AS department_name
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE ($1 = '' OR e.full_name ILIKE $1 OR e.emp_code ILIKE $1)
          AND ($2 = '' OR e.status = $2)
          AND ($3 = '' OR e.department_id::text = $3)
        ORDER BY e.emp_code
        LIMIT $4 OFFSET $5
      `, [`%${search}%`, status, dept, limit, offset]),
      db.query(`
        SELECT COUNT(*) FROM employees e
        WHERE ($1 = '' OR e.full_name ILIKE $1 OR e.emp_code ILIKE $1)
          AND ($2 = '' OR e.status = $2)
          AND ($3 = '' OR e.department_id::text = $3)
      `, [`%${search}%`, status, dept]),
    ]);
    return NextResponse.json({ data: res.rows, total: parseInt(countRes.rows[0].count) });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireRole('manager');
  if (guard) return guard;
  try {
    const b = await req.json();
    const res = await db.query(
      `INSERT INTO employees (emp_code,full_name,email,phone,position,department_id,employment_type,join_date,salary,address,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [b.emp_code,b.full_name,b.email,b.phone,b.position,b.department_id||null,b.employment_type||'full_time',b.join_date,b.salary||0,b.address,b.status||'active']
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
      `UPDATE employees SET full_name=$1, email=$2, phone=$3, position=$4,
         department_id=$5, employment_type=$6, salary=$7, address=$8, status=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [b.full_name,b.email,b.phone,b.position,b.department_id||null,b.employment_type,b.salary||0,b.address,b.status,b.id]
    );
    return NextResponse.json({ data: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireRole('admin');
  if (guard) return guard;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    await db.query(`UPDATE employees SET status='terminated', updated_at=NOW() WHERE id=$1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

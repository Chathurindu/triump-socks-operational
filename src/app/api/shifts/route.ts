import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

/* ────────────────────── GET ────────────────────── */
export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const sp = req.nextUrl.searchParams;

  /* meta endpoint — shift templates, employees, machines for form dropdowns */
  if (sp.get('meta') === '1') {
    const [templates, employees, machines] = await Promise.all([
      db.query(`SELECT * FROM shift_templates ORDER BY start_time`),
      db.query(`SELECT id, full_name AS name FROM employees WHERE status='active' ORDER BY full_name`),
      db.query(`SELECT id, name FROM machines WHERE status='operational' ORDER BY name`),
    ]);
    return NextResponse.json({
      templates: templates.rows,
      employees: employees.rows,
      machines: machines.rows,
    });
  }

  /* week view — assignments for a 7-day week starting at the given ISO date */
  const week = sp.get('week');
  if (week) {
    try {
      const res = await db.query(
        `SELECT sa.*, e.full_name AS employee_name, st.name AS shift_name,
                st.start_time, st.end_time, st.break_mins, st.color,
                m.name AS machine_name
         FROM shift_assignments sa
         LEFT JOIN employees e ON e.id = sa.employee_id
         LEFT JOIN shift_templates st ON st.id = sa.shift_id
         LEFT JOIN machines m ON m.id = sa.machine_id
         WHERE sa.shift_date >= $1::date
           AND sa.shift_date <  $1::date + INTERVAL '7 days'
         ORDER BY sa.shift_date, st.start_time, e.full_name`,
        [week],
      );

      /* group rows by date for calendar view */
      const grouped: Record<string, typeof res.rows> = {};
      for (const row of res.rows) {
        const d = (row.shift_date as Date).toISOString().slice(0, 10);
        (grouped[d] ??= []).push(row);
      }

      return NextResponse.json({ data: grouped });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  /* default list with pagination, search, date range, summary */
  const search = sp.get('search') ?? '';
  const from   = sp.get('from') ?? '';
  const to     = sp.get('to') ?? '';
  const page   = Math.max(1, parseInt(sp.get('page') ?? '1'));
  const limit  = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '15')));
  const offset = (page - 1) * limit;

  try {
    const where: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (search) {
      where.push(`e.full_name ILIKE $${idx}`);
      params.push(`%${search}%`);
      idx++;
    }
    if (from) {
      where.push(`sa.shift_date >= $${idx}`);
      params.push(from);
      idx++;
    }
    if (to) {
      where.push(`sa.shift_date <= $${idx}`);
      params.push(to);
      idx++;
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [countQ, dataQ, summaryQ] = await Promise.all([
      db.query(
        `SELECT COUNT(*) FROM shift_assignments sa
         LEFT JOIN employees e ON e.id = sa.employee_id
         ${whereClause}`,
        params,
      ),
      db.query(
        `SELECT sa.*, e.full_name AS employee_name, st.name AS shift_name,
                st.start_time, st.end_time, st.color,
                m.name AS machine_name
         FROM shift_assignments sa
         LEFT JOIN employees e ON e.id = sa.employee_id
         LEFT JOIN shift_templates st ON st.id = sa.shift_id
         LEFT JOIN machines m ON m.id = sa.machine_id
         ${whereClause}
         ORDER BY sa.shift_date DESC, st.start_time
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset],
      ),
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'scheduled')  AS scheduled,
          COUNT(*) FILTER (WHERE status = 'checked_in')  AS checked_in,
          COUNT(*) FILTER (WHERE status = 'completed')   AS completed,
          COUNT(*) FILTER (WHERE status = 'absent')      AS absent
        FROM shift_assignments
        WHERE shift_date >= date_trunc('month', CURRENT_DATE)
          AND shift_date <  date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
      `),
    ]);

    return NextResponse.json({
      data: dataQ.rows,
      total: parseInt(countQ.rows[0].count),
      page,
      limit,
      summary: summaryQ.rows[0],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ────────────────────── POST ────────────────────── */
export async function POST(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  try {
    const b = await req.json();

    /* bulk creation */
    if (Array.isArray(b.assignments)) {
      const values: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      for (const a of b.assignments) {
        values.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5})`);
        params.push(
          a.employee_id,
          a.shift_id,
          a.machine_id || null,
          a.shift_date,
          a.status || 'scheduled',
          a.notes || null,
        );
        idx += 6;
      }

      const res = await db.query(
        `INSERT INTO shift_assignments (employee_id, shift_id, machine_id, shift_date, status, notes)
         VALUES ${values.join(', ')}
         ON CONFLICT (employee_id, shift_date) DO NOTHING
         RETURNING *`,
        params,
      );

      return NextResponse.json({ success: true, inserted: res.rowCount }, { status: 201 });
    }

    /* single creation */
    const res = await db.query(
      `INSERT INTO shift_assignments (employee_id, shift_id, machine_id, shift_date, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        b.employee_id,
        b.shift_id,
        b.machine_id || null,
        b.shift_date,
        b.status || 'scheduled',
        b.notes || null,
      ],
    );

    return NextResponse.json({ success: true, data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ────────────────────── PATCH ────────────────────── */
export async function PATCH(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  try {
    const b = await req.json();

    /* update shift template */
    if (b.type === 'template') {
      if (!b.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      const res = await db.query(
        `UPDATE shift_templates
         SET name       = COALESCE($2, name),
             start_time = COALESCE($3, start_time),
             end_time   = COALESCE($4, end_time),
             break_mins = COALESCE($5, break_mins),
             color      = COALESCE($6, color),
             is_active  = COALESCE($7, is_active)
         WHERE id = $1 RETURNING *`,
        [
          b.id,
          b.name || null,
          b.start_time || null,
          b.end_time || null,
          b.break_mins != null ? parseInt(b.break_mins) : null,
          b.color || null,
          b.is_active != null ? b.is_active : null,
        ],
      );
      if (res.rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: res.rows[0] });
    }

    /* update shift assignment */
    if (!b.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const res = await db.query(
      `UPDATE shift_assignments
       SET employee_id = COALESCE($2, employee_id),
           shift_id    = COALESCE($3, shift_id),
           machine_id  = COALESCE($4, machine_id),
           shift_date  = COALESCE($5, shift_date),
           status      = COALESCE($6, status),
           notes       = COALESCE($7, notes)
       WHERE id = $1 RETURNING *`,
      [
        b.id,
        b.employee_id || null,
        b.shift_id || null,
        b.machine_id || null,
        b.shift_date || null,
        b.status || null,
        b.notes ?? null,
      ],
    );
    if (res.rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ────────────────────── DELETE ────────────────────── */
export async function DELETE(req: NextRequest) {
  const authErr = await requireRole('manager');
  if (authErr) return authErr;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  try {
    const res = await db.query(`DELETE FROM shift_assignments WHERE id = $1 RETURNING id`, [id]);
    if (res.rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

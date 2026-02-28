import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);

  // ── Meta: definitions, employees, departments ──
  if (searchParams.get('meta') === '1') {
    try {
      const [defs, emps, depts] = await Promise.all([
        db.query(`SELECT * FROM kpi_definitions WHERE is_active = true ORDER BY category, name`),
        db.query(`SELECT id, full_name AS name, department FROM employees WHERE status='active' ORDER BY full_name`),
        db.query(`SELECT DISTINCT department FROM employees WHERE department IS NOT NULL ORDER BY department`),
      ]);
      return NextResponse.json({
        definitions: defs.rows,
        employees: emps.rows,
        departments: depts.rows.map((r: any) => r.department),
      });
    } catch (err) {
      console.error('KPI meta error:', err);
      return NextResponse.json({ error: 'Failed to fetch meta' }, { status: 500 });
    }
  }

  const type = searchParams.get('type');

  // ── Appraisals list ──
  if (type === 'appraisals') {
    const status = searchParams.get('status') ?? '';
    const page   = parseInt(searchParams.get('page') ?? '1');
    const limit  = parseInt(searchParams.get('limit') ?? '15');
    const offset = (page - 1) * limit;

    try {
      const params: any[] = [];
      let idx = 1;
      let statusFilter = '';
      if (status) {
        statusFilter = `WHERE a.status = $${idx}`;
        params.push(status);
        idx++;
      }

      const baseFrom = `
        FROM appraisals a
        JOIN employees e ON e.id = a.employee_id
        LEFT JOIN employees r ON r.id = a.reviewer_id
        ${statusFilter}
      `;

      const [rows, countRes] = await Promise.all([
        db.query(
          `SELECT a.*, e.full_name AS employee_name, e.department,
                  r.full_name AS reviewer_name
           ${baseFrom}
           ORDER BY a.updated_at DESC
           LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, limit, offset]
        ),
        db.query(`SELECT COUNT(*) ${baseFrom}`, params),
      ]);
      return NextResponse.json({
        data: rows.rows,
        total: parseInt(countRes.rows[0].count),
      });
    } catch (err) {
      console.error('Appraisals list error:', err);
      return NextResponse.json({ error: 'Failed to fetch appraisals' }, { status: 500 });
    }
  }

  // ── Single appraisal detail ──
  if (type === 'appraisal') {
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    try {
      const { rows } = await db.query(
        `SELECT a.*, e.full_name AS employee_name, e.department, e.emp_code,
                r.full_name AS reviewer_name
         FROM appraisals a
         JOIN employees e ON e.id = a.employee_id
         LEFT JOIN employees r ON r.id = a.reviewer_id
         WHERE a.id = $1`,
        [id]
      );
      if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ data: rows[0] });
    } catch (err) {
      console.error('Appraisal detail error:', err);
      return NextResponse.json({ error: 'Failed to fetch appraisal' }, { status: 500 });
    }
  }

  // ── KPI Dashboard ──
  if (type === 'dashboard') {
    const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1));
    const year  = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));

    try {
      const [targetsRes, summaryRes] = await Promise.all([
        db.query(
          `SELECT kt.*, kd.name AS kpi_name, kd.unit, kd.category,
                  e.full_name AS employee_name, e.department
           FROM kpi_targets kt
           JOIN kpi_definitions kd ON kd.id = kt.kpi_id
           JOIN employees e ON e.id = kt.employee_id
           WHERE kt.period_month = $1 AND kt.period_year = $2
           ORDER BY kd.category, kd.name, e.full_name`,
          [month, year]
        ),
        db.query(
          `SELECT COALESCE(ROUND(AVG(achievement), 2), 0)::numeric AS avg_achievement,
                  COUNT(*) FILTER (WHERE achievement >= 100)::int AS targets_met,
                  COUNT(*)::int AS total_targets
           FROM kpi_targets
           WHERE period_month = $1 AND period_year = $2`,
          [month, year]
        ),
      ]);
      return NextResponse.json({
        targets: targetsRes.rows,
        summary: summaryRes.rows[0],
      });
    } catch (err) {
      console.error('KPI dashboard error:', err);
      return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
    }
  }

  // ── Default: list kpi_targets with pagination & filters ──
  const kpiId      = searchParams.get('kpi_id') ?? '';
  const employeeId = searchParams.get('employee_id') ?? '';
  const month      = searchParams.get('month') ?? '';
  const year       = searchParams.get('year') ?? '';
  const page       = parseInt(searchParams.get('page') ?? '1');
  const limit      = parseInt(searchParams.get('limit') ?? '15');
  const offset     = (page - 1) * limit;

  try {
    const params: any[] = [];
    let idx = 1;
    const conditions: string[] = [];

    if (kpiId) { conditions.push(`kt.kpi_id = $${idx}`); params.push(kpiId); idx++; }
    if (employeeId) { conditions.push(`kt.employee_id = $${idx}`); params.push(employeeId); idx++; }
    if (month) { conditions.push(`kt.period_month = $${idx}`); params.push(parseInt(month)); idx++; }
    if (year) { conditions.push(`kt.period_year = $${idx}`); params.push(parseInt(year)); idx++; }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const baseFrom = `
      FROM kpi_targets kt
      JOIN kpi_definitions kd ON kd.id = kt.kpi_id
      JOIN employees e ON e.id = kt.employee_id
      ${where}
    `;

    const [rows, countRes] = await Promise.all([
      db.query(
        `SELECT kt.*, kd.name AS kpi_name, kd.unit, kd.category,
                e.full_name AS employee_name
         ${baseFrom}
         ORDER BY kt.period_year DESC, kt.period_month DESC, kd.name
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) ${baseFrom}`, params),
    ]);
    return NextResponse.json({
      data: rows.rows,
      total: parseInt(countRes.rows[0].count),
    });
  } catch (err) {
    console.error('KPI targets list error:', err);
    return NextResponse.json({ error: 'Failed to fetch KPI targets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireRole('staff');
  if (guard) return guard;

  try {
    const b = await req.json();
    const type = b.type;

    // ── New KPI target ──
    if (type === 'target') {
      const { rows } = await db.query(
        `INSERT INTO kpi_targets (kpi_id, employee_id, department, period_month, period_year, target_value, actual_value, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [b.kpi_id, b.employee_id, b.department || null, b.period_month, b.period_year, b.target_value, b.actual_value ?? 0, b.notes || null]
      );
      return NextResponse.json({ data: rows[0] }, { status: 201 });
    }

    // ── New appraisal ──
    if (type === 'appraisal') {
      const { rows } = await db.query(
        `INSERT INTO appraisals (employee_id, reviewer_id, period_start, period_end, overall_score, scores, strengths, improvements, goals, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          b.employee_id, b.reviewer_id || null, b.period_start, b.period_end,
          b.overall_score ?? null, JSON.stringify(b.scores ?? {}),
          b.strengths || null, b.improvements || null, b.goals || null,
          b.status || 'draft',
        ]
      );
      return NextResponse.json({ data: rows[0] }, { status: 201 });
    }

    // ── New KPI definition (manager only) ──
    if (type === 'definition') {
      const mgrErr = await requireRole('manager');
      if (mgrErr) return mgrErr;

      const { rows } = await db.query(
        `INSERT INTO kpi_definitions (name, description, unit, category, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [b.name, b.description || null, b.unit || null, b.category || null, b.is_active ?? true]
      );
      return NextResponse.json({ data: rows[0] }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    console.error('KPI POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireRole('staff');
  if (guard) return guard;

  try {
    const b = await req.json();
    const type = b.type;

    // ── Update KPI target ──
    if (type === 'target') {
      if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const fields: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (b.target_value !== undefined) { fields.push(`target_value = $${idx}`); params.push(b.target_value); idx++; }
      if (b.actual_value !== undefined) { fields.push(`actual_value = $${idx}`); params.push(b.actual_value); idx++; }
      if (b.notes !== undefined) { fields.push(`notes = $${idx}`); params.push(b.notes); idx++; }

      if (!fields.length) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

      params.push(b.id);
      const { rows } = await db.query(
        `UPDATE kpi_targets SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );
      if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ data: rows[0] });
    }

    // ── Update appraisal ──
    if (type === 'appraisal') {
      if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const fields: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (b.reviewer_id !== undefined) { fields.push(`reviewer_id = $${idx}`); params.push(b.reviewer_id); idx++; }
      if (b.period_start !== undefined) { fields.push(`period_start = $${idx}`); params.push(b.period_start); idx++; }
      if (b.period_end !== undefined) { fields.push(`period_end = $${idx}`); params.push(b.period_end); idx++; }
      if (b.overall_score !== undefined) { fields.push(`overall_score = $${idx}`); params.push(b.overall_score); idx++; }
      if (b.scores !== undefined) { fields.push(`scores = $${idx}`); params.push(JSON.stringify(b.scores)); idx++; }
      if (b.strengths !== undefined) { fields.push(`strengths = $${idx}`); params.push(b.strengths); idx++; }
      if (b.improvements !== undefined) { fields.push(`improvements = $${idx}`); params.push(b.improvements); idx++; }
      if (b.goals !== undefined) { fields.push(`goals = $${idx}`); params.push(b.goals); idx++; }
      if (b.status !== undefined) { fields.push(`status = $${idx}`); params.push(b.status); idx++; }

      if (!fields.length) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

      fields.push(`updated_at = NOW()`);
      params.push(b.id);
      const { rows } = await db.query(
        `UPDATE appraisals SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );
      if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ data: rows[0] });
    }

    // ── Update KPI definition ──
    if (type === 'definition') {
      if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const fields: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (b.name !== undefined) { fields.push(`name = $${idx}`); params.push(b.name); idx++; }
      if (b.description !== undefined) { fields.push(`description = $${idx}`); params.push(b.description); idx++; }
      if (b.unit !== undefined) { fields.push(`unit = $${idx}`); params.push(b.unit); idx++; }
      if (b.category !== undefined) { fields.push(`category = $${idx}`); params.push(b.category); idx++; }
      if (b.is_active !== undefined) { fields.push(`is_active = $${idx}`); params.push(b.is_active); idx++; }

      if (!fields.length) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

      params.push(b.id);
      const { rows } = await db.query(
        `UPDATE kpi_definitions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );
      if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ data: rows[0] });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    console.error('KPI PATCH error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireRole('manager');
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const id   = searchParams.get('id');

  if (!type || !id) {
    return NextResponse.json({ error: 'type and id required' }, { status: 400 });
  }

  const tableMap: Record<string, string> = {
    target: 'kpi_targets',
    appraisal: 'appraisals',
    definition: 'kpi_definitions',
  };

  const table = tableMap[type];
  if (!table) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

  try {
    const { rowCount } = await db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    if (!rowCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('KPI DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

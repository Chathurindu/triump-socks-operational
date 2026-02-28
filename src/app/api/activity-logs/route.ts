import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth-utils';

/* ── Helper: log an activity ── */
export async function logActivity(opts: {
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await db.query(
      `INSERT INTO activity_logs (user_id, user_name, user_email, action, module, entity_type, entity_id, description, details, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        opts.userId || null,
        opts.userName || null,
        opts.userEmail || null,
        opts.action,
        opts.module,
        opts.entityType || null,
        opts.entityId || null,
        opts.description || null,
        JSON.stringify(opts.details || {}),
        opts.ipAddress || null,
        opts.userAgent || null,
      ]
    );
  } catch (err) {
    console.error('Activity log error:', err);
  }
}

/* ── Sort map ── */
const SORT_MAP: Record<string, string> = {
  user_name: 'user_name', action: 'action', module: 'module',
  entity_type: 'entity_type', description: 'description', created_at: 'created_at',
};

/* ═══════════════════════ GET ═══════════════════════ */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  /* Meta — distinct modules & actions for filters */
  if (searchParams.get('meta') === '1') {
    const [modules, actions] = await Promise.all([
      db.query(`SELECT DISTINCT module FROM activity_logs ORDER BY module`),
      db.query(`SELECT DISTINCT action FROM activity_logs ORDER BY action`),
    ]);
    return NextResponse.json({
      modules: modules.rows.map((r: any) => r.module),
      actions: actions.rows.map((r: any) => r.action),
    });
  }

  const search   = searchParams.get('search') ?? '';
  const module   = searchParams.get('module') ?? '';
  const action   = searchParams.get('action') ?? '';
  const userId   = searchParams.get('userId') ?? '';
  const from     = searchParams.get('from') ?? '';
  const to       = searchParams.get('to') ?? '';
  const page     = parseInt(searchParams.get('page') ?? '1');
  const limit    = parseInt(searchParams.get('limit') ?? '20');
  const offset   = (page - 1) * limit;
  const sortKey  = searchParams.get('sortKey') ?? 'created_at';
  const sortDir  = searchParams.get('sortDir') === 'asc' ? 'ASC' : 'DESC';
  const orderCol = SORT_MAP[sortKey] ?? 'created_at';

  try {
    const filters: string[] = [];
    if (module) filters.push(`AND module = '${module.replace(/'/g, "''")}'`);
    if (action) filters.push(`AND action = '${action.replace(/'/g, "''")}'`);
    if (userId) filters.push(`AND user_id = '${userId.replace(/'/g, "''")}'`);
    if (from)   filters.push(`AND created_at >= '${from}'::timestamptz`);
    if (to)     filters.push(`AND created_at <= '${to}'::timestamptz + interval '1 day'`);

    const whereBase = `
      FROM activity_logs
      WHERE (user_name ILIKE $1 OR user_email ILIKE $1 OR description ILIKE $1 OR module ILIKE $1 OR entity_type ILIKE $1)
      ${filters.join(' ')}
    `;

    const [res, countRes, summaryRes] = await Promise.all([
      db.query(`SELECT * ${whereBase} ORDER BY ${orderCol} ${sortDir} LIMIT $2 OFFSET $3`, [`%${search}%`, limit, offset]),
      db.query(`SELECT COUNT(*) ${whereBase}`, [`%${search}%`]),
      db.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(DISTINCT user_id)::int AS unique_users,
          COUNT(*) FILTER (WHERE action='create')::int AS creates,
          COUNT(*) FILTER (WHERE action='update')::int AS updates,
          COUNT(*) FILTER (WHERE action='delete')::int AS deletes,
          COUNT(*) FILTER (WHERE action='login')::int AS logins
        FROM activity_logs
      `),
    ]);

    return NextResponse.json({
      data: res.rows,
      total: parseInt(countRes.rows[0].count),
      summary: summaryRes.rows[0],
    });
  } catch (err: any) {
    console.error('Activity logs GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ═══════════════════════ DELETE (admin only — clear old logs) ═══════════════════════ */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const before = searchParams.get('before'); // clear logs older than this date

  try {
    if (before) {
      const res = await db.query(`DELETE FROM activity_logs WHERE created_at < $1 RETURNING id`, [before]);
      return NextResponse.json({ deleted: res.rowCount });
    }
    return NextResponse.json({ error: 'Provide ?before=YYYY-MM-DD' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

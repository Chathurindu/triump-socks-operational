import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, getSession } from '@/lib/auth-utils';
import bcrypt from 'bcryptjs';
import { logActivity } from '@/app/api/activity-logs/route';

const SORT_MAP: Record<string, string> = {
  full_name: 'u.full_name', email: 'u.email', role_name: 'r.name',
  is_active: 'u.is_active', last_login: 'u.last_login', created_at: 'u.created_at',
};

/* ═══════════════════════ GET ═══════════════════════ */
export async function GET(req: NextRequest) {
  const authErr = await requireRole('admin');
  if (authErr) return authErr;
  const { searchParams } = new URL(req.url);

  /* Meta: roles, groups, employees for linking */
  if (searchParams.get('meta') === '1') {
    const [roles, groups, employees] = await Promise.all([
      db.query(`SELECT id, name, permissions FROM roles ORDER BY id`),
      db.query(`SELECT id, name, color, permissions FROM user_groups WHERE is_active=true ORDER BY name`),
      db.query(`SELECT id, emp_code, full_name FROM employees WHERE status='active' ORDER BY full_name`),
    ]);
    return NextResponse.json({ roles: roles.rows, groups: groups.rows, employees: employees.rows });
  }

  /* Single user by id */
  const id = searchParams.get('id');
  if (id) {
    const res = await db.query(
      `SELECT u.*, r.name AS role_name, r.permissions AS role_permissions,
              COALESCE(
                (SELECT json_agg(json_build_object('id',g.id,'name',g.name,'color',g.color))
                 FROM user_group_members gm JOIN user_groups g ON g.id=gm.group_id WHERE gm.user_id=u.id),
                '[]'
              ) AS groups
       FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=$1`,
      [id]
    );
    if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ user: res.rows[0] });
  }

  /* Paginated list */
  const search   = searchParams.get('search') ?? '';
  const status   = searchParams.get('status') ?? '';
  const roleId   = searchParams.get('roleId') ?? '';
  const groupId  = searchParams.get('groupId') ?? '';
  const page     = parseInt(searchParams.get('page') ?? '1');
  const limit    = parseInt(searchParams.get('limit') ?? '15');
  const offset   = (page - 1) * limit;
  const sortKey  = searchParams.get('sortKey') ?? 'created_at';
  const sortDir  = searchParams.get('sortDir') === 'asc' ? 'ASC' : 'DESC';
  const orderCol = SORT_MAP[sortKey] ?? 'u.created_at';

  try {
    const filters: string[] = [];
    if (status === 'active')   filters.push(`AND u.is_active = true`);
    if (status === 'inactive') filters.push(`AND u.is_active = false`);
    if (roleId) filters.push(`AND u.role_id = ${parseInt(roleId)}`);
    if (groupId) filters.push(`AND u.id IN (SELECT user_id FROM user_group_members WHERE group_id = ${parseInt(groupId)})`);

    const whereBase = `
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE (u.full_name ILIKE $1 OR u.email ILIKE $1 OR r.name ILIKE $1)
      ${filters.join(' ')}
    `;

    const [res, countRes, summaryRes] = await Promise.all([
      db.query(
        `SELECT u.id, u.email, u.full_name, u.role_id, u.avatar_url, u.is_active,
                u.last_login, u.created_at, u.phone, u.department, u.designation, u.employee_id,
                r.name AS role_name,
                COALESCE(
                  (SELECT json_agg(json_build_object('id',g.id,'name',g.name,'color',g.color))
                   FROM user_group_members gm JOIN user_groups g ON g.id=gm.group_id WHERE gm.user_id=u.id),
                  '[]'
                ) AS groups
         ${whereBase} ORDER BY ${orderCol} ${sortDir} LIMIT $2 OFFSET $3`,
        [`%${search}%`, limit, offset]
      ),
      db.query(`SELECT COUNT(*) ${whereBase}`, [`%${search}%`]),
      db.query(`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE is_active=true)::int AS active,
          COUNT(*) FILTER (WHERE is_active=false)::int AS inactive,
          COUNT(*) FILTER (WHERE last_login > NOW() - interval '7 days')::int AS active_last_week
        FROM users
      `),
    ]);

    return NextResponse.json({
      data: res.rows,
      total: parseInt(countRes.rows[0].count),
      summary: summaryRes.rows[0],
    });
  } catch (err: any) {
    console.error('Users GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ═══════════════════════ POST — create user ═══════════════════════ */
export async function POST(req: NextRequest) {
  const guard = await requireRole('admin');
  if (guard) return guard;

  try {
    const b = await req.json();
    if (!b.email || !b.full_name || !b.password) {
      return NextResponse.json({ error: 'email, full_name, and password required' }, { status: 400 });
    }

    const hash = await bcrypt.hash(b.password, 10);
    const res = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role_id, is_active, phone, department, designation, employee_id, avatar_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, email, full_name`,
      [
        b.email, hash, b.full_name,
        b.role_id || null,
        b.is_active !== false,
        b.phone || null,
        b.department || null,
        b.designation || null,
        b.employee_id || null,
        b.avatar_url || null,
      ]
    );

    // Assign groups
    if (b.group_ids?.length) {
      for (const gid of b.group_ids) {
        await db.query(`INSERT INTO user_group_members (user_id, group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [res.rows[0].id, gid]);
      }
    }

    const session = await getSession();
    await logActivity({
      userId: (session?.user as any)?.id,
      userName: session?.user?.name ?? undefined,
      userEmail: session?.user?.email ?? undefined,
      action: 'create',
      module: 'users',
      entityType: 'users',
      entityId: res.rows[0].id,
      description: `Created user: ${b.full_name} (${b.email})`,
    });

    return NextResponse.json({ user: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    if (err.code === '23505') return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ═══════════════════════ PATCH — update user ═══════════════════════ */
export async function PATCH(req: NextRequest) {
  const guard = await requireRole('admin');
  if (guard) return guard;

  try {
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    /* Password reset */
    if (b.action === 'reset_password') {
      if (!b.new_password) return NextResponse.json({ error: 'new_password required' }, { status: 400 });
      const hash = await bcrypt.hash(b.new_password, 10);
      await db.query(`UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2`, [hash, b.id]);

      const session = await getSession();
      await logActivity({
        userId: (session?.user as any)?.id,
        userName: session?.user?.name ?? undefined,
        userEmail: session?.user?.email ?? undefined,
        action: 'password_reset',
        module: 'users',
        entityType: 'users',
        entityId: b.id,
        description: `Password reset for user ${b.id}`,
      });

      return NextResponse.json({ message: 'Password reset successful' });
    }

    /* Toggle active status */
    if (b.action === 'toggle_active') {
      const res = await db.query(
        `UPDATE users SET is_active = NOT is_active, updated_at=NOW() WHERE id=$1 RETURNING id, is_active, full_name`,
        [b.id]
      );
      if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const session = await getSession();
      await logActivity({
        userId: (session?.user as any)?.id,
        userName: session?.user?.name ?? undefined,
        userEmail: session?.user?.email ?? undefined,
        action: 'status_change',
        module: 'users',
        entityType: 'users',
        entityId: b.id,
        description: `${res.rows[0].is_active ? 'Activated' : 'Deactivated'} user: ${res.rows[0].full_name}`,
      });

      return NextResponse.json({ user: res.rows[0] });
    }

    /* General update */
    const res = await db.query(
      `UPDATE users SET
        full_name=$1, email=$2, role_id=$3, is_active=$4,
        phone=$5, department=$6, designation=$7, employee_id=$8,
        avatar_url=$9, updated_at=NOW()
       WHERE id=$10 RETURNING id, email, full_name`,
      [
        b.full_name, b.email, b.role_id || null, b.is_active !== false,
        b.phone || null, b.department || null, b.designation || null,
        b.employee_id || null, b.avatar_url || null, b.id,
      ]
    );

    if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Update groups
    if (b.group_ids !== undefined) {
      await db.query(`DELETE FROM user_group_members WHERE user_id=$1`, [b.id]);
      for (const gid of (b.group_ids || [])) {
        await db.query(`INSERT INTO user_group_members (user_id, group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [b.id, gid]);
      }
    }

    const session = await getSession();
    await logActivity({
      userId: (session?.user as any)?.id,
      userName: session?.user?.name ?? undefined,
      userEmail: session?.user?.email ?? undefined,
      action: 'update',
      module: 'users',
      entityType: 'users',
      entityId: b.id,
      description: `Updated user: ${b.full_name} (${b.email})`,
    });

    return NextResponse.json({ user: res.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ═══════════════════════ DELETE ═══════════════════════ */
export async function DELETE(req: NextRequest) {
  const guard = await requireRole('admin');
  if (guard) return guard;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    const row = await db.query(`SELECT full_name, email FROM users WHERE id=$1`, [id]);
    const res = await db.query(`DELETE FROM users WHERE id=$1 RETURNING id`, [id]);
    if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const session = await getSession();
    await logActivity({
      userId: (session?.user as any)?.id,
      userName: session?.user?.name ?? undefined,
      userEmail: session?.user?.email ?? undefined,
      action: 'delete',
      module: 'users',
      entityType: 'users',
      entityId: id,
      description: `Deleted user: ${row.rows[0]?.full_name ?? id}`,
    });

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

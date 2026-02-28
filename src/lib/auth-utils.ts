import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { NextResponse } from 'next/server';

export type UserRole = 'admin' | 'manager' | 'staff' | 'viewer';

const ROLE_RANK: Record<UserRole, number> = {
  admin:   4,
  manager: 3,
  staff:   2,
  viewer:  1,
};

/** Returns the current server session or null. */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * Checks that the calling user is authenticated and has at least the given role.
 * Returns a 401/403 NextResponse if not — otherwise returns null (all clear).
 */
export async function requireRole(
  minRole: UserRole = 'staff'
): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role as UserRole | undefined;
  if (!role || (ROLE_RANK[role] ?? 0) < ROLE_RANK[minRole]) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  return null;
}

/** True if the session can mutate (create/update/delete) data. */
export function canEdit(role?: string) {
  return !!role && (ROLE_RANK[role as UserRole] ?? 0) >= ROLE_RANK.staff;
}

/** True if the session can delete data. */
export function canDelete(role?: string) {
  return !!role && (ROLE_RANK[role as UserRole] ?? 0) >= ROLE_RANK.manager;
}

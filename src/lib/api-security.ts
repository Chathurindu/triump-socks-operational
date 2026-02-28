/**
 * Unified API security helper.
 * Combines authentication, authorization, and rate limiting in one call.
 */
import { NextResponse } from 'next/server';
import { getSession, requireRole, UserRole } from './auth-utils';
import { checkRateLimit, getClientIp } from './rate-limit';

export interface ApiSecurityOptions {
  /** Minimum role required. Defaults to 'viewer' for GET, 'staff' for mutations. */
  minRole?: UserRole;
  /** Rate limit category. Defaults to 'api'. */
  rateLimit?: 'api' | 'auth' | 'upload' | 'strict';
  /** Allow unauthenticated access (for public endpoints). */
  public?: boolean;
}

/**
 * Secure an API route handler. Returns NextResponse error if blocked, null if OK.
 * Usage: const blocked = await secureApi(req, { minRole: 'staff' }); if (blocked) return blocked;
 */
export async function secureApi(
  req: Request,
  opts: ApiSecurityOptions = {}
): Promise<NextResponse | null> {
  // Rate limiting
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, opts.rateLimit ?? 'api');
  if (rl.limited) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } }
    );
  }

  // Public endpoints skip auth
  if (opts.public) return null;

  // Auth check
  const authErr = await requireRole(opts.minRole ?? 'viewer');
  if (authErr) return authErr;

  return null;
}

/**
 * Sanitize and validate pagination parameters.
 */
export function safePagination(params: URLSearchParams) {
  const page = Math.max(1, parseInt(params.get('page') ?? '1') || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '20') || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Validate sort direction to prevent injection.
 */
export function safeSortDir(dir?: string | null): 'ASC' | 'DESC' {
  return dir?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
}

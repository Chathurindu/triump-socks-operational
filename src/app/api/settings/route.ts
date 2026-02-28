import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

export async function GET() {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  try {
    const res = await db.query(`SELECT key, value, description FROM app_settings ORDER BY key`);
    const settings: Record<string, string> = {};
    res.rows.forEach((r) => { settings[r.key] = r.value; });
    return NextResponse.json({ data: settings });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireRole('admin');
  if (authErr) return authErr;
  try {
    const body = await req.json(); // { key: value, ... }
    const entries = Object.entries(body);
    for (const [key, value] of entries) {
      await db.query(
        `INSERT INTO app_settings (key, value, updated_at) VALUES ($1,$2,NOW())
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
        [key, value]
      );
    }
    return NextResponse.json({ message: 'Settings saved' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

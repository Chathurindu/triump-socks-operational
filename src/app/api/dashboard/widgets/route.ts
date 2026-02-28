import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, getSession } from '@/lib/auth-utils';

/* Default widget layout if user has none saved */
const DEFAULT_WIDGETS = [
  { id: 'revenue',     label: 'Revenue',              type: 'stat',  enabled: true,  x: 0,  y: 0,  w: 3, h: 2 },
  { id: 'expenses',    label: 'Expenses',             type: 'stat',  enabled: true,  x: 3,  y: 0,  w: 3, h: 2 },
  { id: 'net-profit',  label: 'Net Profit',           type: 'stat',  enabled: true,  x: 6,  y: 0,  w: 3, h: 2 },
  { id: 'employees',   label: 'Active Employees',     type: 'stat',  enabled: true,  x: 9,  y: 0,  w: 3, h: 2 },
  { id: 'orders',      label: 'Active Sales Orders',  type: 'stat',  enabled: false, x: 0,  y: 0,  w: 3, h: 2 },
  { id: 'low-stock',   label: 'Low Stock Alerts',     type: 'stat',  enabled: false, x: 3,  y: 0,  w: 3, h: 2 },
  { id: 'production',  label: 'In Production',        type: 'stat',  enabled: false, x: 6,  y: 0,  w: 3, h: 2 },
  { id: 'total-emp',   label: 'Total Employees',      type: 'stat',  enabled: false, x: 9,  y: 0,  w: 3, h: 2 },
  { id: 'rev-chart',   label: 'Revenue vs Expense',   type: 'chart', enabled: true,  x: 0,  y: 2,  w: 8, h: 4 },
  { id: 'pie-chart',   label: 'Revenue by Product',   type: 'chart', enabled: true,  x: 8,  y: 2,  w: 4, h: 4 },
  { id: 'bar-chart',   label: 'Top Products',         type: 'mixed', enabled: true,  x: 0,  y: 6,  w: 4, h: 4 },
  { id: 'recent-txn',  label: 'Recent Transactions',  type: 'mixed', enabled: true,  x: 4,  y: 6,  w: 4, h: 4 },
  { id: 'overdue-inv', label: 'Overdue Invoices',     type: 'mixed', enabled: true,  x: 8,  y: 6,  w: 4, h: 4 },
  { id: 'recent-exp',  label: 'Recent Expenses',      type: 'list',  enabled: true,  x: 0,  y: 10, w: 6, h: 4 },
  { id: 'quotes',      label: 'Pending Quotations',   type: 'list',  enabled: true,  x: 6,  y: 10, w: 6, h: 4 },
];

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const session = await getSession();
  const userId = (session?.user as any)?.id;

  try {
    const res = await db.query(`SELECT widgets FROM user_dashboard_layouts WHERE user_id=$1`, [userId]);
    const widgets = res.rows.length ? res.rows[0].widgets : DEFAULT_WIDGETS;
    return NextResponse.json({ widgets, defaults: DEFAULT_WIDGETS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ widgets: DEFAULT_WIDGETS, defaults: DEFAULT_WIDGETS });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const session = await getSession();
  const userId = (session?.user as any)?.id;

  try {
    const { widgets } = await req.json();
    await db.query(
      `INSERT INTO user_dashboard_layouts (user_id, widgets, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET widgets=$2, updated_at=NOW()`,
      [userId, JSON.stringify(widgets)]
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, getSession } from '@/lib/auth-utils';

/* Default widget layout if user has none saved */
const DEFAULT_WIDGETS = [
  { id: 'revenue',     label: 'Revenue (This Month)',   type: 'stat',  enabled: true, order: 0, size: 1 },
  { id: 'expenses',    label: 'Expenses (This Month)',  type: 'stat',  enabled: true, order: 1, size: 1 },
  { id: 'net-profit',  label: 'Net Profit',             type: 'stat',  enabled: true, order: 2, size: 1 },
  { id: 'employees',   label: 'Active Employees',       type: 'stat',  enabled: true, order: 3, size: 1 },
  { id: 'orders',      label: 'Active Sales Orders',    type: 'stat',  enabled: false, order: 4, size: 1 },
  { id: 'low-stock',   label: 'Low Stock Alerts',       type: 'stat',  enabled: false, order: 5, size: 1 },
  { id: 'production',  label: 'In Production',          type: 'stat',  enabled: false, order: 6, size: 1 },
  { id: 'total-emp',   label: 'Total Employees',        type: 'stat',  enabled: false, order: 7, size: 1 },
  { id: 'rev-chart',   label: 'Revenue vs Expense',     type: 'chart', enabled: true, order: 8, size: 2 },
  { id: 'pie-chart',   label: 'Revenue by Product',     type: 'chart', enabled: true, order: 9, size: 1 },
  { id: 'bar-chart',   label: 'Top Products',           type: 'mixed', enabled: true, order: 10, size: 1 },
  { id: 'recent-txn',  label: 'Recent Transactions',    type: 'mixed', enabled: true, order: 11, size: 1 },
  { id: 'overdue-inv', label: 'Overdue Invoices',       type: 'mixed', enabled: true, order: 12, size: 1 },
  { id: 'recent-exp',  label: 'Recent Expenses',        type: 'list',  enabled: true, order: 13, size: 1 },
  { id: 'quotes',      label: 'Pending Quotations',     type: 'list',  enabled: true, order: 14, size: 1 },
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

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

/* ────────────────────── GET ────────────────────── */
export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;

  try {
    const sp = req.nextUrl.searchParams;
    const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') ?? '20')));

    /* Recent activity logs as notifications */
    let activityRows: any[] = [];
    try {
      const activityRes = await db.query(
        `SELECT id, action, module, description, user_name, created_at
         FROM activity_logs
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );
      activityRows = activityRes.rows;
    } catch { /* table might not exist */ }

    /* System alerts — low stock, overdue orders, etc. */
    const alerts: any[] = [];

    // Low stock items (from inventory_items)
    try {
      const lowStockRes = await db.query(
        `SELECT name, current_stock, reorder_level
         FROM inventory_items
         WHERE current_stock <= reorder_level
         ORDER BY (current_stock - reorder_level) ASC
         LIMIT 5`
      );
      lowStockRes.rows.forEach((r: any) => {
        alerts.push({
          id: `low-stock-${r.name}`,
          type: 'warning',
          title: 'Low Stock Alert',
          description: `${r.name} is at ${Number(r.current_stock).toFixed(0)} units (reorder level: ${Number(r.reorder_level).toFixed(0)})`,
          module: 'inventory',
          created_at: new Date().toISOString(),
        });
      });
    } catch { /* table might not exist */ }

    // Pending production orders
    try {
      const pendingProdRes = await db.query(
        `SELECT COUNT(*) AS cnt FROM production_orders WHERE status = 'planned'`
      );
      const pendingProd = parseInt(pendingProdRes.rows[0]?.cnt || '0');
      if (pendingProd > 0) {
        alerts.push({
          id: 'pending-production',
          type: 'info',
          title: 'Pending Production',
          description: `${pendingProd} production order${pendingProd > 1 ? 's' : ''} awaiting start`,
          module: 'production',
          created_at: new Date().toISOString(),
        });
      }
    } catch { /* table might not exist */ }

    // Pending leave requests
    try {
      const pendingLeaveRes = await db.query(
        `SELECT COUNT(*) AS cnt FROM leave_requests WHERE status = 'pending'`
      );
      const pendingLeave = parseInt(pendingLeaveRes.rows[0]?.cnt || '0');
      if (pendingLeave > 0) {
        alerts.push({
          id: 'pending-leaves',
          type: 'info',
          title: 'Pending Leave Requests',
          description: `${pendingLeave} leave request${pendingLeave > 1 ? 's' : ''} awaiting approval`,
          module: 'hr',
          created_at: new Date().toISOString(),
        });
      }
    } catch { /* table might not exist */ }

    // Recent sales
    try {
      const recentSalesRes = await db.query(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0)::numeric AS total
         FROM sales_orders WHERE created_at > NOW() - INTERVAL '24 hours'`
      );
      const salesCnt = parseInt(recentSalesRes.rows[0]?.cnt || '0');
      if (salesCnt > 0) {
        alerts.push({
          id: 'recent-sales',
          type: 'success',
          title: 'Sales Today',
          description: `${salesCnt} order${salesCnt > 1 ? 's' : ''} received in last 24 hours`,
          module: 'sales',
          created_at: new Date().toISOString(),
        });
      }
    } catch { /* table might not exist */ }

    return NextResponse.json({
      activities: activityRows,
      alerts,
      total: activityRows.length + alerts.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

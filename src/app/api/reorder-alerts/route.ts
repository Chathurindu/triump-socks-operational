import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'settings') {
      const result = await db.query(`
        SELECT
          i.id, i.name, i.sku, i.quantity, i.unit, i.unit_price, i.category,
          i.reorder_point, i.reorder_quantity, i.lead_time_days, i.preferred_supplier_id,
          s.name AS supplier_name
        FROM inventory_items i
        LEFT JOIN suppliers s ON s.id = i.preferred_supplier_id
        WHERE i.is_active = TRUE
        ORDER BY i.name ASC
      `);

      return NextResponse.json({ items: result.rows });
    }

    // Default: return items at or below reorder point
    const alertsResult = await db.query(`
      SELECT
        i.id, i.name, i.sku, i.quantity, i.unit, i.unit_price, i.category,
        i.reorder_point, i.reorder_quantity, i.lead_time_days,
        s.name AS supplier_name,
        (i.reorder_point - i.quantity) AS deficit
      FROM inventory_items i
      LEFT JOIN suppliers s ON s.id = i.preferred_supplier_id
      WHERE i.quantity <= i.reorder_point
        AND i.reorder_point > 0
        AND i.is_active = TRUE
      ORDER BY (i.quantity - i.reorder_point) ASC
    `);

    const summaryResult = await db.query(`
      SELECT
        COUNT(*)::int AS total_alerts,
        COUNT(*) FILTER (WHERE quantity = 0)::int AS critical,
        COUNT(*) FILTER (WHERE quantity > 0 AND quantity <= reorder_point)::int AS low_stock,
        COALESCE(SUM(reorder_quantity * unit_price), 0) AS total_reorder_value
      FROM inventory_items
      WHERE quantity <= reorder_point
        AND reorder_point > 0
        AND is_active = TRUE
    `);

    return NextResponse.json({
      alerts: alertsResult.rows,
      summary: summaryResult.rows[0],
    });
  } catch (error) {
    console.error('Reorder alerts GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch reorder alerts' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;

  try {
    const { id, reorder_point, reorder_quantity, lead_time_days, preferred_supplier_id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    await db.query(
      `UPDATE inventory_items
       SET reorder_point = $1, reorder_quantity = $2, lead_time_days = $3, preferred_supplier_id = $4
       WHERE id = $5`,
      [reorder_point, reorder_quantity, lead_time_days, preferred_supplier_id, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reorder alerts PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update reorder settings' }, { status: 500 });
  }
}

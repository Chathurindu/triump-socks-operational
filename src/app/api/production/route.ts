import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? '';

  try {
    const res = await db.query(`
      SELECT po.*, p.name AS product_name, m.name AS machine_name,
             e.full_name AS supervisor_name
      FROM production_orders po
      LEFT JOIN products p ON p.id = po.product_id
      LEFT JOIN machines m ON m.id = po.machine_id
      LEFT JOIN employees e ON e.id = po.supervisor_id
      WHERE ($1='' OR po.status=$1)
      ORDER BY po.created_at DESC
    `, [status]);

    const summary = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status='planned')     AS planned,
        COUNT(*) FILTER (WHERE status='in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status='completed')   AS completed,
        COALESCE(SUM(quantity),0)   AS total_qty,
        COALESCE(SUM(produced_qty),0) AS total_produced
      FROM production_orders
    `);

    return NextResponse.json({ data: res.rows, summary: summary.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch production data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    // Auto-generate order number
    const countRes = await db.query(`SELECT COUNT(*) FROM production_orders`);
    const num = String(parseInt(countRes.rows[0].count) + 1).padStart(3, '0');
    const orderNumber = `PRD-${new Date().getFullYear()}-${num}`;

    const res = await db.query(
      `INSERT INTO production_orders (order_number,product_id,quantity,status,start_date,machine_id,supervisor_id,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [orderNumber,b.product_id,b.quantity,b.status??'planned',b.start_date,b.machine_id,b.supervisor_id,b.notes]
    );
    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

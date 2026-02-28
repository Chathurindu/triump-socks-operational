import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? '';
  try {
    const res = await db.query(`
      SELECT so.*, c.name AS customer_name, c.customer_type
      FROM sales_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      WHERE ($1='' OR so.status=$1)
      ORDER BY so.order_date DESC
    `, [status]);

    const summary = await db.query(`
      SELECT COALESCE(SUM(grand_total),0) AS total_revenue,
             COUNT(*) AS total_orders,
             COUNT(*) FILTER (WHERE payment_status='paid') AS paid_orders,
             COUNT(*) FILTER (WHERE status='pending') AS pending_orders
      FROM sales_orders
      WHERE EXTRACT(MONTH FROM order_date)=EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM order_date)=EXTRACT(YEAR FROM CURRENT_DATE)
    `);

    return NextResponse.json({ data: res.rows, summary: summary.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const countRes = await db.query(`SELECT COUNT(*) FROM sales_orders`);
    const num = String(parseInt(countRes.rows[0].count) + 1).padStart(3, '0');
    const orderNumber = `SO-${new Date().getFullYear()}-${num}`;
    const res = await db.query(
      `INSERT INTO sales_orders (order_number,customer_id,order_date,delivery_date,status,total_amount,discount,tax_amount,payment_status,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [orderNumber,b.customer_id,b.order_date??new Date().toISOString().split('T')[0],b.delivery_date,b.status??'pending',b.total_amount??0,b.discount??0,b.tax_amount??0,b.payment_status??'unpaid',b.notes]
    );
    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

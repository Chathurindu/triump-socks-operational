import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? '';
  try {
    const res = await db.query(`
      SELECT po.*, s.name AS supplier_name, s.category AS supplier_category
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      WHERE ($1='' OR po.status=$1)
      ORDER BY po.order_date DESC
    `, [status]);
    return NextResponse.json({ data: res.rows, total: res.rows.length });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const countRes = await db.query(`SELECT COUNT(*) FROM purchase_orders`);
    const num = String(parseInt(countRes.rows[0].count) + 1).padStart(3, '0');
    const poNumber = `PO-${new Date().getFullYear()}-${num}`;
    const res = await db.query(
      `INSERT INTO purchase_orders (po_number,supplier_id,order_date,expected_date,status,total_amount,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [poNumber,b.supplier_id,b.order_date??new Date().toISOString().split('T')[0],b.expected_date,b.status??'pending',b.total_amount??0,b.notes]
    );
    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

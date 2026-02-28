import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const res = await db.query(`SELECT * FROM customers ORDER BY name`);
    return NextResponse.json({ data: res.rows });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const res = await db.query(
      `INSERT INTO customers (name,contact,phone,email,address,customer_type) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [b.name,b.contact,b.phone,b.email,b.address,b.customer_type??'retail']
    );
    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

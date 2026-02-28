import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const res = await db.query(`SELECT * FROM suppliers ORDER BY name`);
    return NextResponse.json({ data: res.rows });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const res = await db.query(
      `INSERT INTO suppliers (name,contact,phone,email,address,category) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [b.name,b.contact,b.phone,b.email,b.address,b.category]
    );
    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

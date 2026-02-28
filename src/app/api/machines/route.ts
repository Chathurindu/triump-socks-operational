import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const res = await db.query(`SELECT * FROM machines ORDER BY type, machine_code`);
    return NextResponse.json({ data: res.rows });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch machines' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const res = await db.query(
      `INSERT INTO machines (machine_code,name,type,brand,model,purchase_date,purchase_price,status,last_maintenance,next_maintenance)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [b.machine_code,b.name,b.type,b.brand,b.model,b.purchase_date,b.purchase_price,b.status??'operational',b.last_maintenance,b.next_maintenance]
    );
    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

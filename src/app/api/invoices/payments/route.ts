import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, getSession } from '@/lib/auth-utils';

/* Record a payment against an invoice */
export async function POST(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const session = await getSession();

  try {
    const { invoice_id, payment_date, amount, method, reference, notes } = await req.json();
    if (!invoice_id || !amount) return NextResponse.json({ error: 'invoice_id and amount are required' }, { status: 400 });

    // Insert payment
    const res = await db.query(
      `INSERT INTO invoice_payments (invoice_id, payment_date, amount, method, reference, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [invoice_id, payment_date || new Date().toISOString().slice(0, 10), amount, method || 'cash', reference || null, notes || null, (session?.user as any)?.id || null]
    );

    // Update invoice amount_paid & status
    const totalPaid = await db.query(
      `SELECT COALESCE(SUM(amount),0)::numeric AS paid FROM invoice_payments WHERE invoice_id=$1`,
      [invoice_id]
    );
    const paid = parseFloat(totalPaid.rows[0].paid);
    const inv = await db.query(`SELECT grand_total FROM invoices WHERE id=$1`, [invoice_id]);
    const grandTotal = parseFloat(inv.rows[0]?.grand_total ?? 0);

    let newStatus = 'unpaid';
    if (paid >= grandTotal) newStatus = 'paid';
    else if (paid > 0) newStatus = 'partial';

    await db.query(
      `UPDATE invoices SET amount_paid=$1, status=$2, updated_at=NOW() WHERE id=$3`,
      [paid, newStatus, invoice_id]
    );

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (err: any) {
    console.error('Payment POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to record payment' }, { status: 500 });
  }
}

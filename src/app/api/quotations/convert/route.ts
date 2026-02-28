import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, getSession } from '@/lib/auth-utils';

/* Convert a quotation to an invoice */
export async function POST(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const session = await getSession();

  try {
    const { quoteId } = await req.json();
    if (!quoteId) return NextResponse.json({ error: 'Missing quoteId' }, { status: 400 });

    // Fetch the quotation
    const qRes = await db.query(`SELECT * FROM quotations WHERE id=$1`, [quoteId]);
    if (!qRes.rows.length) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    const q = qRes.rows[0];

    // Generate next invoice number
    const lastInv = await db.query(`SELECT invoice_number FROM invoices ORDER BY created_at DESC LIMIT 1`);
    const lastNum = lastInv.rows[0]?.invoice_number ?? null;
    let nextNum = 'INV-0001';
    if (lastNum) {
      const n = parseInt(lastNum.replace('INV-', '')) + 1;
      nextNum = `INV-${String(n).padStart(4, '0')}`;
    }

    // Create the invoice
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invRes = await db.query(
      `INSERT INTO invoices (invoice_number, quotation_id, customer_id, invoice_date, due_date, status, subtotal, discount, tax_rate, tax_amount, grand_total, notes, terms, created_by)
       VALUES ($1,$2,$3,CURRENT_DATE,$4,'unpaid',$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [nextNum, quoteId, q.customer_id, dueDate.toISOString().slice(0, 10), q.subtotal, q.discount, q.tax_rate, q.tax_amount, q.grand_total, q.notes, q.terms, (session?.user as any)?.id || null]
    );
    const invoiceId = invRes.rows[0].id;

    // Copy items
    const items = await db.query(`SELECT * FROM quotation_items WHERE quote_id=$1`, [quoteId]);
    for (const item of items.rows) {
      await db.query(
        `INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price)
         VALUES ($1,$2,$3,$4,$5)`,
        [invoiceId, item.product_id, item.description, item.quantity, item.unit_price]
      );
    }

    // Mark quotation as converted
    await db.query(`UPDATE quotations SET status='converted', updated_at=NOW() WHERE id=$1`, [quoteId]);

    return NextResponse.json(invRes.rows[0], { status: 201 });
  } catch (err: any) {
    console.error('Convert to invoice error:', err);
    return NextResponse.json({ error: err.message || 'Failed to convert' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, getSession } from '@/lib/auth-utils';

function nextInvNumber(last: string | null): string {
  if (!last) return 'INV-0001';
  const num = parseInt(last.replace('INV-', '')) + 1;
  return `INV-${String(num).padStart(4, '0')}`;
}

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);

  if (searchParams.get('meta') === '1') {
    const [customers, products, lastI] = await Promise.all([
      db.query(`SELECT id, name FROM customers WHERE is_active=TRUE ORDER BY name`),
      db.query(`SELECT id, name, sku, unit_price FROM products WHERE is_active=TRUE ORDER BY name`),
      db.query(`SELECT invoice_number FROM invoices ORDER BY created_at DESC LIMIT 1`),
    ]);
    return NextResponse.json({
      customers: customers.rows,
      products: products.rows,
      nextNumber: nextInvNumber(lastI.rows[0]?.invoice_number ?? null),
    });
  }

  // Single invoice detail with items & payments
  if (searchParams.get('detail') === '1') {
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    try {
      const [inv, items, payments] = await Promise.all([
        db.query(`SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, c.address AS customer_address
          FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id WHERE i.id=$1`, [id]),
        db.query(`SELECT ii.*, p.name AS product_name, p.sku AS product_sku FROM invoice_items ii LEFT JOIN products p ON p.id=ii.product_id WHERE ii.invoice_id=$1 ORDER BY ii.id`, [id]),
        db.query(`SELECT * FROM invoice_payments WHERE invoice_id=$1 ORDER BY payment_date DESC`, [id]),
      ]);
      if (!inv.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ invoice: inv.rows[0], items: items.rows, payments: payments.rows });
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
  }

  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const page   = parseInt(searchParams.get('page') ?? '1');
  const limit  = parseInt(searchParams.get('limit') ?? '15');
  const offset = (page - 1) * limit;
  const sortKey = searchParams.get('sortKey') ?? 'created_at';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'ASC' : 'DESC';

  const SORT_MAP: Record<string, string> = {
    invoice_number: 'i.invoice_number', customer_name: 'c.name', invoice_date: 'i.invoice_date',
    due_date: 'i.due_date', grand_total: 'i.grand_total', status: 'i.status', created_at: 'i.created_at',
  };
  const orderCol = SORT_MAP[sortKey] ?? 'i.created_at';

  try {
    const params: any[] = [`%${search}%`];
    let idx = 2;
    let statusF = '';
    if (status) { statusF = `AND i.status = $${idx}`; params.push(status); idx++; }

    const whereBase = `
      FROM invoices i
      LEFT JOIN customers c ON c.id = i.customer_id
      WHERE (i.invoice_number ILIKE $1 OR c.name ILIKE $1)
      ${statusF}
    `;

    const [res, countRes, summaryRes] = await Promise.all([
      db.query(
        `SELECT i.*, c.name AS customer_name ${whereBase} ORDER BY ${orderCol} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) ${whereBase}`, params),
      db.query(`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status='unpaid')::int AS unpaid,
          COUNT(*) FILTER (WHERE status='partial')::int AS partial_paid,
          COUNT(*) FILTER (WHERE status='paid')::int AS paid,
          COUNT(*) FILTER (WHERE status='overdue')::int AS overdue,
          COALESCE(SUM(grand_total),0)::numeric AS total_value,
          COALESCE(SUM(amount_paid),0)::numeric AS total_paid,
          COALESCE(SUM(grand_total - amount_paid) FILTER (WHERE status IN ('unpaid','partial','overdue')),0)::numeric AS total_outstanding
        FROM invoices
      `),
    ]);

    return NextResponse.json({
      data: res.rows,
      total: parseInt(countRes.rows[0].count),
      summary: summaryRes.rows[0],
    });
  } catch (err) {
    console.error('Invoices GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const session = await getSession();

  try {
    const body = await req.json();
    const { invoice_number, customer_id, invoice_date, due_date, status, discount, tax_rate, notes, terms, items } = body;

    const subtotal = (items ?? []).reduce((s: number, it: any) => s + (it.quantity * it.unit_price), 0);
    const taxAmt = subtotal * (parseFloat(tax_rate) || 0) / 100;
    const grandTotal = subtotal - (parseFloat(discount) || 0) + taxAmt;

    const result = await db.query(
      `INSERT INTO invoices (invoice_number, customer_id, invoice_date, due_date, status, subtotal, discount, tax_rate, tax_amount, grand_total, notes, terms, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [invoice_number, customer_id || null, invoice_date, due_date || null, status || 'unpaid', subtotal, parseFloat(discount) || 0, parseFloat(tax_rate) || 0, taxAmt, grandTotal, notes || null, terms || null, (session?.user as any)?.id || null]
    );

    const invoiceId = result.rows[0].id;
    for (const item of (items ?? [])) {
      await db.query(
        `INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price)
         VALUES ($1,$2,$3,$4,$5)`,
        [invoiceId, item.product_id || null, item.description || null, item.quantity, item.unit_price]
      );
    }

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    console.error('Invoices POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create invoice' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { id, customer_id, invoice_date, due_date, status, discount, tax_rate, notes, terms, items } = body;

    const subtotal = (items ?? []).reduce((s: number, it: any) => s + (it.quantity * it.unit_price), 0);
    const taxAmt = subtotal * (parseFloat(tax_rate) || 0) / 100;
    const grandTotal = subtotal - (parseFloat(discount) || 0) + taxAmt;

    await db.query(
      `UPDATE invoices SET customer_id=$1, invoice_date=$2, due_date=$3, status=$4, subtotal=$5, discount=$6, tax_rate=$7, tax_amount=$8, grand_total=$9, notes=$10, terms=$11, updated_at=NOW()
       WHERE id=$12`,
      [customer_id || null, invoice_date, due_date || null, status, subtotal, parseFloat(discount) || 0, parseFloat(tax_rate) || 0, taxAmt, grandTotal, notes || null, terms || null, id]
    );

    await db.query(`DELETE FROM invoice_items WHERE invoice_id=$1`, [id]);
    for (const item of (items ?? [])) {
      await db.query(
        `INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, item.product_id || null, item.description || null, item.quantity, item.unit_price]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Invoices PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireRole('manager');
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    await db.query(`DELETE FROM invoices WHERE id=$1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Invoices DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete' }, { status: 500 });
  }
}

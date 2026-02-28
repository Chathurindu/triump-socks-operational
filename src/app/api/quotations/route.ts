import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, getSession } from '@/lib/auth-utils';

function nextQuoteNumber(last: string | null): string {
  if (!last) return 'QT-0001';
  const num = parseInt(last.replace('QT-', '')) + 1;
  return `QT-${String(num).padStart(4, '0')}`;
}

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);

  // Meta endpoint for form dropdowns
  if (searchParams.get('meta') === '1') {
    const [customers, products, lastQ] = await Promise.all([
      db.query(`SELECT id, name FROM customers WHERE is_active=TRUE ORDER BY name`),
      db.query(`SELECT id, name, sku, unit_price FROM products WHERE is_active=TRUE ORDER BY name`),
      db.query(`SELECT quote_number FROM quotations ORDER BY created_at DESC LIMIT 1`),
    ]);
    return NextResponse.json({
      customers: customers.rows,
      products: products.rows,
      nextNumber: nextQuoteNumber(lastQ.rows[0]?.quote_number ?? null),
    });
  }

  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const page   = parseInt(searchParams.get('page') ?? '1');
  const limit  = parseInt(searchParams.get('limit') ?? '15');
  const offset = (page - 1) * limit;
  const sortKey = searchParams.get('sortKey') ?? 'created_at';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'ASC' : 'DESC';

  const SORT_MAP: Record<string, string> = {
    quote_number: 'q.quote_number', customer_name: 'c.name', quote_date: 'q.quote_date',
    grand_total: 'q.grand_total', status: 'q.status', created_at: 'q.created_at',
  };
  const orderCol = SORT_MAP[sortKey] ?? 'q.created_at';

  try {
    const params: any[] = [`%${search}%`];
    let idx = 2;
    let statusF = '';
    if (status) { statusF = `AND q.status = $${idx}`; params.push(status); idx++; }

    const whereBase = `
      FROM quotations q
      LEFT JOIN customers c ON c.id = q.customer_id
      WHERE (q.quote_number ILIKE $1 OR c.name ILIKE $1)
      ${statusF}
    `;

    const [res, countRes, summaryRes] = await Promise.all([
      db.query(
        `SELECT q.*, c.name AS customer_name ${whereBase} ORDER BY ${orderCol} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) ${whereBase}`, params),
      db.query(`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status='draft')::int AS draft,
          COUNT(*) FILTER (WHERE status='sent')::int AS sent,
          COUNT(*) FILTER (WHERE status='accepted')::int AS accepted,
          COUNT(*) FILTER (WHERE status='rejected')::int AS rejected,
          COUNT(*) FILTER (WHERE status='converted')::int AS converted,
          COALESCE(SUM(grand_total),0)::numeric AS total_value
        FROM quotations
      `),
    ]);

    return NextResponse.json({
      data: res.rows,
      total: parseInt(countRes.rows[0].count),
      summary: summaryRes.rows[0],
    });
  } catch (err) {
    console.error('Quotations GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch quotations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;
  const session = await getSession();

  try {
    const body = await req.json();
    const { quote_number, customer_id, quote_date, valid_until, status, discount, tax_rate, notes, terms, items } = body;

    // Calculate totals
    const subtotal = (items ?? []).reduce((s: number, it: any) => s + (it.quantity * it.unit_price), 0);
    const taxAmt = subtotal * (parseFloat(tax_rate) || 0) / 100;
    const grandTotal = subtotal - (parseFloat(discount) || 0) + taxAmt;

    const result = await db.query(
      `INSERT INTO quotations (quote_number, customer_id, quote_date, valid_until, status, subtotal, discount, tax_rate, tax_amount, grand_total, notes, terms, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [quote_number, customer_id || null, quote_date, valid_until || null, status || 'draft', subtotal, parseFloat(discount) || 0, parseFloat(tax_rate) || 0, taxAmt, grandTotal, notes || null, terms || null, (session?.user as any)?.id || null]
    );

    const quoteId = result.rows[0].id;

    // Insert line items
    for (const item of (items ?? [])) {
      await db.query(
        `INSERT INTO quotation_items (quote_id, product_id, description, quantity, unit_price)
         VALUES ($1,$2,$3,$4,$5)`,
        [quoteId, item.product_id || null, item.description || null, item.quantity, item.unit_price]
      );
    }

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    console.error('Quotations POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create quotation' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { id, customer_id, quote_date, valid_until, status, discount, tax_rate, notes, terms, items } = body;

    const subtotal = (items ?? []).reduce((s: number, it: any) => s + (it.quantity * it.unit_price), 0);
    const taxAmt = subtotal * (parseFloat(tax_rate) || 0) / 100;
    const grandTotal = subtotal - (parseFloat(discount) || 0) + taxAmt;

    await db.query(
      `UPDATE quotations SET customer_id=$1, quote_date=$2, valid_until=$3, status=$4, subtotal=$5, discount=$6, tax_rate=$7, tax_amount=$8, grand_total=$9, notes=$10, terms=$11, updated_at=NOW()
       WHERE id=$12`,
      [customer_id || null, quote_date, valid_until || null, status, subtotal, parseFloat(discount) || 0, parseFloat(tax_rate) || 0, taxAmt, grandTotal, notes || null, terms || null, id]
    );

    // Replace items
    await db.query(`DELETE FROM quotation_items WHERE quote_id=$1`, [id]);
    for (const item of (items ?? [])) {
      await db.query(
        `INSERT INTO quotation_items (quote_id, product_id, description, quantity, unit_price)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, item.product_id || null, item.description || null, item.quantity, item.unit_price]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Quotations PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update quotation' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireRole('manager');
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    await db.query(`DELETE FROM quotations WHERE id=$1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Quotations DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete' }, { status: 500 });
  }
}

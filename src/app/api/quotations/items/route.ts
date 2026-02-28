import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, getSession } from '@/lib/auth-utils';

/* Get items for a specific quotation */
export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const quoteId = searchParams.get('quoteId');
  if (!quoteId) return NextResponse.json({ error: 'Missing quoteId' }, { status: 400 });

  try {
    const res = await db.query(
      `SELECT qi.*, p.name AS product_name, p.sku AS product_sku
       FROM quotation_items qi
       LEFT JOIN products p ON p.id = qi.product_id
       WHERE qi.quote_id = $1
       ORDER BY qi.id`,
      [quoteId]
    );
    return NextResponse.json({ items: res.rows });
  } catch (err) {
    console.error('Quotation items GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;
  const sp = req.nextUrl.searchParams;

  // Aging report
  if (sp.get('aging') === '1') {
    const rows = await db.query(`
      SELECT c.id, c.name, c.credit_limit, c.credit_used, c.credit_status, c.payment_terms,
        COALESCE(SUM(CASE WHEN i.due_date >= CURRENT_DATE THEN i.grand_total - COALESCE(i.amount_paid,0) ELSE 0 END),0)::numeric(14,2) AS current_due,
        COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.due_date >= CURRENT_DATE - 30 THEN i.grand_total - COALESCE(i.amount_paid,0) ELSE 0 END),0)::numeric(14,2) AS days_30,
        COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 30 AND i.due_date >= CURRENT_DATE - 60 THEN i.grand_total - COALESCE(i.amount_paid,0) ELSE 0 END),0)::numeric(14,2) AS days_60,
        COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 60 AND i.due_date >= CURRENT_DATE - 90 THEN i.grand_total - COALESCE(i.amount_paid,0) ELSE 0 END),0)::numeric(14,2) AS days_90,
        COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 90 THEN i.grand_total - COALESCE(i.amount_paid,0) ELSE 0 END),0)::numeric(14,2) AS over_90
      FROM customers c
      LEFT JOIN invoices i ON i.customer_id=c.id AND i.status IN ('unpaid','partial')
      GROUP BY c.id ORDER BY c.name`);
    return NextResponse.json({ rows: rows.rows });
  }

  // Customer credit history
  if (sp.get('history')) {
    const rows = await db.query(`SELECT * FROM credit_history WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 50`, [sp.get('history')]);
    return NextResponse.json({ rows: rows.rows });
  }

  // Credit overview
  const [customers, summary] = await Promise.all([
    db.query(`SELECT c.*, (SELECT COALESCE(SUM(i.grand_total - COALESCE(i.amount_paid,0)),0) FROM invoices i WHERE i.customer_id=c.id AND i.status IN ('unpaid','partial'))::numeric(14,2) AS outstanding
      FROM customers c WHERE c.is_active=TRUE ORDER BY c.name`),
    db.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER(WHERE credit_status='blocked') AS blocked,
      SUM(credit_limit) AS total_limit, SUM(credit_used) AS total_used FROM customers WHERE is_active=TRUE`),
  ]);
  return NextResponse.json({ rows: customers.rows, summary: summary.rows[0] });
}

export async function PATCH(req: NextRequest) {
  const authErr = await requireRole('manager');
  if (authErr) return authErr;
  const b = await req.json();

  await db.query(`UPDATE customers SET credit_limit=$1, credit_status=$2, payment_terms=$3 WHERE id=$4`,
    [b.credit_limit ?? 0, b.credit_status ?? 'active', b.payment_terms ?? 30, b.id]);

  await db.query(`INSERT INTO credit_history (customer_id, event_type, amount, balance_after, reference, notes) VALUES ($1,'limit_change',$2,$3,$4,$5)`,
    [b.id, b.credit_limit ?? 0, b.credit_limit ?? 0, 'Credit limit updated', b.notes || null]);

  return NextResponse.json({ success: true });
}

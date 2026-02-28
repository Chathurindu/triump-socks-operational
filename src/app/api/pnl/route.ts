import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;

  try {
    // ── Revenue from invoices (paid / partial) ──────────────────────
    const invoiceRevenueQ = month
      ? db.query(
          `SELECT EXTRACT(MONTH FROM invoice_date)::int AS month,
                  COALESCE(SUM(grand_total), 0)::numeric AS amount
           FROM invoices
           WHERE status IN ('paid','partial')
             AND EXTRACT(YEAR FROM invoice_date) = $1
             AND EXTRACT(MONTH FROM invoice_date) = $2
           GROUP BY month ORDER BY month`,
          [year, month]
        )
      : db.query(
          `SELECT EXTRACT(MONTH FROM invoice_date)::int AS month,
                  COALESCE(SUM(grand_total), 0)::numeric AS amount
           FROM invoices
           WHERE status IN ('paid','partial')
             AND EXTRACT(YEAR FROM invoice_date) = $1
           GROUP BY month ORDER BY month`,
          [year]
        );

    // ── Revenue from transactions (income type) ─────────────────────
    const txnIncomeQ = month
      ? db.query(
          `SELECT EXTRACT(MONTH FROM txn_date)::int AS month,
                  COALESCE(SUM(amount), 0)::numeric AS amount
           FROM transactions
           WHERE txn_type = 'income'
             AND EXTRACT(YEAR FROM txn_date) = $1
             AND EXTRACT(MONTH FROM txn_date) = $2
           GROUP BY month ORDER BY month`,
          [year, month]
        )
      : db.query(
          `SELECT EXTRACT(MONTH FROM txn_date)::int AS month,
                  COALESCE(SUM(amount), 0)::numeric AS amount
           FROM transactions
           WHERE txn_type = 'income'
             AND EXTRACT(YEAR FROM txn_date) = $1
           GROUP BY month ORDER BY month`,
          [year]
        );

    // ── Revenue by source breakdown ─────────────────────────────────
    const revenueBySourceQ = month
      ? db.query(
          `SELECT 'Invoices' AS source,
                  COALESCE(SUM(grand_total), 0)::numeric AS amount
           FROM invoices
           WHERE status IN ('paid','partial')
             AND EXTRACT(YEAR FROM invoice_date) = $1
             AND EXTRACT(MONTH FROM invoice_date) = $2
           UNION ALL
           SELECT 'Sales Orders' AS source,
                  COALESCE(SUM(grand_total), 0)::numeric AS amount
           FROM sales_orders
           WHERE payment_status IN ('paid','partial')
             AND EXTRACT(YEAR FROM order_date) = $1
             AND EXTRACT(MONTH FROM order_date) = $2
           UNION ALL
           SELECT 'Other Income' AS source,
                  COALESCE(SUM(amount), 0)::numeric AS amount
           FROM transactions
           WHERE txn_type = 'income'
             AND EXTRACT(YEAR FROM txn_date) = $1
             AND EXTRACT(MONTH FROM txn_date) = $2`,
          [year, month]
        )
      : db.query(
          `SELECT 'Invoices' AS source,
                  COALESCE(SUM(grand_total), 0)::numeric AS amount
           FROM invoices
           WHERE status IN ('paid','partial')
             AND EXTRACT(YEAR FROM invoice_date) = $1
           UNION ALL
           SELECT 'Sales Orders' AS source,
                  COALESCE(SUM(grand_total), 0)::numeric AS amount
           FROM sales_orders
           WHERE payment_status IN ('paid','partial')
             AND EXTRACT(YEAR FROM order_date) = $1
           UNION ALL
           SELECT 'Other Income' AS source,
                  COALESCE(SUM(amount), 0)::numeric AS amount
           FROM transactions
           WHERE txn_type = 'income'
             AND EXTRACT(YEAR FROM txn_date) = $1`,
          [year]
        );

    // ── Expenses by month ───────────────────────────────────────────
    const expenseMonthlyQ = month
      ? db.query(
          `SELECT EXTRACT(MONTH FROM expense_date)::int AS month,
                  COALESCE(SUM(amount), 0)::numeric AS amount
           FROM expenses
           WHERE EXTRACT(YEAR FROM expense_date) = $1
             AND EXTRACT(MONTH FROM expense_date) = $2
           GROUP BY month ORDER BY month`,
          [year, month]
        )
      : db.query(
          `SELECT EXTRACT(MONTH FROM expense_date)::int AS month,
                  COALESCE(SUM(amount), 0)::numeric AS amount
           FROM expenses
           WHERE EXTRACT(YEAR FROM expense_date) = $1
           GROUP BY month ORDER BY month`,
          [year]
        );

    // ── Expenses by category ────────────────────────────────────────
    const expenseByCategoryQ = month
      ? db.query(
          `SELECT COALESCE(ec.name, 'Uncategorized') AS category,
                  COALESCE(SUM(e.amount), 0)::numeric AS amount
           FROM expenses e
           LEFT JOIN expense_categories ec ON ec.id = e.category_id
           WHERE EXTRACT(YEAR FROM e.expense_date) = $1
             AND EXTRACT(MONTH FROM e.expense_date) = $2
           GROUP BY ec.name ORDER BY amount DESC`,
          [year, month]
        )
      : db.query(
          `SELECT COALESCE(ec.name, 'Uncategorized') AS category,
                  COALESCE(SUM(e.amount), 0)::numeric AS amount
           FROM expenses e
           LEFT JOIN expense_categories ec ON ec.id = e.category_id
           WHERE EXTRACT(YEAR FROM e.expense_date) = $1
           GROUP BY ec.name ORDER BY amount DESC`,
          [year]
        );

    // ── Payroll costs by month ──────────────────────────────────────
    const payrollQ = month
      ? db.query(
          `SELECT period_month AS month,
                  COALESCE(SUM(net_salary), 0)::numeric AS amount
           FROM payroll
           WHERE period_year = $1 AND period_month = $2
             AND payment_status = 'paid'
           GROUP BY period_month ORDER BY period_month`,
          [year, month]
        )
      : db.query(
          `SELECT period_month AS month,
                  COALESCE(SUM(net_salary), 0)::numeric AS amount
           FROM payroll
           WHERE period_year = $1 AND payment_status = 'paid'
           GROUP BY period_month ORDER BY period_month`,
          [year]
        );

    // ── Execute all in parallel ─────────────────────────────────────
    const [
      invoiceRevenue,
      txnIncome,
      revenueBySource,
      expenseMonthly,
      expenseByCategory,
      payrollCosts,
    ] = await Promise.all([
      invoiceRevenueQ,
      txnIncomeQ,
      revenueBySourceQ,
      expenseMonthlyQ,
      expenseByCategoryQ,
      payrollQ,
    ]);

    // ── Merge monthly revenue (invoices + transaction income) ───────
    const revenueMap = new Map<number, number>();
    for (const r of invoiceRevenue.rows) {
      revenueMap.set(r.month, parseFloat(r.amount));
    }
    for (const r of txnIncome.rows) {
      const cur = revenueMap.get(r.month) ?? 0;
      revenueMap.set(r.month, cur + parseFloat(r.amount));
    }

    const revenueMonthly = Array.from(revenueMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([m, amount]) => ({ month: m, amount: Number(amount.toFixed(2)) }));

    const totalRevenue = revenueMonthly.reduce((s, r) => s + r.amount, 0);

    // ── Merge monthly expenses (expenses + payroll) ─────────────────
    const expenseMap = new Map<number, number>();
    for (const r of expenseMonthly.rows) {
      expenseMap.set(r.month, parseFloat(r.amount));
    }
    for (const r of payrollCosts.rows) {
      const cur = expenseMap.get(r.month) ?? 0;
      expenseMap.set(r.month, cur + parseFloat(r.amount));
    }

    const expensesMonthlyArr = Array.from(expenseMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([m, amount]) => ({ month: m, amount: Number(amount.toFixed(2)) }));

    const totalExpenses = expensesMonthlyArr.reduce((s, r) => s + r.amount, 0);

    // ── Add payroll as a category in expense breakdown ──────────────
    const payrollTotal = payrollCosts.rows.reduce(
      (s: number, r: { amount: string }) => s + parseFloat(r.amount),
      0
    );
    const byCategory = expenseByCategory.rows.map((r: { category: string; amount: string }) => ({
      category: r.category,
      amount: Number(parseFloat(r.amount).toFixed(2)),
    }));
    if (payrollTotal > 0) {
      byCategory.push({ category: 'Payroll', amount: Number(payrollTotal.toFixed(2)) });
    }
    byCategory.sort((a: { amount: number }, b: { amount: number }) => b.amount - a.amount);

    // ── By source (filter out zero rows) ────────────────────────────
    const bySource = revenueBySource.rows
      .map((r: { source: string; amount: string }) => ({
        source: r.source,
        amount: Number(parseFloat(r.amount).toFixed(2)),
      }))
      .filter((r: { amount: number }) => r.amount > 0);

    // ── Summary ─────────────────────────────────────────────────────
    const netProfit = Number((totalRevenue - totalExpenses).toFixed(2));
    const marginPercent =
      totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(2)) : 0;

    return NextResponse.json({
      year,
      month: month ?? null,
      revenue: {
        total: Number(totalRevenue.toFixed(2)),
        monthly: revenueMonthly,
        bySource,
      },
      expenses: {
        total: Number(totalExpenses.toFixed(2)),
        monthly: expensesMonthlyArr,
        byCategory,
      },
      summary: {
        revenue: Number(totalRevenue.toFixed(2)),
        expenses: Number(totalExpenses.toFixed(2)),
        net_profit: netProfit,
        margin_percent: marginPercent,
      },
    });
  } catch (err) {
    console.error('P&L report error:', err);
    return NextResponse.json({ error: 'Failed to generate P&L report' }, { status: 500 });
  }
}

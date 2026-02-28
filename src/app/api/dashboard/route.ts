import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [
      revenueRes,
      expenseRes,
      employeeRes,
      attendanceRes,
      activeOrdersRes,
      lowStockRes,
      productionRes,
      monthlyRes,
      topProductsRes,
      recentTxnRes,
    ] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE txn_type='income' AND DATE_TRUNC('month', txn_date) = DATE_TRUNC('month', CURRENT_DATE)`),
      db.query(`SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE txn_type='expense' AND DATE_TRUNC('month', txn_date) = DATE_TRUNC('month', CURRENT_DATE)`),
      db.query(`SELECT COUNT(*) AS total FROM employees WHERE status='active'`),
      db.query(`SELECT COUNT(*) AS total FROM attendance WHERE date = CURRENT_DATE AND status='present'`),
      db.query(`SELECT COUNT(*) AS total FROM sales_orders WHERE status NOT IN ('delivered','cancelled')`),
      db.query(`SELECT COUNT(*) AS total FROM inventory_items WHERE current_stock <= reorder_level AND is_active=TRUE`),
      db.query(`SELECT COUNT(*) AS total FROM production_orders WHERE status='in_progress'`),
      db.query(`
        SELECT TO_CHAR(txn_date,'Mon YY') AS month,
               SUM(CASE WHEN txn_type='income'  THEN amount ELSE 0 END) AS revenue,
               SUM(CASE WHEN txn_type='expense' THEN amount ELSE 0 END) AS expense
        FROM transactions
        WHERE txn_date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', txn_date), TO_CHAR(txn_date,'Mon YY')
        ORDER BY DATE_TRUNC('month', txn_date)
      `),
      db.query(`
        SELECT p.name, SUM(soi.quantity) AS qty, SUM(soi.line_total) AS revenue
        FROM sales_order_items soi
        JOIN products p ON p.id = soi.product_id
        GROUP BY p.name ORDER BY revenue DESC LIMIT 6
      `),
      db.query(`
        SELECT t.*, a.name AS account_name
        FROM transactions t LEFT JOIN accounts a ON a.id = t.account_id
        ORDER BY t.created_at DESC LIMIT 8
      `),
    ]);

    return NextResponse.json({
      totalRevenue:         parseFloat(revenueRes.rows[0].total),
      totalExpense:         parseFloat(expenseRes.rows[0].total),
      netProfit:            parseFloat(revenueRes.rows[0].total) - parseFloat(expenseRes.rows[0].total),
      totalEmployees:       parseInt(employeeRes.rows[0].total),
      presentToday:         parseInt(attendanceRes.rows[0].total),
      activeOrders:         parseInt(activeOrdersRes.rows[0].total),
      lowStockItems:        parseInt(lowStockRes.rows[0].total),
      productionInProgress: parseInt(productionRes.rows[0].total),
      monthlyRevenue:       monthlyRes.rows.map((r) => ({
        month:   r.month,
        revenue: parseFloat(r.revenue),
        expense: parseFloat(r.expense),
      })),
      topProducts: topProductsRes.rows.map((r) => ({
        name:     r.name,
        quantity: parseInt(r.qty),
        revenue:  parseFloat(r.revenue),
      })),
      recentTransactions: recentTxnRes.rows,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}

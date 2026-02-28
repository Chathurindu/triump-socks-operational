import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [monthly, productSales, categoryRev, expBreakdown, hrData, productionTrend] = await Promise.all([
      // Monthly revenue vs expense (12 months)
      db.query(`
        SELECT TO_CHAR(txn_date,'Mon') AS month,
               EXTRACT(MONTH FROM txn_date) AS month_num,
               EXTRACT(YEAR FROM txn_date)  AS year,
               SUM(CASE WHEN txn_type='income'  THEN amount ELSE 0 END) AS revenue,
               SUM(CASE WHEN txn_type='expense' THEN amount ELSE 0 END) AS expense
        FROM transactions
        WHERE txn_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY TO_CHAR(txn_date,'Mon'), EXTRACT(MONTH FROM txn_date), EXTRACT(YEAR FROM txn_date)
        ORDER BY year, month_num
      `),
      // Product sales
      db.query(`
        SELECT p.name, SUM(soi.quantity) AS qty, SUM(soi.line_total) AS revenue
        FROM sales_order_items soi
        JOIN products p ON p.id = soi.product_id
        GROUP BY p.name ORDER BY revenue DESC LIMIT 10
      `),
      // Revenue by category
      db.query(`
        SELECT pc.name AS category, SUM(soi.line_total) AS revenue
        FROM sales_order_items soi
        JOIN products p ON p.id = soi.product_id
        JOIN product_categories pc ON pc.id = p.category_id
        GROUP BY pc.name ORDER BY revenue DESC
      `),
      // Expense breakdown
      db.query(`
        SELECT category, SUM(amount) AS total
        FROM transactions WHERE txn_type='expense'
        GROUP BY category ORDER BY total DESC
      `),
      // HR stats
      db.query(`
        SELECT 
          COUNT(*) AS total_employees,
          COUNT(*) FILTER (WHERE status='active') AS active,
          COUNT(*) FILTER (WHERE status='on-leave') AS on_leave,
          AVG(salary) AS avg_salary,
          SUM(salary) AS total_salary
        FROM employees
      `),
      // Production trend
      db.query(`
        SELECT TO_CHAR(created_at,'Mon YY') AS month,
               SUM(quantity) AS planned, SUM(produced_qty) AS produced
        FROM production_orders
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY TO_CHAR(created_at,'Mon YY'), DATE_TRUNC('month',created_at)
        ORDER BY DATE_TRUNC('month',created_at)
      `),
    ]);

    return NextResponse.json({
      monthly:         monthly.rows,
      productSales:    productSales.rows,
      categoryRevenue: categoryRev.rows,
      expenseBreakdown:expBreakdown.rows,
      hrStats:         hrData.rows[0],
      productionTrend: productionTrend.rows,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Analytics error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

/* ------------------------------------------------------------------ */
/*  GET — demand history, forecast, overview, or product meta         */
/* ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);

  // ── Product list for dropdowns ────────────────────────────────────
  if (searchParams.get('meta') === '1') {
    const res = await db.query(
      `SELECT id, name, sku FROM products WHERE is_active = TRUE ORDER BY name`
    );
    return NextResponse.json({ products: res.rows });
  }

  // ── Single product: history + 3-month moving-avg forecast ─────────
  const productId = searchParams.get('product_id');
  if (productId) {
    try {
      const history = await db.query(
        `SELECT dh.id, dh.period_month, dh.period_year,
                dh.quantity_sold, dh.revenue::numeric
         FROM demand_history dh
         WHERE dh.product_id = $1
         ORDER BY dh.period_year DESC, dh.period_month DESC
         LIMIT 24`,
        [productId]
      );

      // Reverse so oldest-first for forecast calculation
      const rows = [...history.rows].reverse();

      // 3-month moving average forecast
      const forecast: { month: number; year: number; predicted_qty: number }[] = [];
      const window = rows.slice(-3).map((r: { quantity_sold: number }) => r.quantity_sold);

      if (window.length >= 1) {
        // Determine next month from the latest record
        const latest = rows[rows.length - 1];
        let nextMonth = latest.period_month;
        let nextYear = latest.period_year;

        for (let i = 0; i < 3; i++) {
          nextMonth++;
          if (nextMonth > 12) { nextMonth = 1; nextYear++; }

          const avg = Math.round(window.reduce((a: number, b: number) => a + b, 0) / window.length);
          forecast.push({ month: nextMonth, year: nextYear, predicted_qty: avg });

          // Slide the window
          window.push(avg);
          if (window.length > 3) window.shift();
        }
      }

      const product = await db.query(
        `SELECT id, name, sku FROM products WHERE id = $1`,
        [productId]
      );

      return NextResponse.json({
        product: product.rows[0] ?? null,
        history: history.rows,
        forecast,
      });
    } catch (err) {
      console.error('Demand forecast product error:', err);
      return NextResponse.json({ error: 'Failed to fetch demand data' }, { status: 500 });
    }
  }

  // ── Overview: top 10 products + trend ─────────────────────────────
  if (searchParams.get('action') === 'overview') {
    try {
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth() + 1; // 1-12

      // Current quarter boundaries
      const curQ = Math.ceil(curMonth / 3);
      const curQStart = (curQ - 1) * 3 + 1;
      const curQEnd = curQ * 3;

      // Previous quarter
      let prevQStart: number, prevQEnd: number, prevQYear: number;
      if (curQ === 1) {
        prevQStart = 10; prevQEnd = 12; prevQYear = curYear - 1;
      } else {
        prevQStart = curQStart - 3; prevQEnd = curQStart - 1; prevQYear = curYear;
      }

      const top10 = await db.query(
        `SELECT dh.product_id, p.name AS product_name, p.sku,
                SUM(dh.quantity_sold)::int AS total_sold,
                COALESCE(SUM(dh.revenue), 0)::numeric AS total_revenue
         FROM demand_history dh
         JOIN products p ON p.id = dh.product_id
         WHERE (dh.period_year = $1 AND dh.period_month >= $2)
            OR (dh.period_year = $3 AND dh.period_month <= $4)
         GROUP BY dh.product_id, p.name, p.sku
         ORDER BY total_sold DESC
         LIMIT 10`,
        [
          curYear - 1, curMonth + 1,   // 12 months ago start
          curYear, curMonth,            // up to current month
        ]
      );

      // Calculate trend per product (current quarter vs previous quarter)
      const productIds = top10.rows.map((r: { product_id: string }) => r.product_id);

      let trends: Record<string, { current_qty: number; previous_qty: number }> = {};
      if (productIds.length > 0) {
        const placeholders = productIds.map((_: string, i: number) => `$${i + 1}`).join(',');

        const [curQRes, prevQRes] = await Promise.all([
          db.query(
            `SELECT product_id, COALESCE(SUM(quantity_sold), 0)::int AS qty
             FROM demand_history
             WHERE product_id IN (${placeholders})
               AND period_year = $${productIds.length + 1}
               AND period_month BETWEEN $${productIds.length + 2} AND $${productIds.length + 3}
             GROUP BY product_id`,
            [...productIds, curYear, curQStart, curQEnd]
          ),
          db.query(
            `SELECT product_id, COALESCE(SUM(quantity_sold), 0)::int AS qty
             FROM demand_history
             WHERE product_id IN (${placeholders})
               AND period_year = $${productIds.length + 1}
               AND period_month BETWEEN $${productIds.length + 2} AND $${productIds.length + 3}
             GROUP BY product_id`,
            [...productIds, prevQYear, prevQStart, prevQEnd]
          ),
        ]);

        for (const r of curQRes.rows) {
          trends[r.product_id] = { current_qty: r.qty, previous_qty: 0 };
        }
        for (const r of prevQRes.rows) {
          if (!trends[r.product_id]) {
            trends[r.product_id] = { current_qty: 0, previous_qty: r.qty };
          } else {
            trends[r.product_id].previous_qty = r.qty;
          }
        }
      }

      const overview = top10.rows.map((r: { product_id: string; product_name: string; sku: string; total_sold: number; total_revenue: string }) => {
        const t = trends[r.product_id] ?? { current_qty: 0, previous_qty: 0 };
        const trendPercent =
          t.previous_qty > 0
            ? Number((((t.current_qty - t.previous_qty) / t.previous_qty) * 100).toFixed(1))
            : t.current_qty > 0
              ? 100
              : 0;
        return {
          product_id: r.product_id,
          product_name: r.product_name,
          sku: r.sku,
          total_sold: r.total_sold,
          total_revenue: Number(parseFloat(r.total_revenue).toFixed(2)),
          trend: {
            current_quarter_qty: t.current_qty,
            previous_quarter_qty: t.previous_qty,
            change_percent: trendPercent,
          },
        };
      });

      return NextResponse.json({ overview });
    } catch (err) {
      console.error('Demand overview error:', err);
      return NextResponse.json({ error: 'Failed to fetch demand overview' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Provide product_id, action=overview, or meta=1' }, { status: 400 });
}

/* ------------------------------------------------------------------ */
/*  POST — upsert demand_history record                               */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { product_id, period_month, period_year, quantity_sold, revenue } = body;

    if (!product_id || !period_month || !period_year || quantity_sold == null) {
      return NextResponse.json(
        { error: 'product_id, period_month, period_year, and quantity_sold are required' },
        { status: 400 }
      );
    }

    if (period_month < 1 || period_month > 12) {
      return NextResponse.json({ error: 'period_month must be between 1 and 12' }, { status: 400 });
    }

    const res = await db.query(
      `INSERT INTO demand_history (product_id, period_month, period_year, quantity_sold, revenue)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (product_id, period_month, period_year)
       DO UPDATE SET quantity_sold = EXCLUDED.quantity_sold,
                     revenue = EXCLUDED.revenue
       RETURNING *`,
      [product_id, period_month, period_year, quantity_sold, revenue ?? 0]
    );

    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('Demand history POST error:', err);
    return NextResponse.json({ error: 'Failed to save demand record' }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE — remove a demand_history record by id                     */
/* ------------------------------------------------------------------ */
export async function DELETE(req: NextRequest) {
  const authErr = await requireRole('manager');
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const res = await db.query(
      `DELETE FROM demand_history WHERE id = $1 RETURNING id`,
      [id]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (err) {
    console.error('Demand history DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete demand record' }, { status: 500 });
  }
}

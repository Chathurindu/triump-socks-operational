import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, getSession } from '@/lib/auth-utils';

/* ─── Available report types ─── */
const REPORT_TYPES = [
  { value: 'sales_summary',     label: 'Sales Summary' },
  { value: 'inventory_status',  label: 'Inventory Status' },
  { value: 'production_output', label: 'Production Output' },
  { value: 'expense_report',    label: 'Expense Report' },
  { value: 'customer_report',   label: 'Customer Report' },
  { value: 'employee_report',   label: 'Employee Report' },
  { value: 'purchase_summary',  label: 'Purchase Summary' },
];

/* ─── Pre-defined report query runners ─── */

async function runSalesSummary(dateFrom?: string, dateTo?: string) {
  const params: unknown[] = [];
  let idx = 1;
  let dateFilter = '';
  if (dateFrom) { dateFilter += ` AND so.order_date >= $${idx}`; params.push(dateFrom); idx++; }
  if (dateTo)   { dateFilter += ` AND so.order_date <= $${idx}`; params.push(dateTo);   idx++; }

  const res = await db.query(
    `SELECT so.id, so.order_number, c.name AS customer_name, so.order_date,
            so.status, so.payment_status, so.total_amount, so.discount,
            so.tax_amount, so.grand_total
     FROM sales_orders so
     LEFT JOIN customers c ON c.id = so.customer_id
     WHERE 1=1 ${dateFilter}
     ORDER BY so.order_date DESC`,
    params,
  );

  return {
    columns: [
      { key: 'order_number',   label: 'Order #' },
      { key: 'customer_name',  label: 'Customer' },
      { key: 'order_date',     label: 'Date' },
      { key: 'status',         label: 'Status' },
      { key: 'payment_status', label: 'Payment' },
      { key: 'total_amount',   label: 'Subtotal' },
      { key: 'discount',       label: 'Discount' },
      { key: 'tax_amount',     label: 'Tax' },
      { key: 'grand_total',    label: 'Grand Total' },
    ],
    rows: res.rows,
  };
}

async function runInventoryStatus() {
  const res = await db.query(
    `SELECT id, item_name, sku, category, current_stock, reorder_level,
            unit, unit_price, location
     FROM inventory_items
     ORDER BY item_name`,
  );

  return {
    columns: [
      { key: 'item_name',     label: 'Item' },
      { key: 'sku',           label: 'SKU' },
      { key: 'category',      label: 'Category' },
      { key: 'current_stock', label: 'Stock' },
      { key: 'reorder_level', label: 'Reorder Level' },
      { key: 'unit',          label: 'Unit' },
      { key: 'unit_price',    label: 'Unit Price' },
      { key: 'location',      label: 'Location' },
    ],
    rows: res.rows,
  };
}

async function runProductionOutput(dateFrom?: string, dateTo?: string) {
  const params: unknown[] = [];
  let idx = 1;
  let dateFilter = '';
  if (dateFrom) { dateFilter += ` AND po.start_date >= $${idx}`; params.push(dateFrom); idx++; }
  if (dateTo)   { dateFilter += ` AND po.start_date <= $${idx}`; params.push(dateTo);   idx++; }

  const res = await db.query(
    `SELECT po.id, po.order_number, po.product_name, po.quantity,
            po.completed_quantity, po.status, po.start_date, po.end_date
     FROM production_orders po
     WHERE 1=1 ${dateFilter}
     ORDER BY po.start_date DESC`,
    params,
  );

  return {
    columns: [
      { key: 'order_number',        label: 'Order #' },
      { key: 'product_name',        label: 'Product' },
      { key: 'quantity',            label: 'Target Qty' },
      { key: 'completed_quantity',  label: 'Completed' },
      { key: 'status',             label: 'Status' },
      { key: 'start_date',         label: 'Start Date' },
      { key: 'end_date',           label: 'End Date' },
    ],
    rows: res.rows,
  };
}

async function runExpenseReport(dateFrom?: string, dateTo?: string) {
  const params: unknown[] = [];
  let idx = 1;
  let dateFilter = '';
  if (dateFrom) { dateFilter += ` AND e.expense_date >= $${idx}`; params.push(dateFrom); idx++; }
  if (dateTo)   { dateFilter += ` AND e.expense_date <= $${idx}`; params.push(dateTo);   idx++; }

  const res = await db.query(
    `SELECT e.id, e.description, e.category, e.amount, e.expense_date,
            e.payment_method, e.status, e.vendor
     FROM expenses e
     WHERE 1=1 ${dateFilter}
     ORDER BY e.expense_date DESC`,
    params,
  );

  return {
    columns: [
      { key: 'description',    label: 'Description' },
      { key: 'category',       label: 'Category' },
      { key: 'amount',         label: 'Amount' },
      { key: 'expense_date',   label: 'Date' },
      { key: 'payment_method', label: 'Payment Method' },
      { key: 'status',         label: 'Status' },
      { key: 'vendor',         label: 'Vendor' },
    ],
    rows: res.rows,
  };
}

async function runCustomerReport() {
  const res = await db.query(
    `SELECT id, name, customer_type, email, phone, city,
            credit_limit, credit_used, is_active
     FROM customers
     ORDER BY name`,
  );

  return {
    columns: [
      { key: 'name',          label: 'Name' },
      { key: 'customer_type', label: 'Type' },
      { key: 'email',         label: 'Email' },
      { key: 'phone',         label: 'Phone' },
      { key: 'city',          label: 'City' },
      { key: 'credit_limit',  label: 'Credit Limit' },
      { key: 'credit_used',   label: 'Credit Used' },
      { key: 'is_active',     label: 'Active' },
    ],
    rows: res.rows,
  };
}

async function runEmployeeReport() {
  const res = await db.query(
    `SELECT id, name, email, phone, department, designation,
            employment_type, joining_date, is_active
     FROM employees
     ORDER BY name`,
  );

  return {
    columns: [
      { key: 'name',            label: 'Name' },
      { key: 'email',           label: 'Email' },
      { key: 'phone',           label: 'Phone' },
      { key: 'department',      label: 'Department' },
      { key: 'designation',     label: 'Designation' },
      { key: 'employment_type', label: 'Type' },
      { key: 'joining_date',    label: 'Joined' },
      { key: 'is_active',       label: 'Active' },
    ],
    rows: res.rows,
  };
}

async function runPurchaseSummary(dateFrom?: string, dateTo?: string) {
  const params: unknown[] = [];
  let idx = 1;
  let dateFilter = '';
  if (dateFrom) { dateFilter += ` AND po.order_date >= $${idx}`; params.push(dateFrom); idx++; }
  if (dateTo)   { dateFilter += ` AND po.order_date <= $${idx}`; params.push(dateTo);   idx++; }

  const res = await db.query(
    `SELECT po.id, po.order_number, s.name AS supplier_name, po.order_date,
            po.status, po.total_amount, po.tax_amount, po.grand_total
     FROM purchase_orders po
     LEFT JOIN suppliers s ON s.id = po.supplier_id
     WHERE 1=1 ${dateFilter}
     ORDER BY po.order_date DESC`,
    params,
  );

  return {
    columns: [
      { key: 'order_number',  label: 'PO #' },
      { key: 'supplier_name', label: 'Supplier' },
      { key: 'order_date',    label: 'Date' },
      { key: 'status',        label: 'Status' },
      { key: 'total_amount',  label: 'Subtotal' },
      { key: 'tax_amount',    label: 'Tax' },
      { key: 'grand_total',   label: 'Grand Total' },
    ],
    rows: res.rows,
  };
}

/* ─── GET ─── */
export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);

  /* Return meta: available report types */
  if (searchParams.get('meta') === '1') {
    return NextResponse.json({ report_types: REPORT_TYPES });
  }

  /* Return a single saved report by id */
  const id = searchParams.get('id');
  if (id) {
    try {
      const res = await db.query('SELECT * FROM saved_reports WHERE id = $1', [id]);
      if (!res.rows.length) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
      return NextResponse.json({ data: res.rows[0] });
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
    }
  }

  /* Run a report */
  const action = searchParams.get('action');
  const type   = searchParams.get('type');
  if (action === 'run' && type) {
    const dateFrom = searchParams.get('date_from') || undefined;
    const dateTo   = searchParams.get('date_to')   || undefined;

    try {
      let result: { columns: { key: string; label: string }[]; rows: unknown[] };

      switch (type) {
        case 'sales_summary':
          result = await runSalesSummary(dateFrom, dateTo);
          break;
        case 'inventory_status':
          result = await runInventoryStatus();
          break;
        case 'production_output':
          result = await runProductionOutput(dateFrom, dateTo);
          break;
        case 'expense_report':
          result = await runExpenseReport(dateFrom, dateTo);
          break;
        case 'customer_report':
          result = await runCustomerReport();
          break;
        case 'employee_report':
          result = await runEmployeeReport();
          break;
        case 'purchase_summary':
          result = await runPurchaseSummary(dateFrom, dateTo);
          break;
        default:
          return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
      }

      return NextResponse.json(result);
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: 'Failed to run report' }, { status: 500 });
    }
  }

  /* List saved reports (paginated, searchable) */
  try {
    const search = searchParams.get('search') ?? '';
    const page   = parseInt(searchParams.get('page') ?? '1');
    const limit  = parseInt(searchParams.get('limit') ?? '15');
    const offset = (page - 1) * limit;

    const where  = `WHERE name ILIKE $1`;
    const params = [`%${search}%`];

    const [res, countRes] = await Promise.all([
      db.query(
        `SELECT * FROM saved_reports ${where} ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
        [...params, limit, offset],
      ),
      db.query(`SELECT COUNT(*) FROM saved_reports ${where}`, params),
    ]);

    return NextResponse.json({
      data:  res.rows,
      total: parseInt(countRes.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch saved reports' }, { status: 500 });
  }
}

/* ─── POST ─── */
export async function POST(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;

  try {
    const session = await getSession();
    const createdBy = session?.user?.name ?? 'unknown';
    const b = await req.json();

    if (!b.name || !b.report_type) {
      return NextResponse.json({ error: 'name and report_type are required' }, { status: 400 });
    }

    const res = await db.query(
      `INSERT INTO saved_reports (name, description, report_type, config, created_by, is_public)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        b.name,
        b.description || null,
        b.report_type,
        JSON.stringify(b.config ?? {}),
        createdBy,
        b.is_public ?? false,
      ],
    );

    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ─── PATCH ─── */
export async function PATCH(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;

  try {
    const b = await req.json();
    if (!b.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (b.name !== undefined)        { fields.push(`name = $${idx}`);        params.push(b.name);                   idx++; }
    if (b.description !== undefined) { fields.push(`description = $${idx}`); params.push(b.description);            idx++; }
    if (b.report_type !== undefined) { fields.push(`report_type = $${idx}`); params.push(b.report_type);            idx++; }
    if (b.config !== undefined)      { fields.push(`config = $${idx}`);      params.push(JSON.stringify(b.config)); idx++; }
    if (b.is_public !== undefined)   { fields.push(`is_public = $${idx}`);   params.push(b.is_public);              idx++; }

    if (!fields.length) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    fields.push(`updated_at = NOW()`);
    params.push(b.id);

    const res = await db.query(
      `UPDATE saved_reports SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );

    if (!res.rows.length) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ data: res.rows[0] });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ─── DELETE ─── */
export async function DELETE(req: NextRequest) {
  const authErr = await requireRole('manager');
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const res = await db.query('DELETE FROM saved_reports WHERE id = $1 RETURNING id', [id]);
    if (!res.rows.length) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, getSession } from '@/lib/auth-utils';

const EXPORT_TYPES = [
  { value: 'inventory', label: 'Inventory Items' },
  { value: 'customers', label: 'Customers' },
  { value: 'suppliers', label: 'Suppliers' },
  { value: 'products', label: 'Products' },
  { value: 'expenses', label: 'Expenses' },
];

const TEMPLATES: Record<string, { key: string; label: string }[]> = {
  inventory: [
    { key: 'name', label: 'Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'unit', label: 'Unit' },
    { key: 'unit_price', label: 'Unit Price' },
    { key: 'category', label: 'Category' },
  ],
  customers: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
  ],
  suppliers: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
  ],
  products: [
    { key: 'name', label: 'Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: 'Category' },
    { key: 'selling_price', label: 'Selling Price' },
  ],
  expenses: [
    { key: 'expense_date', label: 'Expense Date' },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount' },
    { key: 'payment_method', label: 'Payment Method' },
  ],
};

const EXPORT_COLUMNS: Record<string, { key: string; label: string }[]> = {
  inventory: [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'unit', label: 'Unit' },
    { key: 'unit_price', label: 'Unit Price' },
    { key: 'category', label: 'Category' },
    { key: 'reorder_point', label: 'Reorder Point' },
  ],
  customers: [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'credit_limit', label: 'Credit Limit' },
    { key: 'credit_status', label: 'Credit Status' },
  ],
  suppliers: [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
  ],
  products: [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: 'Category' },
    { key: 'selling_price', label: 'Selling Price' },
  ],
  expenses: [
    { key: 'id', label: 'ID' },
    { key: 'expense_date', label: 'Expense Date' },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount' },
    { key: 'payment_method', label: 'Payment Method' },
  ],
};

export async function GET(req: NextRequest) {
  try {
    const authErr = await requireRole('viewer');
    if (authErr) return authErr;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const type = searchParams.get('type');

    // Export data as JSON
    if (action === 'export' && type) {
      if (!EXPORT_COLUMNS[type]) {
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
      }

      let rows: any[] = [];

      switch (type) {
        case 'inventory': {
          const result = await db.query(
            `SELECT id, name, sku, quantity, unit, unit_price, category, reorder_point
             FROM inventory_items WHERE is_active = TRUE`
          );
          rows = result.rows;
          break;
        }
        case 'customers': {
          const result = await db.query(
            `SELECT id, name, email, phone, address, credit_limit, credit_status
             FROM customers WHERE is_active = TRUE`
          );
          rows = result.rows;
          break;
        }
        case 'suppliers': {
          const result = await db.query(
            `SELECT id, name, email, phone, address
             FROM suppliers WHERE is_active = TRUE`
          );
          rows = result.rows;
          break;
        }
        case 'products': {
          const result = await db.query(
            `SELECT id, name, sku, category, selling_price
             FROM products WHERE is_active = TRUE`
          );
          rows = result.rows;
          break;
        }
        case 'expenses': {
          const result = await db.query(
            `SELECT e.id, e.expense_date, ec.name as category, e.description, e.amount, e.payment_method
             FROM expenses e
             LEFT JOIN expense_categories ec ON ec.id = e.category_id
             ORDER BY expense_date DESC
             LIMIT 5000`
          );
          rows = result.rows;
          break;
        }
      }

      return NextResponse.json({
        columns: EXPORT_COLUMNS[type],
        rows,
        type,
      });
    }

    // Return template columns for import
    if (action === 'templates' && type) {
      if (!TEMPLATES[type]) {
        return NextResponse.json({ error: 'Invalid template type' }, { status: 400 });
      }

      return NextResponse.json({
        columns: TEMPLATES[type],
        type,
      });
    }

    // Return import logs
    if (action === 'logs') {
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      const [logsResult, countResult] = await Promise.all([
        db.query(
          `SELECT id, import_type, file_name, total_rows, success_count, error_count, errors, imported_by, status, created_at
           FROM import_logs
           ORDER BY created_at DESC
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        ),
        db.query(`SELECT COUNT(*) FROM import_logs`),
      ]);

      const total = parseInt(countResult.rows[0].count);

      return NextResponse.json({
        logs: logsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Default: return available types
    return NextResponse.json({ types: EXPORT_TYPES });
  } catch (error) {
    console.error('Import/Export GET error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authErr = await requireRole('staff');
    if (authErr) return authErr;

    const session = await getSession();
    const user = session?.user as { name?: string; email?: string } | undefined;
    const importedBy = user?.name || user?.email || 'Unknown';

    const { type, rows } = await req.json();

    if (!type || !rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Provide type and rows array.' },
        { status: 400 }
      );
    }

    if (!TEMPLATES[type]) {
      return NextResponse.json({ error: 'Invalid import type' }, { status: 400 });
    }

    const totalRows = rows.length;
    let successCount = 0;
    let errorCount = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      try {
        switch (type) {
          case 'inventory': {
            if (!row.name) throw new Error('Name is required');
            await db.query(
              `INSERT INTO inventory_items (name, sku, quantity, unit, unit_price, category)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                row.name,
                row.sku || null,
                parseInt(row.quantity) || 0,
                row.unit || 'pcs',
                parseFloat(row.unit_price) || 0,
                row.category || null,
              ]
            );
            successCount++;
            break;
          }
          case 'customers': {
            if (!row.name) throw new Error('Name is required');
            await db.query(
              `INSERT INTO customers (name, email, phone, address)
               VALUES ($1, $2, $3, $4)`,
              [
                row.name,
                row.email || null,
                row.phone || null,
                row.address || null,
              ]
            );
            successCount++;
            break;
          }
          case 'suppliers': {
            if (!row.name) throw new Error('Name is required');
            await db.query(
              `INSERT INTO suppliers (name, email, phone, address)
               VALUES ($1, $2, $3, $4)`,
              [
                row.name,
                row.email || null,
                row.phone || null,
                row.address || null,
              ]
            );
            successCount++;
            break;
          }
          default: {
            throw new Error(`Import not supported for type: ${type}`);
          }
        }
      } catch (err: any) {
        errorCount++;
        errors.push({ row: rowNum, message: err.message || 'Unknown error' });
      }
    }

    // Log the import
    await db.query(
      `INSERT INTO import_logs (import_type, file_name, total_rows, success_count, error_count, errors, imported_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        type,
        `${type}_import_${new Date().toISOString().slice(0, 10)}`,
        totalRows,
        successCount,
        errorCount,
        JSON.stringify(errors),
        importedBy,
        errorCount === totalRows ? 'failed' : errorCount > 0 ? 'partial' : 'completed',
      ]
    );

    return NextResponse.json({
      success: true,
      total_rows: totalRows,
      success_count: successCount,
      error_count: errorCount,
      errors,
    });
  } catch (error) {
    console.error('Import/Export POST error:', error);
    return NextResponse.json({ error: 'Failed to import data' }, { status: 500 });
  }
}

-- ============================================================
-- QUOTATIONS & INVOICES + EXPENSE TRACKER + DASHBOARD WIDGETS
-- Migration script — run once against the triumph database
-- ============================================================

-- ============================================================
-- EXPENSE CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  icon        VARCHAR(50),
  color       VARCHAR(30) DEFAULT 'gray',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default categories
INSERT INTO expense_categories (name, slug, icon, color) VALUES
  ('Raw Materials',   'raw-materials',   'Package',     'amber'),
  ('Utilities',       'utilities',       'Zap',         'blue'),
  ('Transport',       'transport',       'Truck',       'green'),
  ('Salaries',        'salaries',        'Users',       'purple'),
  ('Rent',            'rent',            'Building2',   'red'),
  ('Maintenance',     'maintenance',     'Wrench',      'gray'),
  ('Office Supplies', 'office-supplies', 'Briefcase',   'blue'),
  ('Marketing',       'marketing',       'Megaphone',   'purple'),
  ('Miscellaneous',   'miscellaneous',   'MoreHorizontal','gray')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id   INT REFERENCES expense_categories(id) ON DELETE SET NULL,
  description   TEXT,
  amount        NUMERIC(14,2) NOT NULL,
  payment_method VARCHAR(30) DEFAULT 'cash',
  receipt_url   TEXT,
  notes         TEXT,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);

-- ============================================================
-- QUOTATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS quotations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_number    VARCHAR(30) UNIQUE NOT NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  quote_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until     DATE,
  status          VARCHAR(20) DEFAULT 'draft',
  subtotal        NUMERIC(14,2) DEFAULT 0,
  discount        NUMERIC(14,2) DEFAULT 0,
  tax_rate        NUMERIC(5,2) DEFAULT 0,
  tax_amount      NUMERIC(14,2) DEFAULT 0,
  grand_total     NUMERIC(14,2) DEFAULT 0,
  notes           TEXT,
  terms           TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id    UUID REFERENCES quotations(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  description TEXT,
  quantity    INT NOT NULL DEFAULT 1,
  unit_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total  NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE INDEX IF NOT EXISTS idx_quotations_date   ON quotations(quote_date);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number  VARCHAR(30) UNIQUE NOT NULL,
  quotation_id    UUID REFERENCES quotations(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  invoice_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  status          VARCHAR(20) DEFAULT 'unpaid',
  subtotal        NUMERIC(14,2) DEFAULT 0,
  discount        NUMERIC(14,2) DEFAULT 0,
  tax_rate        NUMERIC(5,2) DEFAULT 0,
  tax_amount      NUMERIC(14,2) DEFAULT 0,
  grand_total     NUMERIC(14,2) DEFAULT 0,
  amount_paid     NUMERIC(14,2) DEFAULT 0,
  notes           TEXT,
  terms           TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  description TEXT,
  quantity    INT NOT NULL DEFAULT 1,
  unit_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total  NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID REFERENCES invoices(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount      NUMERIC(14,2) NOT NULL,
  method      VARCHAR(30) DEFAULT 'cash',
  reference   VARCHAR(100),
  notes       TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_date   ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);

-- ============================================================
-- USER DASHBOARD LAYOUTS (for customizable widgets)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_dashboard_layouts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  widgets     JSONB NOT NULL DEFAULT '[]',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

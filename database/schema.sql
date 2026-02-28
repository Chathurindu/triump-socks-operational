-- ============================================================
--  Triumph Socks – PostgreSQL Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ROLES & AUTH
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) UNIQUE NOT NULL,  -- admin | manager | hr | finance | production | viewer
  permissions JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name    VARCHAR(150) NOT NULL,
  role_id      INT REFERENCES roles(id) ON DELETE SET NULL,
  avatar_url   TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  last_login   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEPARTMENTS & EMPLOYEES
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  head_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  emp_code       VARCHAR(20) UNIQUE NOT NULL,
  full_name      VARCHAR(150) NOT NULL,
  email          VARCHAR(255),
  phone          VARCHAR(30),
  position       VARCHAR(100),
  department_id  INT REFERENCES departments(id) ON DELETE SET NULL,
  employment_type VARCHAR(30) DEFAULT 'full-time', -- full-time | part-time | contract
  join_date      DATE NOT NULL,
  termination_date DATE,
  status         VARCHAR(20) DEFAULT 'active',   -- active | on-leave | terminated
  salary         NUMERIC(12,2),
  bank_account   VARCHAR(50),
  nid            VARCHAR(30),
  address        TEXT,
  emergency_contact VARCHAR(150),
  avatar_url     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id  UUID REFERENCES employees(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  check_in     TIME,
  check_out    TIME,
  status       VARCHAR(20) DEFAULT 'present', -- present | absent | late | half-day | leave
  overtime_hrs NUMERIC(4,2) DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, date)
);

-- ============================================================
-- LEAVE MANAGEMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_types (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  days_allowed INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id  UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id INT REFERENCES leave_types(id),
  from_date    DATE NOT NULL,
  to_date      DATE NOT NULL,
  reason       TEXT,
  status       VARCHAR(20) DEFAULT 'pending', -- pending | approved | rejected
  approved_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYROLL
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE,
  period_month  INT NOT NULL,
  period_year   INT NOT NULL,
  basic_salary  NUMERIC(12,2),
  allowances    NUMERIC(12,2) DEFAULT 0,
  deductions    NUMERIC(12,2) DEFAULT 0,
  overtime_pay  NUMERIC(12,2) DEFAULT 0,
  bonus         NUMERIC(12,2) DEFAULT 0,
  tax           NUMERIC(12,2) DEFAULT 0,
  net_salary    NUMERIC(12,2) GENERATED ALWAYS AS
                  (basic_salary + allowances + overtime_pay + bonus - deductions - tax)
                STORED,
  payment_date  DATE,
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending | paid
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUPPLIERS & CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(200) NOT NULL,
  contact     VARCHAR(150),
  phone       VARCHAR(30),
  email       VARCHAR(150),
  address     TEXT,
  category    VARCHAR(50), -- yarn | needle | polythene | machine | other
  rating      NUMERIC(2,1) DEFAULT 5.0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(200) NOT NULL,
  contact     VARCHAR(150),
  phone       VARCHAR(30),
  email       VARCHAR(150),
  address     TEXT,
  customer_type VARCHAR(30) DEFAULT 'retail', -- retail | wholesale | distributor
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RAW MATERIALS / INVENTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS item_categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  type        VARCHAR(30) NOT NULL -- raw_material | finished_good | machine | consumable
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku           VARCHAR(50) UNIQUE NOT NULL,
  name          VARCHAR(200) NOT NULL,
  category_id   INT REFERENCES item_categories(id),
  unit          VARCHAR(20),             -- kg | pcs | roll | m | litre
  current_stock NUMERIC(14,3) DEFAULT 0,
  reorder_level NUMERIC(14,3) DEFAULT 0,
  unit_cost     NUMERIC(12,4) DEFAULT 0,
  supplier_id   UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  location      VARCHAR(100),
  description   TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number   VARCHAR(30) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  order_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  status      VARCHAR(20) DEFAULT 'pending', -- pending | confirmed | received | cancelled
  total_amount NUMERIC(14,2) DEFAULT 0,
  notes       TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id       UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id     UUID REFERENCES inventory_items(id),
  quantity    NUMERIC(14,3) NOT NULL,
  unit_price  NUMERIC(12,4) NOT NULL,
  received_qty NUMERIC(14,3) DEFAULT 0,
  line_total  NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- ============================================================
-- STOCK MOVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id     UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) NOT NULL, -- in | out | adjustment
  quantity    NUMERIC(14,3) NOT NULL,
  reference_type VARCHAR(30), -- purchase_order | production | sales | adjustment
  reference_id UUID,
  notes       TEXT,
  moved_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MACHINES
-- ============================================================
CREATE TABLE IF NOT EXISTS machines (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_code     VARCHAR(30) UNIQUE NOT NULL,
  name             VARCHAR(150) NOT NULL,
  type             VARCHAR(50), -- knitting | overlock | sealer | other
  brand            VARCHAR(100),
  model            VARCHAR(100),
  purchase_date    DATE,
  purchase_price   NUMERIC(14,2),
  status           VARCHAR(20) DEFAULT 'operational', -- operational | maintenance | idle | retired
  last_maintenance DATE,
  next_maintenance DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCT CATALOG
-- ============================================================
CREATE TABLE IF NOT EXISTS product_categories (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku           VARCHAR(50) UNIQUE NOT NULL,
  name          VARCHAR(200) NOT NULL,
  category_id   INT REFERENCES product_categories(id),
  description   TEXT,
  image_url     TEXT,
  unit_price    NUMERIC(12,2) NOT NULL,
  cost_price    NUMERIC(12,2) DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  min_stock     INT DEFAULT 100,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTION ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS production_orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number  VARCHAR(30) UNIQUE NOT NULL,
  product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity      INT NOT NULL,
  produced_qty  INT DEFAULT 0,
  status        VARCHAR(20) DEFAULT 'planned', -- planned | in_progress | completed | cancelled
  start_date    DATE,
  end_date      DATE,
  machine_id    UUID REFERENCES machines(id) ON DELETE SET NULL,
  supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SALES ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number  VARCHAR(30) UNIQUE NOT NULL,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  status        VARCHAR(20) DEFAULT 'pending', -- pending | confirmed | shipped | delivered | cancelled
  total_amount  NUMERIC(14,2) DEFAULT 0,
  discount      NUMERIC(14,2) DEFAULT 0,
  tax_amount    NUMERIC(14,2) DEFAULT 0,
  grand_total   NUMERIC(14,2) GENERATED ALWAYS AS (total_amount - discount + tax_amount) STORED,
  payment_status VARCHAR(20) DEFAULT 'unpaid', -- unpaid | partial | paid
  notes         TEXT,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  so_id       UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id),
  quantity    INT NOT NULL,
  unit_price  NUMERIC(12,2) NOT NULL,
  line_total  NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- ============================================================
-- FINANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS accounts (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(100) NOT NULL,
  type      VARCHAR(30) NOT NULL, -- asset | liability | equity | revenue | expense
  balance   NUMERIC(16,2) DEFAULT 0,
  currency  VARCHAR(5) DEFAULT 'BDT'
);

CREATE TABLE IF NOT EXISTS transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  txn_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  txn_type       VARCHAR(20) NOT NULL, -- income | expense | transfer
  category       VARCHAR(80),
  description    TEXT,
  amount         NUMERIC(14,2) NOT NULL,
  account_id     INT REFERENCES accounts(id),
  reference_type VARCHAR(30),
  reference_id   UUID,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  message     TEXT,
  type        VARCHAR(30) DEFAULT 'info', -- info | warning | error | success
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_employees_dept      ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date  ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_payroll_emp_period   ON payroll(employee_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_transactions_date    ON transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_sales_orders_date    ON sales_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id, is_read);

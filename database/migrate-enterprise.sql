-- ============================================================
-- Triumph ERP — Enterprise Features Migration
-- Run: psql -U postgres -d triumph -f database/migrate-enterprise.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. BILL OF MATERIALS (BOM)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bom_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  version       VARCHAR(20) DEFAULT '1.0',
  notes         TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bom_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id        UUID REFERENCES bom_templates(id) ON DELETE CASCADE,
  item_id       UUID REFERENCES inventory_items(id),
  quantity       NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit          VARCHAR(30) DEFAULT 'pcs',
  waste_percent NUMERIC(5,2) DEFAULT 0,
  notes         TEXT,
  sort_order    INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_bom_items_bom ON bom_items(bom_id);

-- ────────────────────────────────────────────────────────────
-- 2. QUALITY CONTROL
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qc_checklists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  items         JSONB NOT NULL DEFAULT '[]',  -- [{label, type: boolean|numeric, target, tolerance}]
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qc_inspections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID REFERENCES production_orders(id),
  checklist_id      UUID REFERENCES qc_checklists(id),
  inspector_id      UUID REFERENCES employees(id),
  inspection_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  batch_number      VARCHAR(50),
  sample_size       INT DEFAULT 0,
  pass_count        INT DEFAULT 0,
  fail_count        INT DEFAULT 0,
  results           JSONB NOT NULL DEFAULT '[]',  -- [{label, value, pass:boolean}]
  status            VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending','passed','failed','rework')),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qc_insp_prod ON qc_inspections(production_order_id);

-- ────────────────────────────────────────────────────────────
-- 3. WASTE / DAMAGE TRACKING
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waste_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID REFERENCES production_orders(id),
  product_id        UUID REFERENCES products(id),
  waste_type        VARCHAR(30) NOT NULL CHECK(waste_type IN ('damage','defect','material_waste','rework','other')),
  quantity          INT NOT NULL DEFAULT 0,
  unit_cost         NUMERIC(12,2) DEFAULT 0,
  total_cost        NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  cause             VARCHAR(200),
  machine_id        UUID REFERENCES machines(id),
  reported_by       UUID REFERENCES employees(id),
  waste_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_waste_date ON waste_records(waste_date);

-- ────────────────────────────────────────────────────────────
-- 4. MACHINE MAINTENANCE & BREAKDOWN HISTORY
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS machine_maintenance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id    UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  type          VARCHAR(30) NOT NULL CHECK(type IN ('preventive','corrective','breakdown','inspection')),
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  reported_by   UUID REFERENCES employees(id),
  assigned_to   VARCHAR(200),
  start_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date      DATE,
  cost          NUMERIC(12,2) DEFAULT 0,
  parts_used    JSONB DEFAULT '[]',  -- [{name, quantity, cost}]
  status        VARCHAR(20) DEFAULT 'open' CHECK(status IN ('open','in_progress','completed','cancelled')),
  priority      VARCHAR(10) DEFAULT 'medium' CHECK(priority IN ('low','medium','high','critical')),
  downtime_hours NUMERIC(8,2) DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_maint_machine ON machine_maintenance(machine_id);
CREATE INDEX IF NOT EXISTS idx_maint_status  ON machine_maintenance(status);

-- ────────────────────────────────────────────────────────────
-- 5. CREDIT MANAGEMENT (extends customers)
-- ────────────────────────────────────────────────────────────
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit   NUMERIC(14,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_used    NUMERIC(14,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_status  VARCHAR(20) DEFAULT 'active' CHECK(credit_status IN ('active','on_hold','blocked','vip'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_terms  INT DEFAULT 30;

CREATE TABLE IF NOT EXISTS credit_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_type    VARCHAR(30) NOT NULL CHECK(event_type IN ('invoice','payment','adjustment','limit_change','status_change')),
  amount        NUMERIC(14,2) DEFAULT 0,
  balance_after NUMERIC(14,2) DEFAULT 0,
  reference     VARCHAR(100),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_hist_cust ON credit_history(customer_id);

-- ────────────────────────────────────────────────────────────
-- 6. WAREHOUSE BIN LOCATIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(30) NOT NULL UNIQUE,
  zone        VARCHAR(50),
  aisle       VARCHAR(20),
  rack        VARCHAR(20),
  shelf       VARCHAR(20),
  bin         VARCHAR(20),
  capacity    INT DEFAULT 0,
  item_id     UUID REFERENCES inventory_items(id),
  current_qty INT DEFAULT 0,
  notes       TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wh_item ON warehouse_locations(item_id);

-- ────────────────────────────────────────────────────────────
-- 7. GOODS RECEIPT NOTES (GRN)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grn (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number    VARCHAR(30) NOT NULL UNIQUE,
  po_id         UUID REFERENCES purchase_orders(id),
  supplier_id   UUID REFERENCES suppliers(id),
  received_by   UUID REFERENCES employees(id),
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status        VARCHAR(20) DEFAULT 'draft' CHECK(status IN ('draft','verified','accepted','rejected')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grn_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id        UUID NOT NULL REFERENCES grn(id) ON DELETE CASCADE,
  item_id       UUID REFERENCES inventory_items(id),
  ordered_qty   INT DEFAULT 0,
  received_qty  INT DEFAULT 0,
  accepted_qty  INT DEFAULT 0,
  rejected_qty  INT DEFAULT 0,
  rejection_reason VARCHAR(200),
  bin_location_id UUID REFERENCES warehouse_locations(id),
  notes         TEXT
);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON grn_items(grn_id);

-- ────────────────────────────────────────────────────────────
-- 8. DELIVERY / DISPATCH TRACKING
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_number VARCHAR(30) NOT NULL UNIQUE,
  sales_order_id  UUID REFERENCES sales_orders(id),
  invoice_id      UUID REFERENCES invoices(id),
  customer_id     UUID REFERENCES customers(id),
  dispatch_date   DATE,
  expected_date   DATE,
  delivered_date  DATE,
  status          VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending','dispatched','in_transit','delivered','returned')),
  driver_name     VARCHAR(100),
  vehicle_number  VARCHAR(50),
  tracking_ref    VARCHAR(100),
  delivery_address TEXT,
  items           JSONB DEFAULT '[]',  -- [{product_name, quantity}]
  notes           TEXT,
  proof_of_delivery TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_delivery_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_delivery_cust   ON deliveries(customer_id);

-- ────────────────────────────────────────────────────────────
-- 9. SHIFT SCHEDULING
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  break_mins  INT DEFAULT 0,
  color       VARCHAR(20) DEFAULT '#3b82f6',
  is_active   BOOLEAN DEFAULT TRUE
);

INSERT INTO shift_templates (name, start_time, end_time, break_mins, color) VALUES
  ('Morning',   '06:00', '14:00', 30, '#f59e0b'),
  ('Day',       '08:00', '17:00', 60, '#3b82f6'),
  ('Afternoon', '14:00', '22:00', 30, '#8b5cf6'),
  ('Night',     '22:00', '06:00', 30, '#ef4444')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS shift_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_id      UUID NOT NULL REFERENCES shift_templates(id),
  machine_id    UUID REFERENCES machines(id),
  shift_date    DATE NOT NULL,
  status        VARCHAR(20) DEFAULT 'scheduled' CHECK(status IN ('scheduled','checked_in','completed','absent','swapped')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, shift_date)
);
CREATE INDEX IF NOT EXISTS idx_shift_assign_date ON shift_assignments(shift_date);

-- ────────────────────────────────────────────────────────────
-- 10. KPI TARGETS & APPRAISALS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kpi_definitions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  unit        VARCHAR(30) DEFAULT 'units',
  category    VARCHAR(50) DEFAULT 'production',
  is_active   BOOLEAN DEFAULT TRUE
);

INSERT INTO kpi_definitions (name, description, unit, category) VALUES
  ('Production Output',      'Number of pairs produced per month',      'pairs',   'production'),
  ('Quality Pass Rate',      'Percentage of items passing QC',          '%',       'quality'),
  ('Attendance Rate',        'Percentage of working days present',      '%',       'attendance'),
  ('Machine Uptime',         'Machine operational hours vs total',      '%',       'production'),
  ('On-Time Delivery Rate',  'Deliveries completed on or before due',   '%',       'delivery'),
  ('Waste Rate',             'Percentage of waste vs total production', '%',       'quality'),
  ('Sales Target',           'Monthly sales revenue target',            'Rs',      'sales'),
  ('Customer Complaints',    'Number of customer complaints received',  'count',   'quality')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS kpi_targets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id        UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES employees(id),
  department    VARCHAR(100),
  period_month  INT NOT NULL,
  period_year   INT NOT NULL,
  target_value  NUMERIC(14,2) NOT NULL,
  actual_value  NUMERIC(14,2) DEFAULT 0,
  achievement   NUMERIC(5,2) GENERATED ALWAYS AS (CASE WHEN target_value > 0 THEN ROUND((actual_value / target_value) * 100, 2) ELSE 0 END) STORED,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kpi_id, employee_id, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS appraisals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id   UUID REFERENCES employees(id),
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  overall_score NUMERIC(4,2) DEFAULT 0,
  scores        JSONB DEFAULT '[]',  -- [{kpi_name, target, actual, score, weight}]
  strengths     TEXT,
  improvements  TEXT,
  goals         TEXT,
  status        VARCHAR(20) DEFAULT 'draft' CHECK(status IN ('draft','submitted','reviewed','finalized')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 11. BANK RECONCILIATION
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_statements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID REFERENCES accounts(id),
  statement_date DATE NOT NULL,
  description   VARCHAR(300),
  reference     VARCHAR(100),
  debit         NUMERIC(14,2) DEFAULT 0,
  credit        NUMERIC(14,2) DEFAULT 0,
  balance       NUMERIC(14,2) DEFAULT 0,
  matched       BOOLEAN DEFAULT FALSE,
  transaction_id UUID REFERENCES transactions(id),
  import_batch  VARCHAR(50),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_stmt_acct ON bank_statements(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_stmt_match ON bank_statements(matched);

-- ────────────────────────────────────────────────────────────
-- 12. REORDER ALERTS (extend inventory_items)
-- ────────────────────────────────────────────────────────────
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS reorder_point    INT DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS reorder_quantity INT DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS lead_time_days   INT DEFAULT 7;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS preferred_supplier_id UUID REFERENCES suppliers(id);

-- ────────────────────────────────────────────────────────────
-- 13. DEMAND FORECASTING (historical sales data table)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS demand_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id),
  period_month INT NOT NULL,
  period_year  INT NOT NULL,
  quantity_sold INT DEFAULT 0,
  revenue      NUMERIC(14,2) DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, period_month, period_year)
);

-- ────────────────────────────────────────────────────────────
-- 14. REPORT BUILDER (saved reports)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL,
  config      JSONB NOT NULL DEFAULT '{}',  -- {columns, filters, sort, chartType, groupBy}
  created_by  VARCHAR(200),
  is_public   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 15. DATA IMPORT LOGS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type   VARCHAR(50) NOT NULL,
  file_name     VARCHAR(300),
  total_rows    INT DEFAULT 0,
  success_count INT DEFAULT 0,
  error_count   INT DEFAULT 0,
  errors        JSONB DEFAULT '[]',
  imported_by   VARCHAR(200),
  status        VARCHAR(20) DEFAULT 'completed',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

/**
 * Migration: Create company_tax_records table
 * Run: node database/migrate-tax-records.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'triumph',
  user: 'postgres',
  password: '123',
  port: 5432,
});

const SQL = `
-- ============================================================
-- COMPANY TAX RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS company_tax_records (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_year   VARCHAR(20) NOT NULL,            -- e.g. '2024/2025'
  period_type       VARCHAR(20) NOT NULL DEFAULT 'annual', -- annual | quarterly | monthly
  period_label      VARCHAR(50),                     -- e.g. 'Q1 2024', 'Jan 2025', 'Annual 2024/25'
  
  -- CIT fields
  annual_turnover       NUMERIC(16,2) DEFAULT 0,
  cost_of_sales         NUMERIC(16,2) DEFAULT 0,
  gross_profit          NUMERIC(16,2) DEFAULT 0,
  operating_expenses    NUMERIC(16,2) DEFAULT 0,
  other_income          NUMERIC(16,2) DEFAULT 0,
  operating_profit      NUMERIC(16,2) DEFAULT 0,
  capital_allowances    NUMERIC(16,2) DEFAULT 0,
  brought_forward_losses NUMERIC(16,2) DEFAULT 0,
  taxable_income        NUMERIC(16,2) DEFAULT 0,
  cit_rate              NUMERIC(5,4) DEFAULT 0.3000,  -- e.g. 0.30
  cit_payable           NUMERIC(16,2) DEFAULT 0,

  -- VAT fields
  vatable_sales         NUMERIC(16,2) DEFAULT 0,
  vat_on_purchases      NUMERIC(16,2) DEFAULT 0,
  zero_rated_exports    NUMERIC(16,2) DEFAULT 0,
  output_vat            NUMERIC(16,2) DEFAULT 0,
  input_vat             NUMERIC(16,2) DEFAULT 0,
  net_vat_payable       NUMERIC(16,2) DEFAULT 0,

  -- SSCL fields
  quarterly_turnover    NUMERIC(16,2) DEFAULT 0,
  sscl_applicable       BOOLEAN DEFAULT FALSE,
  sscl_payable          NUMERIC(16,2) DEFAULT 0,
  sscl_annual_estimate  NUMERIC(16,2) DEFAULT 0,

  -- WHT fields
  interest_paid         NUMERIC(16,2) DEFAULT 0,
  dividends_paid        NUMERIC(16,2) DEFAULT 0,
  rent_paid             NUMERIC(16,2) DEFAULT 0,
  wht_interest          NUMERIC(16,2) DEFAULT 0,
  wht_dividends         NUMERIC(16,2) DEFAULT 0,
  wht_rent              NUMERIC(16,2) DEFAULT 0,
  wht_total             NUMERIC(16,2) DEFAULT 0,
  payee_type            VARCHAR(20) DEFAULT 'resident', -- resident | non-resident

  -- Totals
  total_tax_burden      NUMERIC(16,2) DEFAULT 0,
  effective_rate        NUMERIC(8,4) DEFAULT 0,        -- percentage

  -- Metadata
  status                VARCHAR(20) DEFAULT 'draft',   -- draft | submitted | approved | paid
  notes                 TEXT,
  created_by            UUID,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_records_year ON company_tax_records(assessment_year);
CREATE INDEX IF NOT EXISTS idx_tax_records_status ON company_tax_records(status);
CREATE INDEX IF NOT EXISTS idx_tax_records_created ON company_tax_records(created_at);
`;

async function migrate() {
  try {
    await pool.query(SQL);
    console.log('✅ company_tax_records table created successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();

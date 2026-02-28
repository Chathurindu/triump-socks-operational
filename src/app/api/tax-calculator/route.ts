import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Company Tax Calculator API
 * GET  → tax config (meta=1) | paginated records (records=1) | single record (id=...)
 * POST → save new tax computation
 * PATCH → update record status / notes
 * DELETE → remove a record
 *
 * Based on:
 *   - Inland Revenue Act No. 24 of 2017 (as amended)
 *   - Value Added Tax Act No. 14 of 2002 (as amended 2024)
 *   - Social Security Contribution Levy Act No. 25 of 2022
 *   - Finance Act 2024/2025 amendments
 */

/* ── Sri Lankan Corporate Tax Rates (2024/25 Assessment Year) ── */
const SL_TAX_CONFIG = {
  cit: {
    standard_rate: 0.30,
    sme_rate: 0.14,
    export_rate: 0.14,
    agriculture_rate: 0.14,
    education_rate: 0.14,
    it_bpo_rate: 0.14,
    construction_rate: 0.30,
    liquor_tobacco_rate: 0.40,
    sme_turnover_threshold: 500_000_000,
    description: 'Corporate Income Tax (CIT) under Inland Revenue Act No. 24 of 2017',
    notes: [
      'Standard rate: 30% on taxable income',
      'SME concessionary rate: 14% (annual turnover ≤ Rs 500 million)',
      'Export manufacturing: 14% concessionary rate',
      'Liquor, tobacco & betting: 40% rate',
      'Tax losses can be carried forward indefinitely',
      'Advance tax (quarterly): 25% of estimated tax per quarter',
    ],
  },
  vat: {
    rate: 0.18,
    registration_threshold_annual: 60_000_000,
    registration_threshold_quarterly: 15_000_000,
    exempt_supplies: [
      'Unprocessed agricultural products',
      'Financial services (interest, life insurance)',
      'Healthcare services',
      'Educational services',
      'Residential rental',
      'Specified essential goods',
    ],
    description: 'Value Added Tax – 18% on taxable supply of goods and services',
    notes: [
      'Mandatory registration if turnover > Rs 60M/year or Rs 15M/quarter',
      'Monthly returns due by 20th of following month',
      'Input tax credit available on business purchases',
      'Zero-rated: Exports of goods and services',
    ],
  },
  sscl: {
    rate: 0.025,
    threshold_quarterly: 120_000_000,
    description: 'Social Security Contribution Levy on turnover',
    notes: [
      'Applicable only if quarterly turnover > Rs 120 million',
      'Charged on turnover (not profit)',
      'Not an input-creditable tax',
      'Returns due quarterly',
    ],
  },
  wht: {
    interest_resident: 0.05,
    interest_non_resident: 0.14,
    rent_resident: 0.10,
    dividends_resident: 0.15,
    dividends_non_resident: 0.14,
    service_fees_non_resident: 0.14,
    royalties: 0.14,
    description: 'Withholding Tax on specified payments',
    notes: [
      'WHT on interest to residents: 5% (final tax if annual interest ≤ Rs 1.5M)',
      'WHT on dividends: 15% (resident), 14% (non-resident)',
      'WHT on rent to residents: 10%',
      'Non-resident service payments: 14%',
      'Must remit within 15 days of payment',
    ],
  },
  stamp_duty: {
    lease_rate: 0.01,
    property_transfer: 0.04,
    share_transfer: 0.002,
    description: 'Stamp Duty on documents and instruments',
  },
  esc: {
    abolished: true,
    note: 'ESC was abolished effective 01 January 2024.',
  },
  compliance_dates: {
    vat_return: '20th of following month',
    cit_quarterly: '15th of 2nd month after quarter end (Aug 15, Nov 15, Feb 15, May 15)',
    cit_annual_return: 'Within 6 months from end of assessment year',
    sscl_return: 'Quarterly, within 20 days of quarter end',
    wht_remittance: '15 days from date of payment',
  },
};

/* ── Sort map for DataTable ── */
const SORT_MAP: Record<string, string> = {
  assessment_year: 'assessment_year',
  period_label: 'period_label',
  cit_payable: 'cit_payable',
  net_vat_payable: 'net_vat_payable',
  sscl_payable: 'sscl_payable',
  wht_total: 'wht_total',
  total_tax_burden: 'total_tax_burden',
  effective_rate: 'effective_rate',
  status: 'status',
  created_at: 'created_at',
};

/* ═══════════════════════════════════════════ GET ═══════════════════════════════════════════ */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  /* ── Return tax config ── */
  if (searchParams.get('meta') === '1') {
    return NextResponse.json({ taxConfig: SL_TAX_CONFIG });
  }

  /* ── Single record by id ── */
  const id = searchParams.get('id');
  if (id) {
    try {
      const res = await db.query('SELECT * FROM company_tax_records WHERE id = $1', [id]);
      if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ record: res.rows[0] });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  /* ── Paginated records list ── */
  const search   = searchParams.get('search') ?? '';
  const status   = searchParams.get('status') ?? '';
  const page     = parseInt(searchParams.get('page') ?? '1');
  const limit    = parseInt(searchParams.get('limit') ?? '15');
  const offset   = (page - 1) * limit;
  const sortKey  = searchParams.get('sortKey') ?? 'created_at';
  const sortDir  = searchParams.get('sortDir') === 'asc' ? 'ASC' : 'DESC';
  const orderCol = SORT_MAP[sortKey] ?? 'created_at';

  try {
    const statusF = status ? `AND status = '${status.replace(/'/g, "''")}'` : '';
    const whereBase = `
      FROM company_tax_records
      WHERE (assessment_year ILIKE $1 OR period_label ILIKE $1 OR notes ILIKE $1 OR status ILIKE $1)
      ${statusF}
    `;

    const [res, countRes, summaryRes] = await Promise.all([
      db.query(
        `SELECT * ${whereBase} ORDER BY ${orderCol} ${sortDir} LIMIT $2 OFFSET $3`,
        [`%${search}%`, limit, offset],
      ),
      db.query(`SELECT COUNT(*) ${whereBase}`, [`%${search}%`]),
      db.query(`
        SELECT
          COUNT(*)::int                                  AS total_records,
          COALESCE(SUM(cit_payable),0)::numeric          AS total_cit,
          COALESCE(SUM(net_vat_payable),0)::numeric       AS total_vat,
          COALESCE(SUM(sscl_payable),0)::numeric          AS total_sscl,
          COALESCE(SUM(wht_total),0)::numeric             AS total_wht,
          COALESCE(SUM(total_tax_burden),0)::numeric      AS grand_total
        FROM company_tax_records
      `),
    ]);

    return NextResponse.json({
      data: res.rows,
      total: parseInt(countRes.rows[0].count),
      summary: summaryRes.rows[0],
    });
  } catch (err: any) {
    console.error('Tax records GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch tax records' }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════ POST ═══════════════════════════════════════════ */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await db.query(
      `INSERT INTO company_tax_records (
        assessment_year, period_type, period_label,
        annual_turnover, cost_of_sales, gross_profit, operating_expenses,
        other_income, operating_profit, capital_allowances, brought_forward_losses,
        taxable_income, cit_rate, cit_payable,
        vatable_sales, vat_on_purchases, zero_rated_exports,
        output_vat, input_vat, net_vat_payable,
        quarterly_turnover, sscl_applicable, sscl_payable, sscl_annual_estimate,
        interest_paid, dividends_paid, rent_paid,
        wht_interest, wht_dividends, wht_rent, wht_total, payee_type,
        total_tax_burden, effective_rate,
        status, notes
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36
      ) RETURNING *`,
      [
        body.assessment_year,
        body.period_type ?? 'annual',
        body.period_label ?? `Annual ${body.assessment_year}`,
        body.annual_turnover ?? 0,
        body.cost_of_sales ?? 0,
        body.gross_profit ?? 0,
        body.operating_expenses ?? 0,
        body.other_income ?? 0,
        body.operating_profit ?? 0,
        body.capital_allowances ?? 0,
        body.brought_forward_losses ?? 0,
        body.taxable_income ?? 0,
        body.cit_rate ?? 0.30,
        body.cit_payable ?? 0,
        body.vatable_sales ?? 0,
        body.vat_on_purchases ?? 0,
        body.zero_rated_exports ?? 0,
        body.output_vat ?? 0,
        body.input_vat ?? 0,
        body.net_vat_payable ?? 0,
        body.quarterly_turnover ?? 0,
        body.sscl_applicable ?? false,
        body.sscl_payable ?? 0,
        body.sscl_annual_estimate ?? 0,
        body.interest_paid ?? 0,
        body.dividends_paid ?? 0,
        body.rent_paid ?? 0,
        body.wht_interest ?? 0,
        body.wht_dividends ?? 0,
        body.wht_rent ?? 0,
        body.wht_total ?? 0,
        body.payee_type ?? 'resident',
        body.total_tax_burden ?? 0,
        body.effective_rate ?? 0,
        body.status ?? 'draft',
        body.notes ?? null,
      ],
    );
    return NextResponse.json({ record: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error('Tax record POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════ PATCH ═══════════════════════════════════════════ */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    const allowed = ['status', 'notes', 'period_label'];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        sets.push(`${key} = $${idx++}`);
        vals.push(body[key]);
      }
    }
    sets.push(`updated_at = NOW()`);
    if (sets.length === 1) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    vals.push(body.id);
    const res = await db.query(
      `UPDATE company_tax_records SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals,
    );
    if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ record: res.rows[0] });
  } catch (err: any) {
    console.error('Tax record PATCH error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════ DELETE ═══════════════════════════════════════════ */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const res = await db.query('DELETE FROM company_tax_records WHERE id = $1 RETURNING id', [id]);
    if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error('Tax record DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

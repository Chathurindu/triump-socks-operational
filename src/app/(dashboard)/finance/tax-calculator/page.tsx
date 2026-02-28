'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Landmark, Calculator, DollarSign, Receipt, Percent,
  TrendingUp, TrendingDown, Building2, Shield, Scale,
  ChevronDown, ChevronRight, Download, FileText, BookOpen,
  AlertCircle, Calendar, Banknote, ArrowRight, Save,
  History, Trash2, FileSpreadsheet, CheckCircle, Clock,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import DataTable, { Column } from '@/components/ui/DataTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatCurrency } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/* ── Types ────────────────────────────────────────────────────── */
interface TaxConfig {
  cit: any;
  vat: any;
  sscl: any;
  wht: any;
  stamp_duty: any;
  esc: any;
  compliance_dates: any;
}

interface TaxRecord {
  id: string;
  assessment_year: string;
  period_type: string;
  period_label: string;
  annual_turnover: number;
  cost_of_sales: number;
  gross_profit: number;
  operating_expenses: number;
  other_income: number;
  operating_profit: number;
  capital_allowances: number;
  brought_forward_losses: number;
  taxable_income: number;
  cit_rate: number;
  cit_payable: number;
  vatable_sales: number;
  vat_on_purchases: number;
  zero_rated_exports: number;
  output_vat: number;
  input_vat: number;
  net_vat_payable: number;
  quarterly_turnover: number;
  sscl_applicable: boolean;
  sscl_payable: number;
  sscl_annual_estimate: number;
  interest_paid: number;
  dividends_paid: number;
  rent_paid: number;
  wht_interest: number;
  wht_dividends: number;
  wht_rent: number;
  wht_total: number;
  payee_type: string;
  total_tax_burden: number;
  effective_rate: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface RecordSummary {
  total_records: number;
  total_cit: number;
  total_vat: number;
  total_sscl: number;
  total_wht: number;
  grand_total: number;
}

/* ── Helpers ──────────────────────────────────────────────────── */
function n(v: string | number) { return Number(v) || 0; }
function fmtPct(v: number) { return `${(v * 100).toFixed(1)}%`; }
function fmtRs(v: number) { return `Rs ${new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`; }

const STATUS_COLORS: Record<string, 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'purple'> = {
  draft: 'gray',
  submitted: 'blue',
  approved: 'green',
  paid: 'purple',
};

/* ── CIT Rate Options ── */
const CIT_RATE_OPTIONS = [
  { value: 0.30, label: 'Standard (30%)', desc: 'General business income' },
  { value: 0.14, label: 'SME / Export / IT (14%)', desc: 'Turnover ≤ Rs 500M, export mfg, IT/BPO' },
  { value: 0.40, label: 'Liquor / Tobacco (40%)', desc: 'Liquor, tobacco, betting' },
];

export default function TaxCalculatorPage() {
  const toast = useToast();
  const [taxConfig, setTaxConfig] = useState<TaxConfig | null>(null);
  const [loading, setLoading]     = useState(true);

  /* ── Company Income Inputs ── */
  const [annualTurnover, setAnnualTurnover]   = useState('');
  const [costOfSales, setCostOfSales]         = useState('');
  const [operatingExpenses, setOperatingExpenses] = useState('');
  const [otherIncome, setOtherIncome]         = useState('');
  const [capitalAllowances, setCapitalAllowances] = useState('');
  const [broughtForwardLosses, setBroughtForwardLosses] = useState('');
  const [citRateKey, setCitRateKey]           = useState(0.30);

  /* ── VAT Inputs ── */
  const [vatableSales, setVatableSales]       = useState('');
  const [vatOnPurchases, setVatOnPurchases]   = useState('');
  const [zeroRatedExports, setZeroRatedExports] = useState('');

  /* ── SSCL Inputs ── */
  const [quarterlyTurnover, setQuarterlyTurnover] = useState('');

  /* ── WHT Inputs ── */
  const [interestPaid, setInterestPaid]       = useState('');
  const [dividendsPaid, setDividendsPaid]     = useState('');
  const [rentPaid, setRentPaid]               = useState('');
  const [isResident, setIsResident]           = useState(true);

  /* ── Period ── */
  const [assessmentYear, setAssessmentYear]   = useState('2024/2025');

  /* ── UI sections ── */
  const [showCIT, setShowCIT]     = useState(true);
  const [showVAT, setShowVAT]     = useState(true);
  const [showSSCL, setShowSSCL]   = useState(true);
  const [showWHT, setShowWHT]     = useState(true);
  const [showRef, setShowRef]     = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [generating, setGenerating] = useState(false);

  /* ── Records state ── */
  const [saving, setSaving]                       = useState(false);
  const [showHistory, setShowHistory]             = useState(false);
  const [records, setRecords]                     = useState<TaxRecord[]>([]);
  const [recordsTotal, setRecordsTotal]           = useState(0);
  const [recordsPage, setRecordsPage]             = useState(1);
  const [recordsSearch, setRecordsSearch]         = useState('');
  const [recordsSortKey, setRecordsSortKey]       = useState('created_at');
  const [recordsSortDir, setRecordsSortDir]       = useState<'asc' | 'desc'>('desc');
  const [loadingRecords, setLoadingRecords]       = useState(false);
  const [recordsSummary, setRecordsSummary]       = useState<RecordSummary | null>(null);
  const [deleteId, setDeleteId]                   = useState<string | null>(null);
  const [detailRecord, setDetailRecord]           = useState<TaxRecord | null>(null);

  /* ── Fetch config ── */
  useEffect(() => {
    fetch('/api/tax-calculator?meta=1')
      .then((r) => r.json())
      .then((j) => setTaxConfig(j.taxConfig ?? null))
      .finally(() => setLoading(false));
  }, []);

  /* ── Fetch historical records ── */
  const fetchRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const params = new URLSearchParams({
        search: recordsSearch,
        page: String(recordsPage),
        limit: '15',
        sortKey: recordsSortKey,
        sortDir: recordsSortDir,
      });
      const res = await fetch(`/api/tax-calculator?${params}`);
      const json = await res.json();
      setRecords(json.data ?? []);
      setRecordsTotal(json.total ?? 0);
      setRecordsSummary(json.summary ?? null);
    } catch {
      toast.error('Error', 'Failed to fetch tax records');
    } finally {
      setLoadingRecords(false);
    }
  }, [recordsSearch, recordsPage, recordsSortKey, recordsSortDir]);

  useEffect(() => {
    if (showHistory) fetchRecords();
  }, [showHistory, fetchRecords]);

  /* ── CIT Calculation ── */
  const citCalc = useMemo(() => {
    const turnover = n(annualTurnover);
    const cos = n(costOfSales);
    const opex = n(operatingExpenses);
    const other = n(otherIncome);
    const capAllow = n(capitalAllowances);
    const lossesB = n(broughtForwardLosses);

    const grossProfit = turnover - cos;
    const operatingProfit = grossProfit - opex + other;
    const taxableIncome = Math.max(0, operatingProfit - capAllow - lossesB);

    const citRate = citRateKey;
    const citPayable = taxableIncome * citRate;
    const quarterlyAdvance = citPayable / 4;
    const effectiveRate = turnover > 0 ? (citPayable / turnover) * 100 : 0;

    return {
      turnover, cos, grossProfit, opex, other, operatingProfit,
      capAllow, lossesB, taxableIncome,
      citRate, citPayable, quarterlyAdvance, effectiveRate,
    };
  }, [annualTurnover, costOfSales, operatingExpenses, otherIncome, capitalAllowances, broughtForwardLosses, citRateKey]);

  /* ── VAT Calculation ── */
  const vatCalc = useMemo(() => {
    if (!taxConfig) return null;
    const sales = n(vatableSales);
    const inputVAT = n(vatOnPurchases);
    const exports = n(zeroRatedExports);

    const outputVAT = sales * taxConfig.vat.rate;
    const netVAT = Math.max(0, outputVAT - inputVAT);
    const totalTaxableSales = sales + exports;
    const isRegistered = totalTaxableSales >= taxConfig.vat.registration_threshold_quarterly;

    return {
      sales, exports, totalTaxableSales,
      outputVAT, inputVAT, netVAT,
      rate: taxConfig.vat.rate,
      isRegistered,
    };
  }, [vatableSales, vatOnPurchases, zeroRatedExports, taxConfig]);

  /* ── SSCL Calculation ── */
  const ssclCalc = useMemo(() => {
    if (!taxConfig) return null;
    const qTurnover = n(quarterlyTurnover);
    const isApplicable = qTurnover > taxConfig.sscl.threshold_quarterly;
    const ssclPayable = isApplicable ? qTurnover * taxConfig.sscl.rate : 0;
    const annualEstimate = ssclPayable * 4;

    return {
      qTurnover, isApplicable, ssclPayable, annualEstimate,
      rate: taxConfig.sscl.rate,
      threshold: taxConfig.sscl.threshold_quarterly,
    };
  }, [quarterlyTurnover, taxConfig]);

  /* ── WHT Calculation ── */
  const whtCalc = useMemo(() => {
    if (!taxConfig) return null;
    const interest = n(interestPaid);
    const dividends = n(dividendsPaid);
    const rent = n(rentPaid);

    const whtInterest = interest * (isResident ? taxConfig.wht.interest_resident : taxConfig.wht.interest_non_resident);
    const whtDividends = dividends * (isResident ? taxConfig.wht.dividends_resident : taxConfig.wht.dividends_non_resident);
    const whtRent = rent * (isResident ? taxConfig.wht.rent_resident : taxConfig.wht.rent_resident);
    const totalWHT = whtInterest + whtDividends + whtRent;

    return {
      interest, dividends, rent,
      whtInterest, whtDividends, whtRent, totalWHT,
      interestRate: isResident ? taxConfig.wht.interest_resident : taxConfig.wht.interest_non_resident,
      dividendRate: isResident ? taxConfig.wht.dividends_resident : taxConfig.wht.dividends_non_resident,
      rentRate: taxConfig.wht.rent_resident,
    };
  }, [interestPaid, dividendsPaid, rentPaid, isResident, taxConfig]);

  /* ── Total Tax Burden ── */
  const totalBurden = useMemo(() => {
    const cit = citCalc.citPayable;
    const vat = vatCalc?.netVAT ?? 0;
    const sscl = (ssclCalc?.annualEstimate ?? 0);
    const wht = (whtCalc?.totalWHT ?? 0) * 12; // annualize monthly WHT
    const total = cit + vat + sscl + wht;
    const turnover = n(annualTurnover);
    const effectiveRate = turnover > 0 ? (total / turnover) * 100 : 0;
    return { cit, vat, sscl, wht, total, effectiveRate };
  }, [citCalc, vatCalc, ssclCalc, whtCalc, annualTurnover]);

  /* ── Save current computation to database ── */
  const handleSave = async () => {
    if (totalBurden.total === 0 && citCalc.turnover === 0) {
      toast.error('Nothing to save', 'Enter at least some tax computation values first.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        assessment_year: assessmentYear,
        period_type: 'annual',
        period_label: `Annual ${assessmentYear}`,
        annual_turnover: citCalc.turnover,
        cost_of_sales: citCalc.cos,
        gross_profit: citCalc.grossProfit,
        operating_expenses: citCalc.opex,
        other_income: citCalc.other,
        operating_profit: citCalc.operatingProfit,
        capital_allowances: citCalc.capAllow,
        brought_forward_losses: citCalc.lossesB,
        taxable_income: citCalc.taxableIncome,
        cit_rate: citCalc.citRate,
        cit_payable: citCalc.citPayable,
        vatable_sales: vatCalc?.sales ?? 0,
        vat_on_purchases: vatCalc?.inputVAT ?? 0,
        zero_rated_exports: vatCalc?.exports ?? 0,
        output_vat: vatCalc?.outputVAT ?? 0,
        input_vat: vatCalc?.inputVAT ?? 0,
        net_vat_payable: vatCalc?.netVAT ?? 0,
        quarterly_turnover: ssclCalc?.qTurnover ?? 0,
        sscl_applicable: ssclCalc?.isApplicable ?? false,
        sscl_payable: ssclCalc?.ssclPayable ?? 0,
        sscl_annual_estimate: ssclCalc?.annualEstimate ?? 0,
        interest_paid: whtCalc?.interest ?? 0,
        dividends_paid: whtCalc?.dividends ?? 0,
        rent_paid: whtCalc?.rent ?? 0,
        wht_interest: whtCalc?.whtInterest ?? 0,
        wht_dividends: whtCalc?.whtDividends ?? 0,
        wht_rent: whtCalc?.whtRent ?? 0,
        wht_total: whtCalc?.totalWHT ?? 0,
        payee_type: isResident ? 'resident' : 'non-resident',
        total_tax_burden: totalBurden.total,
        effective_rate: totalBurden.effectiveRate,
        status: 'draft',
      };
      const res = await fetch('/api/tax-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Saved', 'Tax computation saved to records.');
      if (showHistory) fetchRecords();
    } catch (err: any) {
      toast.error('Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete record ── */
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/tax-calculator?id=${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Deleted', 'Tax record removed.');
      setDeleteId(null);
      fetchRecords();
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  /* ── Update record status ── */
  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/tax-calculator', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success('Updated', `Status changed to ${status}.`);
      fetchRecords();
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  /* ── Export records to Excel ── */
  const exportExcel = () => {
    if (records.length === 0) {
      toast.error('No Data', 'No records to export.');
      return;
    }
    const rows = records.map((r) => ({
      'Assessment Year': r.assessment_year,
      'Period': r.period_label,
      'Annual Turnover': Number(r.annual_turnover),
      'Cost of Sales': Number(r.cost_of_sales),
      'Gross Profit': Number(r.gross_profit),
      'Operating Expenses': Number(r.operating_expenses),
      'Other Income': Number(r.other_income),
      'Taxable Income': Number(r.taxable_income),
      'CIT Rate': `${(Number(r.cit_rate) * 100).toFixed(0)}%`,
      'CIT Payable': Number(r.cit_payable),
      'Vatable Sales': Number(r.vatable_sales),
      'Output VAT': Number(r.output_vat),
      'Input VAT': Number(r.input_vat),
      'Net VAT Payable': Number(r.net_vat_payable),
      'Quarterly Turnover': Number(r.quarterly_turnover),
      'SSCL Applicable': r.sscl_applicable ? 'Yes' : 'No',
      'SSCL Payable': Number(r.sscl_payable),
      'SSCL Annual Est.': Number(r.sscl_annual_estimate),
      'Interest Paid': Number(r.interest_paid),
      'Dividends Paid': Number(r.dividends_paid),
      'Rent Paid': Number(r.rent_paid),
      'WHT Interest': Number(r.wht_interest),
      'WHT Dividends': Number(r.wht_dividends),
      'WHT Rent': Number(r.wht_rent),
      'WHT Total': Number(r.wht_total),
      'Total Tax Burden': Number(r.total_tax_burden),
      'Effective Rate %': Number(r.effective_rate).toFixed(2),
      'Status': r.status,
      'Date': new Date(r.created_at).toLocaleDateString('en-GB'),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0]).map((k) => ({ wch: Math.max(k.length + 2, 14) }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tax Records');
    XLSX.writeFile(wb, `Triumph_Tax_Records_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Excel Exported', 'Tax records downloaded as Excel.');
  };

  /* ── Export records to PDF ── */
  const exportHistoryPDF = () => {
    if (records.length === 0) {
      toast.error('No Data', 'No records to export.');
      return;
    }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const m = 10;
    let y = 12;

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pw, 30, 'F');
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 30, pw, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('TRIUMPH SOCKS', m, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Premium Quality Socks Manufacturer', m, y + 11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129);
    doc.text('HISTORICAL TAX RECORDS', pw - m, y + 5, { align: 'right' });
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pw - m, y + 11, { align: 'right' });

    y = 36;

    // Summary
    if (recordsSummary) {
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`Total Records: ${recordsSummary.total_records}   |   CIT: ${fmtRs(Number(recordsSummary.total_cit))}   |   VAT: ${fmtRs(Number(recordsSummary.total_vat))}   |   SSCL: ${fmtRs(Number(recordsSummary.total_sscl))}   |   WHT: ${fmtRs(Number(recordsSummary.total_wht))}   |   Grand Total: ${fmtRs(Number(recordsSummary.grand_total))}`, m, y);
      y += 5;
    }

    autoTable(doc, {
      startY: y,
      head: [['Year', 'Period', 'CIT', 'VAT', 'SSCL', 'WHT', 'Total Burden', 'Eff. Rate', 'Status', 'Date']],
      body: records.map((r) => [
        r.assessment_year,
        r.period_label,
        fmtRs(Number(r.cit_payable)),
        fmtRs(Number(r.net_vat_payable)),
        fmtRs(Number(r.sscl_payable)),
        fmtRs(Number(r.wht_total)),
        fmtRs(Number(r.total_tax_burden)),
        `${Number(r.effective_rate).toFixed(2)}%`,
        r.status.toUpperCase(),
        new Date(r.created_at).toLocaleDateString('en-GB'),
      ]),
      margin: { left: m, right: m },
      theme: 'plain',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7, cellPadding: 2.5 },
      bodyStyles: { fontSize: 7, textColor: [51, 65, 85], cellPadding: 2 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
    });

    // Footer
    const lastY = (doc as any).lastAutoTable.finalY + 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text('Based on Inland Revenue Act No. 24 of 2017 (as amended). Generated by Triumph ERP.', m, lastY);

    doc.save(`Triumph_Tax_Records_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('PDF Exported', 'Historical records PDF downloaded.');
  };

  /* ── DataTable columns for history ── */
  const historyColumns: Column<TaxRecord>[] = useMemo(() => [
    { key: 'assessment_year', label: 'Year', sortable: true, width: '90px' },
    { key: 'period_label', label: 'Period', sortable: true, width: '130px' },
    { key: 'cit_payable', label: 'CIT Payable', sortable: true, align: 'right' as const, render: (r) => formatCurrency(Number(r.cit_payable)) },
    { key: 'net_vat_payable', label: 'VAT Payable', sortable: true, align: 'right' as const, render: (r) => formatCurrency(Number(r.net_vat_payable)) },
    { key: 'sscl_payable', label: 'SSCL', sortable: true, align: 'right' as const, render: (r) => formatCurrency(Number(r.sscl_payable)) },
    { key: 'wht_total', label: 'WHT', sortable: true, align: 'right' as const, render: (r) => formatCurrency(Number(r.wht_total)) },
    { key: 'total_tax_burden', label: 'Total Burden', sortable: true, align: 'right' as const, render: (r) => (
      <span className="font-bold text-red-500">{formatCurrency(Number(r.total_tax_burden))}</span>
    )},
    { key: 'effective_rate', label: 'Eff. Rate', sortable: true, align: 'right' as const, render: (r) => `${Number(r.effective_rate).toFixed(2)}%` },
    { key: 'status', label: 'Status', sortable: true, width: '100px', render: (r) => (
      <select
        value={r.status}
        onChange={(e) => handleStatusUpdate(r.id, e.target.value)}
        className="text-[0.65rem] px-1.5 py-0.5 rounded border border-slate-200 dark:border-[var(--dark-border)] bg-transparent dark:text-[var(--dark-text)]"
      >
        <option value="draft">Draft</option>
        <option value="submitted">Submitted</option>
        <option value="approved">Approved</option>
        <option value="paid">Paid</option>
      </select>
    )},
    { key: 'created_at', label: 'Date', sortable: true, width: '90px', render: (r) => new Date(r.created_at).toLocaleDateString('en-GB') },
    { key: 'actions', label: '', width: '70px', render: (r) => (
      <div className="flex items-center gap-1">
        <button onClick={() => setDetailRecord(r)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-[var(--dark-surface)] text-slate-400 hover:text-blue-500 transition-colors" title="View details">
          <Eye size={13} />
        </button>
        <button onClick={() => setDeleteId(r.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
          <Trash2 size={13} />
        </button>
      </div>
    )},
  ], []);

  /* ── Generate PDF Report ── */
  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const m = 15;
      let y = 15;

      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pw, 38, 'F');
      doc.setFillColor(16, 185, 129); // emerald accent
      doc.rect(0, 38, pw, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text('TRIUMPH SOCKS', m, y + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Premium Quality Socks Manufacturer', m, y + 16);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129);
      doc.text('COMPANY TAX COMPUTATION', pw - m, y + 8, { align: 'right' });
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(`Assessment Year: ${assessmentYear}`, pw - m, y + 14, { align: 'right' });
      doc.setFontSize(7);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pw - m, y + 19, { align: 'right' });

      y = 46;

      // CIT Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129);
      doc.text('1. CORPORATE INCOME TAX', m, y);
      y += 3;

      autoTable(doc, {
        startY: y,
        head: [['Item', 'Amount (Rs)']],
        body: [
          ['Annual Turnover / Revenue', fmtRs(citCalc.turnover)],
          ['Less: Cost of Sales', `(${fmtRs(citCalc.cos)})`],
          ['Gross Profit', fmtRs(citCalc.grossProfit)],
          ['Less: Operating Expenses', `(${fmtRs(citCalc.opex)})`],
          ['Add: Other Income', fmtRs(citCalc.other)],
          ['Operating Profit', fmtRs(citCalc.operatingProfit)],
          ['Less: Capital Allowances', `(${fmtRs(citCalc.capAllow)})`],
          ['Less: Brought Forward Losses', `(${fmtRs(citCalc.lossesB)})`],
          ['Taxable Income', fmtRs(citCalc.taxableIncome)],
        ],
        foot: [[`CIT Payable @ ${fmtPct(citCalc.citRate)}`, fmtRs(citCalc.citPayable)]],
        margin: { left: m, right: m },
        theme: 'plain',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: 2.5 },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85], cellPadding: 2 },
        footStyles: { fillColor: [236, 253, 245], textColor: [5, 150, 105], fontStyle: 'bold', fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 1: { halign: 'right' } },
      });

      y = (doc as any).lastAutoTable.finalY + 6;

      // VAT Section
      if (vatCalc) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(37, 99, 235);
        doc.text('2. VALUE ADDED TAX (VAT)', m, y);
        y += 3;

        autoTable(doc, {
          startY: y,
          head: [['Item', 'Amount (Rs)']],
          body: [
            [`Output VAT (${fmtPct(vatCalc.rate)} on vatable sales)`, fmtRs(vatCalc.outputVAT)],
            ['Less: Input VAT on Purchases', `(${fmtRs(vatCalc.inputVAT)})`],
          ],
          foot: [['Net VAT Payable', fmtRs(vatCalc.netVAT)]],
          margin: { left: m, right: m },
          theme: 'plain',
          headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: 2.5 },
          bodyStyles: { fontSize: 8, textColor: [51, 65, 85], cellPadding: 2 },
          footStyles: { fillColor: [239, 246, 255], textColor: [30, 58, 138], fontStyle: 'bold', fontSize: 9, cellPadding: 3 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' } },
        });

        y = (doc as any).lastAutoTable.finalY + 6;
      }

      // SSCL Section
      if (ssclCalc) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(147, 51, 234);
        doc.text('3. SOCIAL SECURITY CONTRIBUTION LEVY (SSCL)', m, y);
        y += 3;

        autoTable(doc, {
          startY: y,
          head: [['Item', 'Amount (Rs)']],
          body: [
            ['Quarterly Turnover', fmtRs(ssclCalc.qTurnover)],
            ['Applicable', ssclCalc.isApplicable ? 'YES (> Rs 120M threshold)' : 'NO (below threshold)'],
            [`SSCL per Quarter (${fmtPct(ssclCalc.rate)})`, fmtRs(ssclCalc.ssclPayable)],
          ],
          foot: [['Estimated Annual SSCL', fmtRs(ssclCalc.annualEstimate)]],
          margin: { left: m, right: m },
          theme: 'plain',
          headStyles: { fillColor: [88, 28, 135], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: 2.5 },
          bodyStyles: { fontSize: 8, textColor: [51, 65, 85], cellPadding: 2 },
          footStyles: { fillColor: [250, 245, 255], textColor: [88, 28, 135], fontStyle: 'bold', fontSize: 9, cellPadding: 3 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' } },
        });

        y = (doc as any).lastAutoTable.finalY + 6;
      }

      // WHT Section
      if (whtCalc && whtCalc.totalWHT > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(234, 88, 12);
        doc.text('4. WITHHOLDING TAX (WHT)', m, y);
        y += 3;

        const whtRows: string[][] = [];
        if (whtCalc.interest > 0) whtRows.push([`Interest Paid @ ${fmtPct(whtCalc.interestRate)}`, fmtRs(whtCalc.whtInterest)]);
        if (whtCalc.dividends > 0) whtRows.push([`Dividends Paid @ ${fmtPct(whtCalc.dividendRate)}`, fmtRs(whtCalc.whtDividends)]);
        if (whtCalc.rent > 0) whtRows.push([`Rent Paid @ ${fmtPct(whtCalc.rentRate)}`, fmtRs(whtCalc.whtRent)]);

        autoTable(doc, {
          startY: y,
          head: [['Description', 'WHT Amount (Rs)']],
          body: whtRows,
          foot: [['Total WHT (Monthly)', fmtRs(whtCalc.totalWHT)]],
          margin: { left: m, right: m },
          theme: 'plain',
          headStyles: { fillColor: [154, 52, 18], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: 2.5 },
          bodyStyles: { fontSize: 8, textColor: [51, 65, 85], cellPadding: 2 },
          footStyles: { fillColor: [255, 247, 237], textColor: [154, 52, 18], fontStyle: 'bold', fontSize: 9, cellPadding: 3 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' } },
        });

        y = (doc as any).lastAutoTable.finalY + 6;
      }

      // Total Tax Summary box
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(m, y, pw - m * 2, 20, 2, 2, 'F');
      doc.setFillColor(16, 185, 129);
      doc.rect(m, y, pw - m * 2, 1.5, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('TOTAL ESTIMATED TAX BURDEN', m + 6, y + 8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text(fmtRs(totalBurden.total), pw - m - 6, y + 13, { align: 'right' });

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Effective Rate: ${totalBurden.effectiveRate.toFixed(2)}% on turnover`, m + 6, y + 15);

      y += 28;

      // Footer
      doc.setDrawColor(203, 213, 225);
      doc.line(m, y, pw - m, y);
      y += 5;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Based on Inland Revenue Act No. 24 of 2017 (as amended), VAT Act No. 14 of 2002, SSCL Act No. 25 of 2022. Assessment Year ' + assessmentYear + '.', m, y);
      doc.text('This is a computer-generated estimate for planning purposes. Consult your tax advisor for filing. Generated by Triumph ERP.', m, y + 3.5);

      doc.save(`Triumph_Tax_Computation_${assessmentYear.replace('/', '-')}.pdf`);
      toast.success('Report Generated', 'Tax computation PDF downloaded.');
    } catch (err: any) {
      toast.error('PDF Error', err.message);
    } finally {
      setGenerating(false);
    }
  };

  /* ── Reset ── */
  const handleReset = () => {
    setAnnualTurnover(''); setCostOfSales(''); setOperatingExpenses('');
    setOtherIncome(''); setCapitalAllowances(''); setBroughtForwardLosses('');
    setCitRateKey(0.30);
    setVatableSales(''); setVatOnPurchases(''); setZeroRatedExports('');
    setQuarterlyTurnover('');
    setInterestPaid(''); setDividendsPaid(''); setRentPaid('');
    setIsResident(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-md">
            <Landmark size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">Company Tax Calculator</h1>
            <p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">Sri Lankan corporate tax computation · {assessmentYear}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={assessmentYear} onChange={(e) => setAssessmentYear(e.target.value)} className="triumph-input !py-1.5 !text-xs !w-28">
            <option value="2024/2025">2024/2025</option>
            <option value="2025/2026">2025/2026</option>
          </select>
          <Button variant="secondary" size="sm" onClick={handleReset} icon={<Calculator size={13} />}>Reset</Button>
          <Button size="sm" onClick={handleSave} loading={saving} icon={<Save size={13} />}>Save Record</Button>
          <Button variant="secondary" size="sm" onClick={generatePDF} loading={generating} icon={<Download size={13} />}>Export PDF</Button>
          <Button variant={showHistory ? 'primary' : 'secondary'} size="sm" onClick={() => setShowHistory(!showHistory)} icon={<History size={13} />}>
            {showHistory ? 'Hide History' : 'View History'}
          </Button>
        </div>
      </div>

      {/* ── KPI Summary ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'CIT Payable', val: formatCurrency(totalBurden.cit), icon: Building2, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
          { label: 'VAT Payable', val: formatCurrency(totalBurden.vat), icon: Receipt, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
          { label: 'SSCL (Annual)', val: formatCurrency(totalBurden.sscl), icon: Shield, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
          { label: 'WHT (Annual est.)', val: formatCurrency(totalBurden.wht), icon: Banknote, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
          { label: 'Total Tax Burden', val: formatCurrency(totalBurden.total), icon: Scale, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`triumph-card p-3 anim-fade-up anim-d${Math.min(i + 1, 6)}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.bg} mb-2`}>
                <Icon size={15} className={k.color} />
              </div>
              <p className="text-base font-black text-slate-800 dark:text-white tabular-nums">{k.val}</p>
              <p className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">{k.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ─── LEFT: Input Panels ─── */}
        <div className="lg:col-span-2 space-y-4">
          {/* ── Corporate Income Tax (CIT) ── */}
          <div className="triumph-card overflow-hidden">
            <button onClick={() => setShowCIT(!showCIT)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors">
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-emerald-500" />
                <span className="text-xs font-semibold text-slate-800 dark:text-white uppercase tracking-wide">Corporate Income Tax (CIT)</span>
                <Badge label={`${(citRateKey * 100).toFixed(0)}%`} color="green" />
              </div>
              {showCIT ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
            {showCIT && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="triumph-label">Annual Turnover / Revenue *</label>
                    <input type="number" className="triumph-input" value={annualTurnover} onChange={(e) => setAnnualTurnover(e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="triumph-label">Cost of Sales</label>
                    <input type="number" className="triumph-input" value={costOfSales} onChange={(e) => setCostOfSales(e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="triumph-label">Operating Expenses</label>
                    <input type="number" className="triumph-input" value={operatingExpenses} onChange={(e) => setOperatingExpenses(e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="triumph-label">Other Income</label>
                    <input type="number" className="triumph-input" value={otherIncome} onChange={(e) => setOtherIncome(e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="triumph-label">Capital Allowances</label>
                    <input type="number" className="triumph-input" value={capitalAllowances} onChange={(e) => setCapitalAllowances(e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="triumph-label">B/F Losses</label>
                    <input type="number" className="triumph-input" value={broughtForwardLosses} onChange={(e) => setBroughtForwardLosses(e.target.value)} placeholder="0.00" />
                  </div>
                </div>

                <div>
                  <label className="triumph-label">Applicable CIT Rate</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                    {CIT_RATE_OPTIONS.map((opt) => (
                      <button key={opt.value} onClick={() => setCitRateKey(opt.value)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          citRateKey === opt.value
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 ring-1 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-[var(--dark-border)] hover:border-slate-300'
                        }`}
                      >
                        <p className="text-xs font-semibold text-slate-800 dark:text-white">{opt.label}</p>
                        <p className="text-[0.6rem] text-slate-400 dark:text-[var(--dark-text-3)]">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* CIT Quick Result */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {[
                    { l: 'Gross Profit', v: citCalc.grossProfit, c: 'text-slate-700 dark:text-[var(--dark-text)]' },
                    { l: 'Taxable Income', v: citCalc.taxableIncome, c: 'text-slate-700 dark:text-[var(--dark-text)]' },
                    { l: 'CIT Payable', v: citCalc.citPayable, c: 'text-emerald-600 dark:text-emerald-400 font-bold' },
                    { l: 'Quarterly Advance', v: citCalc.quarterlyAdvance, c: 'text-blue-600 dark:text-blue-400' },
                  ].map((r) => (
                    <div key={r.l} className="bg-slate-50 dark:bg-[var(--dark-surface)] rounded-lg p-2.5">
                      <p className="text-[0.55rem] uppercase text-slate-400">{r.l}</p>
                      <p className={`text-sm font-semibold tabular-nums ${r.c}`}>{formatCurrency(r.v)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── VAT ── */}
          <div className="triumph-card overflow-hidden">
            <button onClick={() => setShowVAT(!showVAT)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors">
              <div className="flex items-center gap-2">
                <Receipt size={14} className="text-blue-500" />
                <span className="text-xs font-semibold text-slate-800 dark:text-white uppercase tracking-wide">Value Added Tax (VAT)</span>
                <Badge label="18%" color="blue" />
              </div>
              {showVAT ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
            {showVAT && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="triumph-label">Vatable Sales (Monthly)</label>
                    <input type="number" className="triumph-input" value={vatableSales} onChange={(e) => setVatableSales(e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="triumph-label">Input VAT on Purchases</label>
                    <input type="number" className="triumph-input" value={vatOnPurchases} onChange={(e) => setVatOnPurchases(e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="triumph-label">Zero-Rated Exports</label>
                    <input type="number" className="triumph-input" value={zeroRatedExports} onChange={(e) => setZeroRatedExports(e.target.value)} placeholder="0.00" />
                  </div>
                </div>

                {vatCalc && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { l: 'Output VAT', v: vatCalc.outputVAT, c: 'text-slate-700 dark:text-[var(--dark-text)]' },
                      { l: 'Input VAT', v: vatCalc.inputVAT, c: 'text-green-600 dark:text-green-400' },
                      { l: 'Net VAT Payable', v: vatCalc.netVAT, c: 'text-blue-600 dark:text-blue-400 font-bold' },
                      { l: 'Registration', v: 0, badge: true, status: vatCalc.isRegistered },
                    ].map((r) => (
                      <div key={r.l} className="bg-slate-50 dark:bg-[var(--dark-surface)] rounded-lg p-2.5">
                        <p className="text-[0.55rem] uppercase text-slate-400">{r.l}</p>
                        {'badge' in r ? (
                          <Badge label={r.status ? 'Mandatory' : 'Not Required'} color={r.status ? 'red' : 'green'} />
                        ) : (
                          <p className={`text-sm font-semibold tabular-nums ${r.c}`}>{formatCurrency(r.v)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── SSCL ── */}
          <div className="triumph-card overflow-hidden">
            <button onClick={() => setShowSSCL(!showSSCL)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-purple-500" />
                <span className="text-xs font-semibold text-slate-800 dark:text-white uppercase tracking-wide">Social Security Contribution Levy</span>
                <Badge label="2.5%" color="purple" />
              </div>
              {showSSCL ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
            {showSSCL && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="triumph-label">Quarterly Turnover</label>
                    <input type="number" className="triumph-input" value={quarterlyTurnover} onChange={(e) => setQuarterlyTurnover(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="flex items-end pb-1">
                    {ssclCalc && (
                      <div className="flex items-center gap-2">
                        {ssclCalc.isApplicable ? (
                          <Badge label="Applicable — Above Rs 120M threshold" color="red" />
                        ) : (
                          <Badge label="Not Applicable — Below Rs 120M threshold" color="green" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {ssclCalc && ssclCalc.isApplicable && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 dark:bg-[var(--dark-surface)] rounded-lg p-2.5">
                      <p className="text-[0.55rem] uppercase text-slate-400">SSCL per Quarter</p>
                      <p className="text-sm font-semibold tabular-nums text-purple-600 dark:text-purple-400">{formatCurrency(ssclCalc.ssclPayable)}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-[var(--dark-surface)] rounded-lg p-2.5">
                      <p className="text-[0.55rem] uppercase text-slate-400">Estimated Annual</p>
                      <p className="text-sm font-bold tabular-nums text-purple-600 dark:text-purple-400">{formatCurrency(ssclCalc.annualEstimate)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── WHT ── */}
          <div className="triumph-card overflow-hidden">
            <button onClick={() => setShowWHT(!showWHT)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors">
              <div className="flex items-center gap-2">
                <Banknote size={14} className="text-orange-500" />
                <span className="text-xs font-semibold text-slate-800 dark:text-white uppercase tracking-wide">Withholding Tax (WHT)</span>
              </div>
              {showWHT ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
            {showWHT && (
              <div className="px-4 pb-4 space-y-3">
                <div className="flex items-center gap-3 mb-1">
                  <label className="triumph-label !mb-0">Payee Type:</label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="resident" checked={isResident} onChange={() => setIsResident(true)} className="accent-emerald-500" />
                    <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">Resident</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="resident" checked={!isResident} onChange={() => setIsResident(false)} className="accent-emerald-500" />
                    <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">Non-Resident</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="triumph-label">Interest Paid (Monthly)</label>
                    <input type="number" className="triumph-input" value={interestPaid} onChange={(e) => setInterestPaid(e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="triumph-label">Dividends Paid</label>
                    <input type="number" className="triumph-input" value={dividendsPaid} onChange={(e) => setDividendsPaid(e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="triumph-label">Rent Paid</label>
                    <input type="number" className="triumph-input" value={rentPaid} onChange={(e) => setRentPaid(e.target.value)} placeholder="0.00" />
                  </div>
                </div>

                {whtCalc && whtCalc.totalWHT > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      ...(whtCalc.whtInterest > 0 ? [{ l: `Interest WHT (${fmtPct(whtCalc.interestRate)})`, v: whtCalc.whtInterest }] : []),
                      ...(whtCalc.whtDividends > 0 ? [{ l: `Dividend WHT (${fmtPct(whtCalc.dividendRate)})`, v: whtCalc.whtDividends }] : []),
                      ...(whtCalc.whtRent > 0 ? [{ l: `Rent WHT (${fmtPct(whtCalc.rentRate)})`, v: whtCalc.whtRent }] : []),
                      { l: 'Total WHT (Monthly)', v: whtCalc.totalWHT },
                    ].map((r) => (
                      <div key={r.l} className="bg-slate-50 dark:bg-[var(--dark-surface)] rounded-lg p-2.5">
                        <p className="text-[0.55rem] uppercase text-slate-400">{r.l}</p>
                        <p className="text-sm font-semibold tabular-nums text-orange-600 dark:text-orange-400">{formatCurrency(r.v)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT: Results Panel ─── */}
        <div className="space-y-4">
          {/* Total Tax Burden Card */}
          <div className="triumph-card overflow-hidden">
            <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-emerald-900 p-5 text-white text-center">
              <p className="text-[0.6rem] uppercase tracking-widest opacity-80 mb-1">Total Estimated Tax Burden</p>
              <p className="text-3xl font-black tabular-nums text-emerald-300">{formatCurrency(totalBurden.total)}</p>
              <p className="text-[0.6rem] opacity-70 mt-1">Assessment Year {assessmentYear}</p>
            </div>
            <div className="p-3 space-y-1.5">
              {[
                { label: 'Corporate Income Tax', val: totalBurden.cit, color: 'text-emerald-500' },
                { label: 'VAT (Net Payable)', val: totalBurden.vat, color: 'text-blue-500' },
                { label: 'SSCL (Annual est.)', val: totalBurden.sscl, color: 'text-purple-500' },
                { label: 'WHT (Annual est.)', val: totalBurden.wht, color: 'text-orange-500' },
              ].map((r) => (
                <div key={r.label} className="flex justify-between items-center py-1 px-1">
                  <span className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">{r.label}</span>
                  <span className={`text-sm font-semibold tabular-nums ${r.color}`}>{formatCurrency(r.val)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-1.5 px-1 border-t border-slate-100 dark:border-[var(--dark-border)]">
                <span className="text-[0.65rem] font-bold text-slate-700 dark:text-white">Effective Tax Rate</span>
                <span className="text-sm font-bold tabular-nums text-red-500">{totalBurden.effectiveRate.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* CIT Computation Summary */}
          <div className="triumph-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={13} className="text-emerald-500" />
              <span className="text-xs font-semibold text-slate-800 dark:text-white">CIT Computation</span>
            </div>
            <div className="space-y-0.5">
              {[
                { l: 'Revenue', v: citCalc.turnover, c: '' },
                { l: '(-) Cost of Sales', v: citCalc.cos, c: 'text-red-500' },
                { l: 'Gross Profit', v: citCalc.grossProfit, c: 'font-bold' },
                { l: '(-) Operating Expenses', v: citCalc.opex, c: 'text-red-500' },
                { l: '(+) Other Income', v: citCalc.other, c: 'text-green-500' },
                { l: '(-) Capital Allowances', v: citCalc.capAllow, c: 'text-red-500' },
                { l: '(-) B/F Losses', v: citCalc.lossesB, c: 'text-red-500' },
                { l: 'Taxable Income', v: citCalc.taxableIncome, c: 'font-bold border-t border-slate-200 dark:border-[var(--dark-border)] pt-1' },
              ].map((r) => (
                <div key={r.l} className={`flex justify-between py-0.5 ${r.c.includes('border') ? r.c : ''}`}>
                  <span className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)]">{r.l}</span>
                  <span className={`text-[0.65rem] font-medium tabular-nums ${r.c.replace(/border[^\s]*/g, '').replace('pt-1', '') || 'text-slate-700 dark:text-[var(--dark-text)]'}`}>{formatCurrency(r.v)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-[var(--dark-border)]">
                <span className="text-[0.65rem] font-bold text-emerald-600">CIT @ {(citRateKey * 100).toFixed(0)}%</span>
                <span className="text-sm font-bold tabular-nums text-emerald-600">{formatCurrency(citCalc.citPayable)}</span>
              </div>
            </div>
          </div>

          {/* Compliance Calendar */}
          <div className="triumph-card overflow-hidden">
            <button onClick={() => setShowDates(!showDates)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors">
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-teal-500" />
                <span className="text-xs font-semibold text-slate-800 dark:text-white">Compliance Calendar</span>
              </div>
              {showDates ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
            {showDates && taxConfig && (
              <div className="px-4 pb-4 space-y-1">
                {Object.entries(taxConfig.compliance_dates).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-start py-1">
                    <span className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)] capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-[0.6rem] font-medium text-slate-700 dark:text-[var(--dark-text)] text-right max-w-[55%]">{String(val)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick rates reference */}
          <div className="triumph-card overflow-hidden">
            <button onClick={() => setShowRef(!showRef)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors">
              <div className="flex items-center gap-2">
                <BookOpen size={13} className="text-indigo-500" />
                <span className="text-xs font-semibold text-slate-800 dark:text-white">Tax Rates Quick Reference</span>
              </div>
              {showRef ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
            {showRef && taxConfig && (
              <div className="px-4 pb-4 space-y-3">
                {/* CIT Rates */}
                <div>
                  <p className="text-[0.55rem] uppercase font-bold text-emerald-500 mb-1">CIT Rates</p>
                  {[
                    { l: 'Standard Rate', v: '30%' },
                    { l: 'SME / Export / IT', v: '14%' },
                    { l: 'Liquor / Tobacco / Betting', v: '40%' },
                  ].map((r) => (
                    <div key={r.l} className="flex justify-between py-0.5">
                      <span className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)]">{r.l}</span>
                      <Badge label={r.v} color="green" />
                    </div>
                  ))}
                </div>
                {/* WHT Rates */}
                <div>
                  <p className="text-[0.55rem] uppercase font-bold text-orange-500 mb-1">WHT Rates</p>
                  {taxConfig.wht.notes.map((note: string, i: number) => (
                    <p key={i} className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)] py-0.5 flex items-start gap-1">
                      <ArrowRight size={8} className="text-orange-400 mt-0.5 flex-shrink-0" />
                      {note}
                    </p>
                  ))}
                </div>
                {/* VAT Exemptions */}
                <div>
                  <p className="text-[0.55rem] uppercase font-bold text-blue-500 mb-1">VAT Exempt Supplies</p>
                  {taxConfig.vat.exempt_supplies.map((s: string, i: number) => (
                    <p key={i} className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)] py-0.5 flex items-start gap-1">
                      <ArrowRight size={8} className="text-blue-400 mt-0.5 flex-shrink-0" />
                      {s}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Legal Disclaimer */}
          <div className="triumph-card p-3 border-l-4 border-l-amber-500">
            <div className="flex items-start gap-2">
              <AlertCircle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)] leading-relaxed">
                Based on Inland Revenue Act No. 24 of 2017, VAT Act No. 14 of 2002, SSCL Act No. 25 of 2022 (as amended).
                This is an <strong>estimation tool</strong> — consult your tax advisor for official filings and latest amendments.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════ HISTORICAL RECORDS ═══════════════════════════ */}
      {showHistory && (
        <div className="space-y-3 anim-fade-up anim-d2">
          {/* Summary KPIs */}
          {recordsSummary && Number(recordsSummary.total_records) > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Records', val: recordsSummary.total_records, fmt: false, color: 'text-slate-700 dark:text-white', bg: 'bg-slate-100 dark:bg-slate-800' },
                { label: 'Total CIT', val: recordsSummary.total_cit, fmt: true, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { label: 'Total VAT', val: recordsSummary.total_vat, fmt: true, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { label: 'Total SSCL', val: recordsSummary.total_sscl, fmt: true, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                { label: 'Total WHT', val: recordsSummary.total_wht, fmt: true, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                { label: 'Grand Total', val: recordsSummary.grand_total, fmt: true, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
              ].map((k) => (
                <div key={k.label} className={`rounded-xl p-3 ${k.bg}`}>
                  <p className="text-[0.55rem] uppercase tracking-wide text-slate-400">{k.label}</p>
                  <p className={`text-sm font-bold tabular-nums ${k.color}`}>
                    {k.fmt ? formatCurrency(Number(k.val)) : k.val}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Records DataTable */}
          <div className="triumph-card overflow-hidden">
            <DataTable
              columns={historyColumns}
              data={records}
              total={recordsTotal}
              page={recordsPage}
              pageSize={15}
              loading={loadingRecords}
              search={recordsSearch}
              onSearchChange={(v) => { setRecordsSearch(v); setRecordsPage(1); }}
              onPageChange={setRecordsPage}
              searchPlaceholder="Search tax records..."
              toolbar={
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={exportHistoryPDF} icon={<FileText size={13} />}>Export PDF</Button>
                  <Button variant="secondary" size="sm" onClick={exportExcel} icon={<FileSpreadsheet size={13} />}>Export Excel</Button>
                </div>
              }
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════ DETAIL MODAL ═══════════════════════════ */}
      {detailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDetailRecord(null)}>
          <div className="bg-white dark:bg-[var(--dark-card)] rounded-2xl shadow-2xl w-[700px] max-h-[85vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-slate-800 to-emerald-900 p-5 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-sm">Tax Record Details</h2>
                  <p className="text-emerald-300 text-xs mt-0.5">{detailRecord.period_label} · {detailRecord.assessment_year}</p>
                </div>
                <Badge label={detailRecord.status.toUpperCase()} color={STATUS_COLORS[detailRecord.status] ?? 'gray'} />
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* CIT Breakdown */}
              <div>
                <h3 className="text-xs font-bold text-emerald-600 uppercase mb-2 flex items-center gap-1.5"><Building2 size={12} /> Corporate Income Tax</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {[
                    ['Annual Turnover', detailRecord.annual_turnover],
                    ['Cost of Sales', detailRecord.cost_of_sales],
                    ['Gross Profit', detailRecord.gross_profit],
                    ['Operating Expenses', detailRecord.operating_expenses],
                    ['Other Income', detailRecord.other_income],
                    ['Operating Profit', detailRecord.operating_profit],
                    ['Capital Allowances', detailRecord.capital_allowances],
                    ['B/F Losses', detailRecord.brought_forward_losses],
                    ['Taxable Income', detailRecord.taxable_income],
                    ['CIT Rate', `${(Number(detailRecord.cit_rate) * 100).toFixed(0)}%`],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="flex justify-between py-0.5">
                      <span className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">{l}</span>
                      <span className="text-[0.65rem] font-medium text-slate-700 dark:text-[var(--dark-text)] tabular-nums">{typeof v === 'number' ? formatCurrency(Number(v)) : v}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-1 pt-1 border-t border-slate-100 dark:border-[var(--dark-border)]">
                  <span className="text-xs font-bold text-emerald-600">CIT Payable</span>
                  <span className="text-xs font-bold text-emerald-600 tabular-nums">{formatCurrency(Number(detailRecord.cit_payable))}</span>
                </div>
              </div>

              {/* VAT Breakdown */}
              <div>
                <h3 className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center gap-1.5"><Receipt size={12} /> Value Added Tax</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {[
                    ['Vatable Sales', detailRecord.vatable_sales],
                    ['VAT on Purchases', detailRecord.vat_on_purchases],
                    ['Zero-Rated Exports', detailRecord.zero_rated_exports],
                    ['Output VAT', detailRecord.output_vat],
                    ['Input VAT', detailRecord.input_vat],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="flex justify-between py-0.5">
                      <span className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">{l}</span>
                      <span className="text-[0.65rem] font-medium text-slate-700 dark:text-[var(--dark-text)] tabular-nums">{formatCurrency(Number(v))}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-1 pt-1 border-t border-slate-100 dark:border-[var(--dark-border)]">
                  <span className="text-xs font-bold text-blue-600">Net VAT Payable</span>
                  <span className="text-xs font-bold text-blue-600 tabular-nums">{formatCurrency(Number(detailRecord.net_vat_payable))}</span>
                </div>
              </div>

              {/* SSCL Breakdown */}
              <div>
                <h3 className="text-xs font-bold text-purple-600 uppercase mb-2 flex items-center gap-1.5"><Shield size={12} /> SSCL</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {[
                    ['Quarterly Turnover', detailRecord.quarterly_turnover],
                    ['Applicable', detailRecord.sscl_applicable ? 'Yes' : 'No'],
                    ['SSCL per Quarter', detailRecord.sscl_payable],
                    ['Annual Estimate', detailRecord.sscl_annual_estimate],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="flex justify-between py-0.5">
                      <span className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">{l}</span>
                      <span className="text-[0.65rem] font-medium text-slate-700 dark:text-[var(--dark-text)] tabular-nums">{typeof v === 'number' ? formatCurrency(Number(v)) : v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* WHT Breakdown */}
              <div>
                <h3 className="text-xs font-bold text-orange-600 uppercase mb-2 flex items-center gap-1.5"><Banknote size={12} /> Withholding Tax</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {[
                    ['Interest Paid', detailRecord.interest_paid],
                    ['Dividends Paid', detailRecord.dividends_paid],
                    ['Rent Paid', detailRecord.rent_paid],
                    ['WHT on Interest', detailRecord.wht_interest],
                    ['WHT on Dividends', detailRecord.wht_dividends],
                    ['WHT on Rent', detailRecord.wht_rent],
                    ['Payee Type', detailRecord.payee_type],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="flex justify-between py-0.5">
                      <span className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">{l}</span>
                      <span className="text-[0.65rem] font-medium text-slate-700 dark:text-[var(--dark-text)] tabular-nums">{typeof v === 'number' ? formatCurrency(Number(v)) : v}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-1 pt-1 border-t border-slate-100 dark:border-[var(--dark-border)]">
                  <span className="text-xs font-bold text-orange-600">Total WHT</span>
                  <span className="text-xs font-bold text-orange-600 tabular-nums">{formatCurrency(Number(detailRecord.wht_total))}</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="bg-gradient-to-r from-slate-800 to-emerald-900 rounded-xl p-4 text-center">
                <p className="text-[0.6rem] uppercase tracking-widest text-slate-300 mb-1">Total Tax Burden</p>
                <p className="text-2xl font-black text-emerald-300 tabular-nums">{formatCurrency(Number(detailRecord.total_tax_burden))}</p>
                <p className="text-[0.6rem] text-slate-400 mt-0.5">Effective Rate: {Number(detailRecord.effective_rate).toFixed(2)}%</p>
              </div>

              {detailRecord.notes && (
                <div className="bg-slate-50 dark:bg-[var(--dark-surface)] rounded-lg p-3">
                  <p className="text-[0.55rem] uppercase font-bold text-slate-400 mb-1">Notes</p>
                  <p className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">{detailRecord.notes}</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setDetailRecord(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════ DELETE CONFIRM ═══════════════════════════ */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Tax Record"
        message="Are you sure you want to delete this tax record? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}

'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Calculator, User, DollarSign, Building2, Wallet,
  TrendingUp, TrendingDown, Receipt, PiggyBank, Shield,
  Clock, Award, FileText, Save, RotateCcw, ChevronDown, ChevronRight,
  Download, Landmark, Scale, Percent, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ── Types ────────────────────────────────────────────────────── */
interface Bracket { upTo: number; rate: number }
interface Statutory {
  epf_employee_rate: number;
  epf_employer_rate: number;
  etf_rate: number;
  paye_brackets: Bracket[];
}
interface YTD {
  ytd_basic: number; ytd_allowances: number; ytd_deductions: number;
  ytd_overtime: number; ytd_bonus: number; ytd_tax: number;
  ytd_net: number; months_paid: number;
}

/* ── Sri Lankan Tax Reference (Inland Revenue Act 2017, as amended) ── */
const SL_TAX_REF = {
  incomeTax: {
    title: 'Income Tax / APIT (2024/25)',
    description: 'Advanced Personal Income Tax deducted monthly by employer on behalf of employee.',
    brackets: [
      { range: 'First Rs 1,200,000', rate: '0%', note: 'Tax-free threshold' },
      { range: 'Next Rs 500,000', rate: '6%', note: 'Rs 1.2M – 1.7M' },
      { range: 'Next Rs 500,000', rate: '12%', note: 'Rs 1.7M – 2.2M' },
      { range: 'Next Rs 500,000', rate: '18%', note: 'Rs 2.2M – 2.7M' },
      { range: 'Next Rs 500,000', rate: '24%', note: 'Rs 2.7M – 3.2M' },
      { range: 'Next Rs 500,000', rate: '30%', note: 'Rs 3.2M – 3.7M' },
      { range: 'Balance', rate: '36%', note: 'Above Rs 3.7M' },
    ],
  },
  vat: {
    title: 'Value Added Tax (VAT)',
    rate: '18%',
    threshold: 'Mandatory registration if quarterly turnover exceeds Rs 15 million or annual turnover exceeds Rs 60 million.',
    note: 'Applicable on supply of goods and services. Not deducted from employee salary but relevant for business operations.',
  },
  epfEtf: {
    title: 'EPF & ETF Contributions',
    items: [
      { label: 'EPF – Employee', rate: '8%', note: 'Deducted from employee\'s gross salary (on basic)' },
      { label: 'EPF – Employer', rate: '12%', note: 'Paid by employer (on basic salary)' },
      { label: 'ETF – Employer', rate: '3%', note: 'Paid by employer to Employees\' Trust Fund (on basic)' },
    ],
  },
  sscl: {
    title: 'Social Security Contribution Levy (SSCL)',
    rate: '2.5%',
    threshold: 'Applicable on turnover exceeding Rs 120 million per quarter.',
    note: 'Paid by businesses, not deducted from employee salary.',
  },
};

/* ── Helpers ──────────────────────────────────────────────────── */
function calcPAYE(annualTaxable: number, brackets: Bracket[]): number {
  let tax = 0, prev = 0;
  for (const b of brackets) {
    if (annualTaxable <= prev) break;
    const slab = Math.min(annualTaxable, b.upTo) - prev;
    if (slab > 0) tax += slab * b.rate;
    prev = b.upTo;
  }
  return tax;
}

function fmtRs(v: number) { return `Rs ${new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`; }
function pct(v: number) { return `${(v * 100).toFixed(0)}%`; }
function n(v: string | number) { return Number(v) || 0; }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function PayrollCalculatorPage() {
  const toast = useToast();

  /* ── Meta ── */
  const [employees, setEmployees]     = useState<any[]>([]);
  const [statutory, setStatutory]     = useState<Statutory | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  /* ── Selected employee ── */
  const [selectedId, setSelectedId]       = useState('');
  const [empDetail, setEmpDetail]         = useState<any>(null);
  const [ytd, setYtd]                     = useState<YTD | null>(null);
  const [leaveDays, setLeaveDays]         = useState(0);
  const [loadingEmp, setLoadingEmp]       = useState(false);

  /* ── Salary components ── */
  const [basicSalary, setBasicSalary]       = useState('');
  const [housingAllowance, setHousingAllowance] = useState('');
  const [transportAllowance, setTransportAllowance] = useState('');
  const [mealAllowance, setMealAllowance]       = useState('');
  const [medicalAllowance, setMedicalAllowance] = useState('');
  const [otherAllowance, setOtherAllowance]     = useState('');

  /* ── Overtime ── */
  const [otHours, setOtHours]       = useState('');
  const [otRateMultiplier, setOtRateMultiplier] = useState('1.5');

  /* ── Bonuses ── */
  const [bonus, setBonus]             = useState('');
  const [commission, setCommission]   = useState('');

  /* ── Additional deductions ── */
  const [loanDeduction, setLoanDeduction] = useState('');
  const [otherDeduction, setOtherDeduction] = useState('');

  /* ── Period ── */
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear]   = useState(new Date().getFullYear());

  /* ── UI state ── */
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [showYtd, setShowYtd]             = useState(false);
  const [showTaxRef, setShowTaxRef]       = useState(false);
  const [saving, setSaving]               = useState(false);
  const [generating, setGenerating]       = useState(false);

  /* ── Fetch meta ── */
  useEffect(() => {
    fetch('/api/payroll-calculator?meta=1')
      .then((r) => r.json())
      .then((j) => { setEmployees(j.employees ?? []); setStatutory(j.statutory ?? null); })
      .finally(() => setLoadingMeta(false));
  }, []);

  /* ── Fetch employee detail + YTD ── */
  const fetchEmployee = useCallback(async (id: string) => {
    if (!id) { setEmpDetail(null); setYtd(null); return; }
    setLoadingEmp(true);
    try {
      const res = await fetch(`/api/payroll-calculator?employee_id=${id}`);
      const json = await res.json();
      setEmpDetail(json.employee ?? null);
      setYtd(json.ytd ?? null);
      setLeaveDays(json.leave_days_used ?? 0);
      if (json.employee?.salary) setBasicSalary(String(json.employee.salary));
    } catch { /* ignore */ }
    finally { setLoadingEmp(false); }
  }, []);

  useEffect(() => { if (selectedId) fetchEmployee(selectedId); }, [selectedId, fetchEmployee]);

  /* ── Calculations ── */
  const calc = useMemo(() => {
    if (!statutory) return null;
    const basic = n(basicSalary);
    const housing = n(housingAllowance);
    const transport = n(transportAllowance);
    const meal = n(mealAllowance);
    const medical = n(medicalAllowance);
    const otherAllow = n(otherAllowance);
    const totalAllowances = housing + transport + meal + medical + otherAllow;

    // Overtime
    const hourlyRate = basic / 240; // 240 working hours per month
    const otPay = n(otHours) * hourlyRate * n(otRateMultiplier);

    // Bonus/Commission
    const totalBonus = n(bonus) + n(commission);

    // Gross
    const grossSalary = basic + totalAllowances + otPay + totalBonus;

    // Statutory deductions
    const epfEmployee = basic * statutory.epf_employee_rate;
    const epfEmployer = basic * statutory.epf_employer_rate;
    const etfEmployer = basic * statutory.etf_rate;

    // PAYE on annual taxable income (annualized gross minus EPF employee)
    const monthlyTaxable = grossSalary - epfEmployee;
    const annualTaxable = monthlyTaxable * 12;
    const annualPAYE = calcPAYE(annualTaxable, statutory.paye_brackets);
    const monthlyPAYE = annualPAYE / 12;

    // Additional deductions
    const loan = n(loanDeduction);
    const otherDed = n(otherDeduction);

    const totalDeductions = epfEmployee + monthlyPAYE + loan + otherDed;
    const netSalary = grossSalary - totalDeductions;

    // Cost to company
    const ctc = grossSalary + epfEmployer + etfEmployer;

    return {
      basic, totalAllowances, housing, transport, meal, medical, otherAllow,
      otPay, hourlyRate, totalBonus,
      grossSalary,
      epfEmployee, epfEmployer, etfEmployer,
      monthlyPAYE, annualPAYE, annualTaxable,
      loan, otherDed, totalDeductions,
      netSalary, ctc,
    };
  }, [basicSalary, housingAllowance, transportAllowance, mealAllowance, medicalAllowance, otherAllowance, otHours, otRateMultiplier, bonus, commission, loanDeduction, otherDeduction, statutory]);

  /* ── Reset ── */
  const handleReset = () => {
    setBasicSalary(empDetail?.salary ? String(empDetail.salary) : '');
    setHousingAllowance(''); setTransportAllowance(''); setMealAllowance('');
    setMedicalAllowance(''); setOtherAllowance('');
    setOtHours(''); setOtRateMultiplier('1.5');
    setBonus(''); setCommission('');
    setLoanDeduction(''); setOtherDeduction('');
  };

  /* ── Save to payroll ── */
  const handleSave = async () => {
    if (!selectedId || !calc) { toast.warning('Select Employee', 'Please select an employee first.'); return; }
    if (calc.basic <= 0) { toast.warning('Validation', 'Basic salary must be > 0.'); return; }
    setSaving(true);
    try {
      const body = {
        employee_id: selectedId, period_month: month, period_year: year,
        basic_salary: calc.basic,
        allowances: calc.totalAllowances + calc.otPay + calc.totalBonus,
        deductions: calc.totalDeductions - calc.epfEmployee - calc.monthlyPAYE, // custom deductions only
        overtime_pay: calc.otPay,
        bonus: calc.totalBonus,
        tax: calc.monthlyPAYE + calc.epfEmployee,
        payment_status: 'pending',
        notes: `Calculator: EPF(E)=${formatCurrency(calc.epfEmployee)}, PAYE=${formatCurrency(calc.monthlyPAYE)}, Loan=${formatCurrency(calc.loan)}`,
      };
      const res = await fetch('/api/payroll-calculator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Saved to Payroll', `Payroll record created for ${MONTHS[month - 1]} ${year}.`);
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  /* ── Generate PDF Payslip ── */
  const generatePayslipPDF = async () => {
    if (!calc || !empDetail) { toast.warning('Missing Data', 'Select an employee and ensure salary data is provided.'); return; }
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 15;

      // ── Company Letterhead ──
      // Navy header band
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 38, 'F');
      // Accent stripe
      doc.setFillColor(6, 182, 212); // cyan-500
      doc.rect(0, 38, pageWidth, 2, 'F');

      // Company name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text('TRIUMPH SOCKS', margin, y + 10);

      // Company tagline
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Premium Quality Socks Manufacturer', margin, y + 16);
      doc.text('info@triumphsocks.com', margin, y + 20);

      // Payslip title on right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(6, 182, 212); // cyan
      doc.text('PAYSLIP', pageWidth - margin, y + 8, { align: 'right' });
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(`${MONTHS[month - 1]} ${year}`, pageWidth - margin, y + 14, { align: 'right' });
      doc.setFontSize(7);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, y + 19, { align: 'right' });

      y = 46;

      // ── Employee Details Section ──
      doc.setFillColor(241, 245, 249); // slate-100
      doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('EMPLOYEE DETAILS', margin + 4, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      const empRows = [
        ['Employee:', empDetail.full_name, 'Emp Code:', empDetail.emp_code || '—'],
        ['Department:', empDetail.department_name || '—', 'Position:', empDetail.position || '—'],
      ];
      const colX = [margin + 4, margin + 30, pageWidth / 2 + 4, pageWidth / 2 + 30];
      empRows.forEach((row, ri) => {
        const rowY = y + 10 + ri * 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(row[0], colX[0], rowY);
        doc.text(row[2], colX[2], rowY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(row[1], colX[1], rowY);
        doc.text(row[3], colX[3], rowY);
      });

      y += 28;

      // ── Earnings Table ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(6, 182, 212);
      doc.text('EARNINGS', margin, y);
      y += 2;

      const earningsRows: string[][] = [
        ['Basic Salary', fmtRs(calc.basic)],
      ];
      if (calc.housing > 0) earningsRows.push(['Housing Allowance', fmtRs(calc.housing)]);
      if (calc.transport > 0) earningsRows.push(['Transport Allowance', fmtRs(calc.transport)]);
      if (calc.meal > 0) earningsRows.push(['Meal Allowance', fmtRs(calc.meal)]);
      if (calc.medical > 0) earningsRows.push(['Medical Allowance', fmtRs(calc.medical)]);
      if (calc.otherAllow > 0) earningsRows.push(['Other Allowances', fmtRs(calc.otherAllow)]);
      if (calc.otPay > 0) earningsRows.push(['Overtime Pay', fmtRs(calc.otPay)]);
      if (calc.totalBonus > 0) earningsRows.push(['Bonus / Commission', fmtRs(calc.totalBonus)]);

      autoTable(doc, {
        startY: y,
        head: [['Description', 'Amount (Rs)']],
        body: earningsRows,
        foot: [['Gross Salary', fmtRs(calc.grossSalary)]],
        margin: { left: margin, right: margin },
        theme: 'plain',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85], cellPadding: 2.5 },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 1: { halign: 'right' } },
      });

      y = (doc as any).lastAutoTable.finalY + 6;

      // ── Deductions Table ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(239, 68, 68); // red-500
      doc.text('DEDUCTIONS', margin, y);
      y += 2;

      const deductionRows: string[][] = [
        [`EPF Employee (${pct(statutory!.epf_employee_rate)})`, fmtRs(calc.epfEmployee)],
        ['PAYE / APIT Tax (Monthly)', fmtRs(calc.monthlyPAYE)],
      ];
      if (calc.loan > 0) deductionRows.push(['Loan Repayment', fmtRs(calc.loan)]);
      if (calc.otherDed > 0) deductionRows.push(['Other Deductions', fmtRs(calc.otherDed)]);

      autoTable(doc, {
        startY: y,
        head: [['Description', 'Amount (Rs)']],
        body: deductionRows,
        foot: [['Total Deductions', fmtRs(calc.totalDeductions)]],
        margin: { left: margin, right: margin },
        theme: 'plain',
        headStyles: { fillColor: [127, 29, 29], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85], cellPadding: 2.5 },
        footStyles: { fillColor: [254, 242, 242], textColor: [127, 29, 29], fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [255, 247, 247] },
        columnStyles: { 1: { halign: 'right' } },
      });

      y = (doc as any).lastAutoTable.finalY + 6;

      // ── Employer Contributions ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(37, 99, 235); // blue-600
      doc.text('EMPLOYER CONTRIBUTIONS', margin, y);
      y += 2;

      autoTable(doc, {
        startY: y,
        head: [['Description', 'Amount (Rs)']],
        body: [
          [`EPF Employer (${pct(statutory!.epf_employer_rate)})`, fmtRs(calc.epfEmployer)],
          [`ETF (${pct(statutory!.etf_rate)})`, fmtRs(calc.etfEmployer)],
        ],
        foot: [['Total Employer Cost', fmtRs(calc.epfEmployer + calc.etfEmployer)]],
        margin: { left: margin, right: margin },
        theme: 'plain',
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85], cellPadding: 2.5 },
        footStyles: { fillColor: [239, 246, 255], textColor: [30, 58, 138], fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 255] },
        columnStyles: { 1: { halign: 'right' } },
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      // ── NET SALARY Hero Box ──
      doc.setFillColor(6, 182, 212); // cyan-500
      doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, 'F');
      // Dark overlay
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(margin + 0.5, y + 0.5, pageWidth - margin * 2 - 1, 17, 2, 2, 'F');
      // Accent top stripe
      doc.setFillColor(6, 182, 212);
      doc.rect(margin, y, pageWidth - margin * 2, 1.5, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('NET TAKE-HOME PAY', margin + 6, y + 7);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(6, 182, 212);
      doc.text(fmtRs(calc.netSalary), pageWidth - margin - 6, y + 12, { align: 'right' });

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Cost to Company: ${fmtRs(calc.ctc)}`, margin + 6, y + 14);

      y += 26;

      // ── Footer ──
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('This is a computer-generated payslip. Calculations are based on Sri Lankan tax regulations (Inland Revenue Act 2017, as amended).', margin, y);
      doc.text('EPF/ETF contributions as per Employees\' Provident Fund Act No. 15 of 1958 and Employees\' Trust Fund Act No. 46 of 1980.', margin, y + 4);

      y += 14;

      // Signature lines
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, y, margin + 50, y);
      doc.line(pageWidth - margin - 50, y, pageWidth - margin, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Employee Signature', margin, y + 4);
      doc.text('Authorized Signature', pageWidth - margin - 50, y + 4);

      // ── Save PDF ──
      const empName = (empDetail.full_name || 'Employee').replace(/\s+/g, '_');
      doc.save(`Payslip_${empName}_${MONTHS[month - 1]}_${year}.pdf`);
      toast.success('Payslip Generated', `PDF payslip downloaded for ${empDetail.full_name}.`);
    } catch (err: any) {
      toast.error('PDF Error', err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loadingMeta) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-cyan-600 flex items-center justify-center shadow-md">
            <Calculator size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">Payroll Calculator</h1>
            <p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">Enterprise payroll computation · Sri Lankan tax compliance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(+e.target.value)} className="triumph-input !py-1.5 !text-xs !w-28">
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(+e.target.value)} className="triumph-input !py-1.5 !text-xs !w-20">
            {[year-1, year, year+1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ─── LEFT: Input Panel ─── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Employee Selection */}
          <div className="triumph-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <User size={14} className="text-cyan-500" />
              <h2 className="text-xs font-semibold text-slate-800 dark:text-white uppercase tracking-wide">Select Employee</h2>
            </div>
            <select className="triumph-input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">— Choose an employee —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.emp_code} — {e.full_name}{e.department_name ? ` (${e.department_name})` : ''} — {formatCurrency(e.salary)}/mo</option>
              ))}
            </select>
            {empDetail && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Department', value: empDetail.department_name ?? '—', icon: Building2 },
                  { label: 'Base Salary', value: formatCurrency(empDetail.salary), icon: Wallet },
                  { label: 'Leave Used', value: `${leaveDays} days`, icon: Clock },
                  { label: 'Months Paid', value: ytd?.months_paid ?? 0, icon: Receipt },
                ].map((d) => { const I = d.icon; return (
                  <div key={d.label} className="bg-slate-50 dark:bg-[var(--dark-surface)] rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 mb-0.5"><I size={11} className="text-slate-400" /><span className="text-[0.6rem] text-slate-400 uppercase">{d.label}</span></div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-[var(--dark-text)]">{d.value}</p>
                  </div>
                ); })}
              </div>
            )}
          </div>

          {/* Salary Components */}
          <div className="triumph-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={14} className="text-green-500" />
              <h2 className="text-xs font-semibold text-slate-800 dark:text-white uppercase tracking-wide">Salary Components</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="triumph-label">Basic Salary *</label>
                <input type="number" className="triumph-input" value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="triumph-label">Housing Allowance</label>
                <input type="number" className="triumph-input" value={housingAllowance} onChange={(e) => setHousingAllowance(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="triumph-label">Transport Allowance</label>
                <input type="number" className="triumph-input" value={transportAllowance} onChange={(e) => setTransportAllowance(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="triumph-label">Meal Allowance</label>
                <input type="number" className="triumph-input" value={mealAllowance} onChange={(e) => setMealAllowance(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="triumph-label">Medical Allowance</label>
                <input type="number" className="triumph-input" value={medicalAllowance} onChange={(e) => setMedicalAllowance(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="triumph-label">Other Allowances</label>
                <input type="number" className="triumph-input" value={otherAllowance} onChange={(e) => setOtherAllowance(e.target.value)} placeholder="0.00" />
              </div>
            </div>
          </div>

          {/* Overtime & Bonuses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="triumph-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-blue-500" />
                <h2 className="text-xs font-semibold text-slate-800 dark:text-white uppercase tracking-wide">Overtime</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="triumph-label">OT Hours</label>
                  <input type="number" className="triumph-input" value={otHours} onChange={(e) => setOtHours(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="triumph-label">Rate Multiplier</label>
                  <select className="triumph-input" value={otRateMultiplier} onChange={(e) => setOtRateMultiplier(e.target.value)}>
                    <option value="1.5">1.5x (Normal)</option>
                    <option value="2.0">2.0x (Weekend)</option>
                    <option value="2.5">2.5x (Holiday)</option>
                    <option value="3.0">3.0x (Special)</option>
                  </select>
                </div>
              </div>
              {calc && n(otHours) > 0 && (
                <p className="text-[0.65rem] text-slate-400 mt-2">Hourly rate: {formatCurrency(calc.hourlyRate)} × {otHours}h × {otRateMultiplier} = <span className="font-semibold text-blue-500">{formatCurrency(calc.otPay)}</span></p>
              )}
            </div>
            <div className="triumph-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Award size={14} className="text-purple-500" />
                <h2 className="text-xs font-semibold text-slate-800 dark:text-white uppercase tracking-wide">Bonuses</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="triumph-label">Bonus</label>
                  <input type="number" className="triumph-input" value={bonus} onChange={(e) => setBonus(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <label className="triumph-label">Commission</label>
                  <input type="number" className="triumph-input" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="0.00" />
                </div>
              </div>
            </div>
          </div>

          {/* Additional Deductions */}
          <div className="triumph-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={14} className="text-red-500" />
              <h2 className="text-xs font-semibold text-slate-800 dark:text-white uppercase tracking-wide">Additional Deductions</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="triumph-label">Loan Repayment</label>
                <input type="number" className="triumph-input" value={loanDeduction} onChange={(e) => setLoanDeduction(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="triumph-label">Other Deductions</label>
                <input type="number" className="triumph-input" value={otherDeduction} onChange={(e) => setOtherDeduction(e.target.value)} placeholder="0.00" />
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Results Panel ─── */}
        <div className="space-y-4">
          {/* Net Salary Card */}
          <div className="triumph-card overflow-hidden">
            <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-cyan-900 p-5 text-white text-center">
              <p className="text-[0.6rem] uppercase tracking-widest opacity-80 mb-1">Net Take-Home Pay</p>
              <p className="text-3xl font-black tabular-nums text-cyan-300">{calc ? formatCurrency(calc.netSalary) : '—'}</p>
              <p className="text-[0.6rem] opacity-70 mt-1">{MONTHS[month - 1]} {year}</p>
            </div>
            <div className="p-3 space-y-1.5">
              {calc && [
                { label: 'Gross Salary',       val: calc.grossSalary,      color: 'text-slate-700 dark:text-[var(--dark-text)]' },
                { label: 'Total Deductions',   val: -calc.totalDeductions, color: 'text-red-500' },
                { label: 'Cost to Company',    val: calc.ctc,              color: 'text-blue-500' },
              ].map((r) => (
                <div key={r.label} className="flex justify-between items-center py-1 px-1">
                  <span className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">{r.label}</span>
                  <span className={`text-sm font-semibold tabular-nums ${r.color}`}>{formatCurrency(r.val)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="triumph-card overflow-hidden">
            <button onClick={() => setShowBreakdown(!showBreakdown)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors">
              <div className="flex items-center gap-2">
                <FileText size={13} className="text-cyan-500" />
                <span className="text-xs font-semibold text-slate-800 dark:text-white">Detailed Breakdown</span>
              </div>
              {showBreakdown ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
            {showBreakdown && calc && (
              <div className="px-4 pb-4 space-y-3">
                {/* Earnings */}
                <div>
                  <p className="text-[0.55rem] uppercase font-bold text-green-500 mb-1">Earnings</p>
                  {[
                    { l: 'Basic Salary', v: calc.basic },
                    ...(calc.housing > 0 ? [{ l: 'Housing Allowance', v: calc.housing }] : []),
                    ...(calc.transport > 0 ? [{ l: 'Transport Allowance', v: calc.transport }] : []),
                    ...(calc.meal > 0 ? [{ l: 'Meal Allowance', v: calc.meal }] : []),
                    ...(calc.medical > 0 ? [{ l: 'Medical Allowance', v: calc.medical }] : []),
                    ...(calc.otherAllow > 0 ? [{ l: 'Other Allowances', v: calc.otherAllow }] : []),
                    ...(calc.otPay > 0 ? [{ l: 'Overtime Pay', v: calc.otPay }] : []),
                    ...(calc.totalBonus > 0 ? [{ l: 'Bonus / Commission', v: calc.totalBonus }] : []),
                  ].map((r) => (
                    <div key={r.l} className="flex justify-between py-0.5">
                      <span className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">{r.l}</span>
                      <span className="text-[0.65rem] font-medium tabular-nums text-slate-700 dark:text-[var(--dark-text)]">{formatCurrency(r.v)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-[var(--dark-border)]">
                    <span className="text-[0.65rem] font-bold text-slate-700 dark:text-white">Gross Salary</span>
                    <span className="text-[0.65rem] font-bold text-green-600 tabular-nums">{formatCurrency(calc.grossSalary)}</span>
                  </div>
                </div>
                {/* Deductions */}
                <div>
                  <p className="text-[0.55rem] uppercase font-bold text-red-500 mb-1">Deductions</p>
                  {[
                    { l: `EPF Employee (${pct(statutory!.epf_employee_rate)})`, v: calc.epfEmployee },
                    { l: 'PAYE Tax (Monthly)', v: calc.monthlyPAYE },
                    ...(calc.loan > 0 ? [{ l: 'Loan Repayment', v: calc.loan }] : []),
                    ...(calc.otherDed > 0 ? [{ l: 'Other Deductions', v: calc.otherDed }] : []),
                  ].map((r) => (
                    <div key={r.l} className="flex justify-between py-0.5">
                      <span className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">{r.l}</span>
                      <span className="text-[0.65rem] font-medium tabular-nums text-red-500">-{formatCurrency(r.v)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-[var(--dark-border)]">
                    <span className="text-[0.65rem] font-bold text-slate-700 dark:text-white">Total Deductions</span>
                    <span className="text-[0.65rem] font-bold text-red-500 tabular-nums">-{formatCurrency(calc.totalDeductions)}</span>
                  </div>
                </div>
                {/* Employer contributions */}
                <div>
                  <p className="text-[0.55rem] uppercase font-bold text-blue-500 mb-1">Employer Contributions</p>
                  {[
                    { l: `EPF Employer (${pct(statutory!.epf_employer_rate)})`, v: calc.epfEmployer },
                    { l: `ETF (${pct(statutory!.etf_rate)})`, v: calc.etfEmployer },
                  ].map((r) => (
                    <div key={r.l} className="flex justify-between py-0.5">
                      <span className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">{r.l}</span>
                      <span className="text-[0.65rem] font-medium tabular-nums text-blue-500">{formatCurrency(r.v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Statutory Info */}
          {statutory && (
            <div className="triumph-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={13} className="text-cyan-500" />
                <span className="text-xs font-semibold text-slate-800 dark:text-white">PAYE Tax Brackets (Annual)</span>
              </div>
              <div className="space-y-0.5">
                {statutory.paye_brackets.map((b, i) => {
                  const prev = i > 0 ? statutory.paye_brackets[i-1].upTo : 0;
                  const rangeLabel = b.upTo === Infinity ? `Above ${formatCurrency(prev)}` : `${formatCurrency(prev)} – ${formatCurrency(b.upTo)}`;
                  return (
                    <div key={i} className="flex justify-between py-0.5">
                      <span className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)]">{rangeLabel}</span>
                      <Badge label={pct(b.rate)} color={b.rate === 0 ? 'green' : b.rate <= 0.12 ? 'blue' : b.rate <= 0.24 ? 'amber' : 'red'} />
                    </div>
                  );
                })}
              </div>
              {calc && (
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-[var(--dark-border)]">
                  <div className="flex justify-between">
                    <span className="text-[0.6rem] text-slate-500">Annual Taxable Income</span>
                    <span className="text-[0.65rem] font-semibold tabular-nums text-slate-700 dark:text-[var(--dark-text)]">{formatCurrency(calc.annualTaxable)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[0.6rem] text-slate-500">Annual PAYE Tax</span>
                    <span className="text-[0.65rem] font-semibold tabular-nums text-red-500">{formatCurrency(calc.annualPAYE)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* YTD Summary */}
          {ytd && (
            <div className="triumph-card overflow-hidden">
              <button onClick={() => setShowYtd(!showYtd)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors">
                <div className="flex items-center gap-2">
                  <PiggyBank size={13} className="text-emerald-500" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-white">Year-to-Date ({year})</span>
                </div>
                {showYtd ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
              </button>
              {showYtd && (
                <div className="px-4 pb-4 space-y-1">
                  {[
                    { l: 'YTD Basic', v: formatCurrency(ytd.ytd_basic) },
                    { l: 'YTD Allowances', v: formatCurrency(ytd.ytd_allowances) },
                    { l: 'YTD Overtime', v: formatCurrency(ytd.ytd_overtime) },
                    { l: 'YTD Bonus', v: formatCurrency(ytd.ytd_bonus) },
                    { l: 'YTD Deductions', v: formatCurrency(ytd.ytd_deductions), cls: 'text-red-500' },
                    { l: 'YTD Tax', v: formatCurrency(ytd.ytd_tax), cls: 'text-red-500' },
                    { l: 'YTD Net', v: formatCurrency(ytd.ytd_net), cls: 'text-green-600 font-bold' },
                  ].map((r) => (
                    <div key={r.l} className="flex justify-between py-0.5">
                      <span className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">{r.l}</span>
                      <span className={`text-[0.65rem] font-medium tabular-nums ${r.cls ?? 'text-slate-700 dark:text-[var(--dark-text)]'}`}>{r.v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleReset} icon={<RotateCcw size={13} />} className="flex-1">Reset</Button>
            <Button size="sm" onClick={handleSave} loading={saving} icon={<Save size={13} />} className="flex-1">Save</Button>
          </div>
          <Button variant="secondary" size="sm" onClick={generatePayslipPDF} loading={generating} icon={<Download size={13} />} className="w-full">Download Payslip (PDF)</Button>
        </div>
      </div>

      {/* ─── Sri Lankan Tax Reference ─── */}
      <div className="triumph-card overflow-hidden">
        <button onClick={() => setShowTaxRef(!showTaxRef)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors">
          <div className="flex items-center gap-2">
            <Landmark size={14} className="text-cyan-500" />
            <span className="text-sm font-semibold text-slate-800 dark:text-white">Sri Lankan Tax Reference</span>
            <Badge label="2024/25" color="blue" />
          </div>
          {showTaxRef ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
        </button>
        {showTaxRef && (
          <div className="px-5 pb-5 space-y-5">
            {/* Income Tax / APIT */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Scale size={13} className="text-cyan-600" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-white">{SL_TAX_REF.incomeTax.title}</h3>
              </div>
              <p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mb-2">{SL_TAX_REF.incomeTax.description}</p>
              <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-[var(--dark-border)]">
                <table className="w-full text-[0.65rem]">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="px-3 py-1.5 text-left font-semibold">Income Slab</th>
                      <th className="px-3 py-1.5 text-center font-semibold">Rate</th>
                      <th className="px-3 py-1.5 text-right font-semibold">Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SL_TAX_REF.incomeTax.brackets.map((b, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-slate-50 dark:bg-[var(--dark-surface)]' : 'bg-white dark:bg-transparent'}>
                        <td className="px-3 py-1.5 text-slate-600 dark:text-[var(--dark-text-2)]">{b.range}</td>
                        <td className="px-3 py-1.5 text-center">
                          <Badge label={b.rate} color={b.rate === '0%' ? 'green' : Number(b.rate.replace('%','')) <= 12 ? 'blue' : Number(b.rate.replace('%','')) <= 24 ? 'amber' : 'red'} />
                        </td>
                        <td className="px-3 py-1.5 text-right text-slate-500 dark:text-[var(--dark-text-3)]">{b.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* EPF & ETF */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <PiggyBank size={13} className="text-emerald-500" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-white">{SL_TAX_REF.epfEtf.title}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SL_TAX_REF.epfEtf.items.map((item) => (
                  <div key={item.label} className="bg-slate-50 dark:bg-[var(--dark-surface)] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[0.65rem] font-semibold text-slate-700 dark:text-white">{item.label}</span>
                      <Badge label={item.rate} color="green" />
                    </div>
                    <p className="text-[0.6rem] text-slate-400 dark:text-[var(--dark-text-3)]">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* VAT */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Percent size={13} className="text-amber-500" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-white">{SL_TAX_REF.vat.title}</h3>
                <Badge label={SL_TAX_REF.vat.rate} color="amber" />
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800/40">
                <p className="text-[0.65rem] text-slate-600 dark:text-[var(--dark-text-2)] mb-1"><strong>Threshold:</strong> {SL_TAX_REF.vat.threshold}</p>
                <p className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)] italic">{SL_TAX_REF.vat.note}</p>
              </div>
            </div>

            {/* SSCL */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={13} className="text-violet-500" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-white">{SL_TAX_REF.sscl.title}</h3>
                <Badge label={SL_TAX_REF.sscl.rate} color="purple" />
              </div>
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3 border border-violet-200 dark:border-violet-800/40">
                <p className="text-[0.65rem] text-slate-600 dark:text-[var(--dark-text-2)] mb-1"><strong>Threshold:</strong> {SL_TAX_REF.sscl.threshold}</p>
                <p className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)] italic">{SL_TAX_REF.sscl.note}</p>
              </div>
            </div>

            {/* Legal footnote */}
            <div className="pt-2 border-t border-slate-200 dark:border-[var(--dark-border)]">
              <p className="text-[0.55rem] text-slate-400 dark:text-[var(--dark-text-3)] italic leading-relaxed">
                Based on Inland Revenue Act No. 24 of 2017 (as amended), Employees&apos; Provident Fund Act No. 15 of 1958,
                Employees&apos; Trust Fund Act No. 46 of 1980, Value Added Tax Act No. 14 of 2002 (as amended), and
                Social Security Contribution Levy Act No. 25 of 2022. Rates are for the tax year 2024/2025.
                Always verify with your tax advisor for the latest amendments.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

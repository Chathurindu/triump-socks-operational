'use client';
import { useEffect, useState } from 'react';
import { Plus, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency, getMonthName } from '@/lib/utils';

export default function PayrollPage() {
  const now = new Date();
  const [month, setMonth]     = useState(String(now.getMonth() + 1));
  const [year, setYear]       = useState(String(now.getFullYear()));
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/payroll?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((d) => { setRecords(d.data ?? []); setSummary(d.summary); setLoading(false); });
  }, [month, year]);

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Net Payable', value: formatCurrency(summary.total_net ?? 0), big: true },
            { label: 'Employees',         value: summary.total_employees ?? 0 },
            { label: 'Paid',              value: summary.paid_count ?? 0 },
            { label: 'Pending',           value: summary.pending_count ?? 0 },
          ].map((s) => (
            <div key={s.label} className="triumph-card p-3">
              <p className={`font-bold text-gray-900 dark:text-gray-100 ${s.big ? 'text-lg' : 'text-xl'}`}>{s.value}</p>
              <p className="text-[0.65rem] text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <Card noPad>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="triumph-input w-30">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i+1} value={String(i+1)}>{getMonthName(i+1)}</option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(e.target.value)} className="triumph-input w-20">
              {[2024, 2025, 2026].map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
          <Button size="sm" icon={<Plus size={13} />}>Process Payroll</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full" /></div>
        ) : (
          <table className="w-full triumph-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Employee</th>
                <th>Department</th>
                <th className="text-right">Basic</th>
                <th className="text-right">Allowances</th>
                <th className="text-right">Deductions</th>
                <th className="text-right">OT Pay</th>
                <th className="text-right">Bonus</th>
                <th className="text-right">Tax</th>
                <th className="text-right">Net Salary</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={11} className="text-center text-xs text-gray-400 py-8">No payroll records for {getMonthName(parseInt(month))} {year}.</td></tr>
              ) : records.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-[0.7rem] text-amber-700 dark:text-amber-400">{r.emp_code}</td>
                  <td className="text-sm font-medium">{r.full_name}</td>
                  <td className="text-xs text-gray-500">{r.department_name ?? '—'}</td>
                  <td className="text-right text-xs tabular-nums">{formatCurrency(r.basic_salary)}</td>
                  <td className="text-right text-xs tabular-nums text-green-600 dark:text-green-400">{formatCurrency(r.allowances)}</td>
                  <td className="text-right text-xs tabular-nums text-red-600 dark:text-red-400">{formatCurrency(r.deductions)}</td>
                  <td className="text-right text-xs tabular-nums">{formatCurrency(r.overtime_pay)}</td>
                  <td className="text-right text-xs tabular-nums">{formatCurrency(r.bonus)}</td>
                  <td className="text-right text-xs tabular-nums text-red-600 dark:text-red-400">{formatCurrency(r.tax)}</td>
                  <td className="text-right font-semibold text-sm tabular-nums">{formatCurrency(r.net_salary)}</td>
                  <td><Badge status={r.payment_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

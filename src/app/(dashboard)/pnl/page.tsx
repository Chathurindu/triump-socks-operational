'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, ChevronLeft, ChevronRight,
  Loader2, Percent,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatCurrency, getMonthName } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';

export default function PnLPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ year: String(year) });
      if (month) qs.set('month', String(month));
      const res = await fetch(`/api/pnl?${qs}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── helpers ─────────────────────────────────────────────── */
  const revenueMap = new Map<number, number>();
  const expenseMap = new Map<number, number>();

  if (data) {
    for (const r of data.revenue?.monthly ?? []) revenueMap.set(r.month, r.amount);
    for (const r of data.expenses?.monthly ?? []) expenseMap.set(r.month, r.amount);
  }

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const rev = revenueMap.get(m) ?? 0;
    const exp = expenseMap.get(m) ?? 0;
    return {
      month: getMonthName(m).slice(0, 3),
      Revenue: rev,
      Expenses: exp,
      'Net Profit': rev - exp,
    };
  });

  const monthlyDetail = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const rev = revenueMap.get(m) ?? 0;
    const exp = expenseMap.get(m) ?? 0;
    const net = rev - exp;
    const margin = rev > 0 ? (net / rev) * 100 : 0;
    return { month: m, name: getMonthName(m), revenue: rev, expenses: exp, net, margin };
  });

  const totalRevenue  = data?.summary?.revenue ?? 0;
  const totalExpenses = data?.summary?.expenses ?? 0;
  const netProfit     = data?.summary?.net_profit ?? 0;
  const marginPercent = data?.summary?.margin_percent ?? 0;

  const bySource   = data?.revenue?.bySource ?? [];
  const byCategory = data?.expenses?.byCategory ?? [];

  /* ── render ──────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 anim-fade-up anim-d1">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Profit &amp; Loss Statement</h1>

        <div className="flex items-center gap-3">
          {/* Month filter */}
          <select
            value={month ?? ''}
            onChange={e => setMonth(e.target.value ? Number(e.target.value) : null)}
            className="triumph-input text-xs h-8 w-[130px]"
          >
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
            ))}
          </select>

          {/* Year selector */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setYear(y => y - 1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-slate-700 dark:text-white w-12 text-center tabular-nums">{year}</span>
            <button
              onClick={() => setYear(y => y + 1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-amber-500" />
        </div>
      ) : !data ? (
        <div className="triumph-card p-8 text-center text-sm text-slate-500">Failed to load P&amp;L data.</div>
      ) : (
        <>
          {/* ── Summary Cards ──────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Revenue */}
            <div className="triumph-card p-4 flex items-center gap-3 anim-fade-up anim-d1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-green-100 dark:bg-green-900/30">
                <TrendingUp size={18} className="text-green-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{formatCurrency(totalRevenue)}</p>
                <p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">Total Revenue</p>
              </div>
            </div>

            {/* Expenses */}
            <div className="triumph-card p-4 flex items-center gap-3 anim-fade-up anim-d2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-100 dark:bg-red-900/30">
                <TrendingDown size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{formatCurrency(totalExpenses)}</p>
                <p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">Total Expenses</p>
              </div>
            </div>

            {/* Net Profit / Loss */}
            <div className="triumph-card p-4 flex items-center gap-3 anim-fade-up anim-d3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                netProfit >= 0
                  ? 'bg-amber-100 dark:bg-amber-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <DollarSign size={18} className={netProfit >= 0 ? 'text-amber-500' : 'text-red-500'} />
              </div>
              <div>
                <p className={`text-lg font-bold leading-none ${
                  netProfit >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {netProfit < 0 ? '-' : ''}{formatCurrency(Math.abs(netProfit))}
                </p>
                <p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">
                  Net {netProfit >= 0 ? 'Profit' : 'Loss'} &middot; {marginPercent.toFixed(1)}% margin
                </p>
              </div>
            </div>
          </div>

          {/* ── Monthly Chart ──────────────────────────── */}
          <Card className="triumph-card p-4 anim-fade-up anim-d4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-white mb-3">Monthly Revenue vs Expenses</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e2e8f0)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(Number(v))} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Revenue" fill="#22c55e" radius={[3, 3, 0, 0]} barSize={18} />
                  <Bar dataKey="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={18} />
                  <Line type="monotone" dataKey="Net Profit" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* ── Revenue & Expense Breakdown ────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Revenue by Source */}
            <Card className="triumph-card p-4 anim-fade-up anim-d5">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-white mb-3">Revenue Breakdown</h2>
              {bySource.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No revenue data</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-400 dark:text-[var(--dark-text-3)] border-b border-slate-100 dark:border-slate-700/50">
                      <th className="pb-2 font-medium">Source</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                      <th className="pb-2 font-medium text-right w-16">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bySource.map((s: any) => (
                      <tr key={s.source} className="border-b border-slate-50 dark:border-slate-700/30">
                        <td className="py-2 text-slate-600 dark:text-[var(--dark-text)]">{s.source}</td>
                        <td className="py-2 text-right font-semibold tabular-nums text-slate-700 dark:text-white">{formatCurrency(s.amount)}</td>
                        <td className="py-2 text-right tabular-nums text-slate-500 dark:text-[var(--dark-text-3)]">
                          {totalRevenue > 0 ? ((s.amount / totalRevenue) * 100).toFixed(1) : '0.0'}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            {/* Expenses by Category */}
            <Card className="triumph-card p-4 anim-fade-up anim-d6">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-white mb-3">Expense Breakdown</h2>
              {byCategory.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No expense data</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-400 dark:text-[var(--dark-text-3)] border-b border-slate-100 dark:border-slate-700/50">
                      <th className="pb-2 font-medium">Category</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                      <th className="pb-2 font-medium text-right w-16">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCategory.map((c: any) => (
                      <tr key={c.category} className="border-b border-slate-50 dark:border-slate-700/30">
                        <td className="py-2 text-slate-600 dark:text-[var(--dark-text)]">{c.category}</td>
                        <td className="py-2 text-right font-semibold tabular-nums text-slate-700 dark:text-white">{formatCurrency(c.amount)}</td>
                        <td className="py-2 text-right tabular-nums text-slate-500 dark:text-[var(--dark-text-3)]">
                          {totalExpenses > 0 ? ((c.amount / totalExpenses) * 100).toFixed(1) : '0.0'}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>

          {/* ── Monthly Detail Table ───────────────────── */}
          <Card className="triumph-card p-4 anim-fade-up anim-d6">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-white mb-3">Monthly Detail</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 dark:text-[var(--dark-text-3)] border-b border-slate-100 dark:border-slate-700/50">
                    <th className="pb-2 font-medium">Month</th>
                    <th className="pb-2 font-medium text-right">Revenue</th>
                    <th className="pb-2 font-medium text-right">Expenses</th>
                    <th className="pb-2 font-medium text-right">Net Profit</th>
                    <th className="pb-2 font-medium text-right w-16">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyDetail.map(r => (
                    <tr key={r.month} className="border-b border-slate-50 dark:border-slate-700/30">
                      <td className="py-2 text-slate-600 dark:text-[var(--dark-text)]">{r.name}</td>
                      <td className="py-2 text-right font-semibold tabular-nums text-slate-700 dark:text-white">{formatCurrency(r.revenue)}</td>
                      <td className="py-2 text-right font-semibold tabular-nums text-red-600 dark:text-red-400">{formatCurrency(r.expenses)}</td>
                      <td className={`py-2 text-right font-semibold tabular-nums ${
                        r.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {r.net < 0 ? '-' : ''}{formatCurrency(Math.abs(r.net))}
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-500 dark:text-[var(--dark-text-3)]">
                        {r.margin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-600 font-semibold">
                    <td className="pt-2 text-slate-700 dark:text-white">Total</td>
                    <td className="pt-2 text-right tabular-nums text-slate-700 dark:text-white">{formatCurrency(totalRevenue)}</td>
                    <td className="pt-2 text-right tabular-nums text-red-600 dark:text-red-400">{formatCurrency(totalExpenses)}</td>
                    <td className={`pt-2 text-right tabular-nums ${
                      netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {netProfit < 0 ? '-' : ''}{formatCurrency(Math.abs(netProfit))}
                    </td>
                    <td className="pt-2 text-right tabular-nums text-slate-500 dark:text-[var(--dark-text-3)]">
                      {marginPercent.toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

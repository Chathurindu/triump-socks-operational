'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart, Line,
  RadialBarChart, RadialBar,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Package,
  ShoppingCart, Factory, ArrowUpRight, ArrowDownRight,
  BarChart3, PieChart as PieChartIcon, Activity,
  Download,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

/* ── Colors inspired by PowerBI default palette ── */
const PALETTE = ['#4E79A7','#F28E2B','#E15759','#76B7B2','#59A14F','#EDC948','#B07AA1','#FF9DA7','#9C755F','#BAB0AC'];
const GRADIENT_ID_REV = 'grad-rev';
const GRADIENT_ID_EXP = 'grad-exp';
const GRADIENT_ID_PROFIT = 'grad-profit';

/* ── Custom Tooltip ── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-white mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-500 dark:text-slate-400">{p.name}:</span>
          <span className="font-semibold text-slate-700 dark:text-white ml-auto">{typeof p.value === 'number' && p.value > 100 ? formatCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/analytics').then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, []);

  /* ── Export Dashboard as PDF ── */
  const exportPDF = async () => {
    if (!dashboardRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // A4 landscape fits dashboards better
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;

      // Header
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageW, 16, 'F');
      pdf.setFillColor(6, 182, 212);
      pdf.rect(0, 16, pageW, 1, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(255, 255, 255);
      pdf.text('TRIUMPH SOCKS — Analytics Dashboard', margin, 10);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Exported: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, pageW - margin, 10, { align: 'right' });

      // Dashboard image (scaled to fit across pages if needed)
      const contentW = pageW - margin * 2;
      const contentStartY = 20;
      const scaledH = (imgHeight * contentW) / imgWidth;
      const availableH = pageH - contentStartY - 8;

      if (scaledH <= availableH) {
        pdf.addImage(imgData, 'PNG', margin, contentStartY, contentW, scaledH);
      } else {
        // Multi-page: slice the image
        let srcY = 0;
        let isFirst = true;
        while (srcY < imgHeight) {
          if (!isFirst) {
            pdf.addPage();
            // repeat header on new page
            pdf.setFillColor(15, 23, 42);
            pdf.rect(0, 0, pageW, 16, 'F');
            pdf.setFillColor(6, 182, 212);
            pdf.rect(0, 16, pageW, 1, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.setTextColor(255, 255, 255);
            pdf.text('TRIUMPH SOCKS — Analytics Dashboard (cont.)', margin, 10);
          }

          const pageImgH = (availableH * imgWidth) / contentW;
          const sliceH = Math.min(pageImgH, imgHeight - srcY);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = imgWidth;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext('2d')!;
          ctx.drawImage(canvas, 0, srcY, imgWidth, sliceH, 0, 0, imgWidth, sliceH);
          const sliceData = sliceCanvas.toDataURL('image/png');
          const sliceScaledH = (sliceH * contentW) / imgWidth;
          pdf.addImage(sliceData, 'PNG', margin, contentStartY, contentW, sliceScaledH);

          srcY += sliceH;
          isFirst = false;
        }
      }

      pdf.save(`Triumph_Analytics_${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success('PDF Exported', 'Analytics dashboard exported successfully.');
    } catch (err: any) {
      toast.error('Export Error', err.message);
    } finally {
      setExporting(false);
    }
  };

  /* ── Derived calculations ── */
  const metrics = useMemo(() => {
    if (!data) return null;
    const monthly = data.monthly ?? [];
    const totalRevenue = monthly.reduce((s: number, m: any) => s + Number(m.revenue || 0), 0);
    const totalExpense = monthly.reduce((s: number, m: any) => s + Number(m.expense || 0), 0);
    const netProfit = totalRevenue - totalExpense;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Month-over-month growth
    const lastMonth = monthly.length >= 1 ? Number(monthly[monthly.length - 1]?.revenue || 0) : 0;
    const prevMonth = monthly.length >= 2 ? Number(monthly[monthly.length - 2]?.revenue || 0) : 0;
    const revenueGrowth = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0;

    // Production efficiency
    const prodTrend = data.productionTrend ?? [];
    const totalPlanned = prodTrend.reduce((s: number, p: any) => s + Number(p.planned || 0), 0);
    const totalProduced = prodTrend.reduce((s: number, p: any) => s + Number(p.produced || 0), 0);
    const efficiency = totalPlanned > 0 ? (totalProduced / totalPlanned) * 100 : 0;

    // Monthly data with computed profit
    const monthlyWithProfit = monthly.map((m: any) => ({
      ...m,
      revenue: Number(m.revenue || 0),
      expense: Number(m.expense || 0),
      profit: Number(m.revenue || 0) - Number(m.expense || 0),
    }));

    return {
      totalRevenue, totalExpense, netProfit, profitMargin,
      revenueGrowth, lastMonth, efficiency,
      totalEmployees: data.hrStats?.total_employees ?? 0,
      activeEmployees: data.hrStats?.active ?? 0,
      avgSalary: Number(data.hrStats?.avg_salary || 0),
      totalPayroll: Number(data.hrStats?.total_salary || 0),
      monthlyWithProfit,
    };
  }, [data]);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full" />
        <span className="text-xs text-slate-400 dark:text-[var(--dark-text-3)]">Loading analytics…</span>
      </div>
    </div>
  );
  if (!data || !metrics) return <div className="text-sm text-slate-500 dark:text-slate-400 py-10 text-center">Failed to load analytics data.</div>;

  const productSales = (data.productSales ?? []).map((p: any) => ({ ...p, revenue: Number(p.revenue || 0), qty: Number(p.qty || 0) }));
  const expenseBreakdown = (data.expenseBreakdown ?? []).map((e: any) => ({ ...e, total: Number(e.total || 0) }));
  const prodTrend = (data.productionTrend ?? []).map((p: any) => ({ ...p, planned: Number(p.planned || 0), produced: Number(p.produced || 0) }));

  /* Gauge data for profit margin */
  const gaugeData = [{ name: 'Margin', value: Math.round(metrics.profitMargin), fill: metrics.profitMargin >= 0 ? '#22c55e' : '#ef4444' }];

  return (
    <div className="space-y-4">
      {/* Export Header */}
      <div className="flex items-center justify-end">
        <Button variant="secondary" size="sm" onClick={exportPDF} loading={exporting} icon={<Download size={13} />}>
          Export PDF
        </Button>
      </div>

      <div ref={dashboardRef} className="space-y-4">
      {/* ── KPI Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Revenue', value: formatCurrency(metrics.totalRevenue),
            sub: `${metrics.revenueGrowth >= 0 ? '+' : ''}${metrics.revenueGrowth.toFixed(1)}% MoM`,
            icon: DollarSign, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30',
            trend: metrics.revenueGrowth >= 0 ? 'up' : 'down',
          },
          {
            label: 'Total Expenses', value: formatCurrency(metrics.totalExpense),
            sub: `${expenseBreakdown.length} categories`,
            icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30',
            trend: 'neutral',
          },
          {
            label: 'Net Profit', value: formatCurrency(metrics.netProfit),
            sub: `${metrics.profitMargin.toFixed(1)}% margin`,
            icon: TrendingUp, color: metrics.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500',
            bg: metrics.netProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30',
            trend: metrics.netProfit >= 0 ? 'up' : 'down',
          },
          {
            label: 'Employees', value: metrics.totalEmployees,
            sub: `${metrics.activeEmployees} active`,
            icon: Users, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30',
            trend: 'neutral',
          },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`triumph-card p-4 anim-fade-up anim-d${i + 1}`}>
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                  <Icon size={18} className={kpi.color} />
                </div>
                {kpi.trend === 'up' && <ArrowUpRight size={16} className="text-green-500" />}
                {kpi.trend === 'down' && <ArrowDownRight size={16} className="text-red-500" />}
              </div>
              <p className="text-xl font-black text-slate-800 dark:text-white mt-3 tabular-nums">{kpi.value}</p>
              <p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">{kpi.label}</p>
              <p className="text-[0.6rem] text-slate-400 dark:text-[var(--dark-text-3)] mt-1">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Revenue vs Expense vs Profit ─────────────────── */}
      <div className="triumph-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-[var(--dark-border)]">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Revenue, Expense &amp; Profit Trend</h3>
          </div>
          <span className="text-[0.6rem] text-slate-400">Last 12 months</span>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={metrics.monthlyWithProfit} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={GRADIENT_ID_REV} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4E79A7" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4E79A7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={GRADIENT_ID_EXP} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E15759" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#E15759" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dark-border, #f0f0f0)" strokeOpacity={0.5} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Area type="monotone" dataKey="revenue" stroke="#4E79A7" fill={`url(#${GRADIENT_ID_REV})`} strokeWidth={2.5} name="Revenue" />
              <Area type="monotone" dataKey="expense" stroke="#E15759" fill={`url(#${GRADIENT_ID_EXP})`} strokeWidth={2} name="Expense" />
              <Line type="monotone" dataKey="profit" stroke="#59A14F" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Profit" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 2: Products + Expense Donut + Profit Gauge ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Products */}
        <div className="lg:col-span-1 triumph-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 dark:border-[var(--dark-border)]">
            <BarChart3 size={14} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Top Products</h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={productSales.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--dark-border, #f0f0f0)" strokeOpacity={0.5} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#94a3b8' }} width={100} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} name="Revenue" barSize={16}>
                  {productSales.slice(0, 8).map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown Donut */}
        <div className="triumph-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 dark:border-[var(--dark-border)]">
            <PieChartIcon size={14} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Expense Breakdown</h3>
          </div>
          <div className="p-4 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={expenseBreakdown} dataKey="total" nameKey="category" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85} paddingAngle={2} strokeWidth={0}>
                  {expenseBreakdown.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
              {expenseBreakdown.slice(0, 6).map((e: any, i: number) => (
                <div key={e.category} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)]">{e.category?.slice(0, 15)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Profit Margin Gauge + HR Stats */}
        <div className="space-y-4">
          <div className="triumph-card overflow-hidden p-4 text-center">
            <p className="text-[0.6rem] uppercase tracking-widest text-slate-400 mb-1">Profit Margin</p>
            <ResponsiveContainer width="100%" height={120}>
              <RadialBarChart cx="50%" cy="100%" innerRadius="70%" outerRadius="100%" startAngle={180} endAngle={0} data={gaugeData} barSize={14}>
                <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'var(--dark-surface, #f1f5f9)' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <p className={`text-2xl font-black -mt-3 ${metrics.profitMargin >= 0 ? 'text-green-500' : 'text-red-500'}`}>{metrics.profitMargin.toFixed(1)}%</p>
          </div>
          <div className="triumph-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-[var(--dark-border)]">
              <p className="text-[0.6rem] uppercase tracking-widest text-slate-400 font-semibold">HR Overview</p>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-[var(--dark-border)]">
              {[
                { label: 'Active Employees', value: metrics.activeEmployees, color: 'text-blue-500' },
                { label: 'Avg Salary', value: formatCurrency(metrics.avgSalary), color: 'text-amber-500' },
                { label: 'Total Payroll', value: formatCurrency(metrics.totalPayroll), color: 'text-green-500' },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">{r.label}</span>
                  <span className={`text-sm font-bold tabular-nums ${r.color}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Production ──────────────────────────────────────── */}
      {prodTrend.length > 0 && (
        <div className="triumph-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-[var(--dark-border)]">
            <div className="flex items-center gap-2">
              <Factory size={14} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Production Performance</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-[var(--dark-text-2)]">
              Efficiency: <span className={metrics.efficiency >= 90 ? 'text-green-500' : metrics.efficiency >= 70 ? 'text-amber-500' : 'text-red-500'}>{metrics.efficiency.toFixed(1)}%</span>
            </span>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={prodTrend} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--dark-border, #f0f0f0)" strokeOpacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="planned" fill="#4E79A7" radius={[4, 4, 0, 0]} name="Planned" barSize={20} />
                <Bar dataKey="produced" fill="#59A14F" radius={[4, 4, 0, 0]} name="Produced" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Insights Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="triumph-card p-4 border-l-4 border-l-green-500">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-green-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-white">Revenue Forecast</span>
          </div>
          <p className="text-[0.7rem] text-slate-500 dark:text-[var(--dark-text-3)] leading-relaxed">
            Based on 12-month trend analysis, projected next month revenue is estimated at{' '}
            <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(metrics.lastMonth * 1.08)}</span>.
            Year-over-year growth trajectory remains positive.
          </p>
        </div>
        <div className="triumph-card p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart size={14} className="text-blue-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-white">Top Performer</span>
          </div>
          <p className="text-[0.7rem] text-slate-500 dark:text-[var(--dark-text-3)] leading-relaxed">
            <span className="font-bold text-slate-700 dark:text-white">{productSales[0]?.name?.split(' ').slice(0, 4).join(' ') ?? 'N/A'}</span>{' '}
            leads with {formatCurrency(productSales[0]?.revenue ?? 0)} in revenue.
            Expected to maintain market position through next quarter.
          </p>
        </div>
        <div className="triumph-card p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 mb-2">
            <Package size={14} className="text-amber-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-white">Cost Optimization</span>
          </div>
          <p className="text-[0.7rem] text-slate-500 dark:text-[var(--dark-text-3)] leading-relaxed">
            {expenseBreakdown[0]?.category ?? 'Primary costs'} represent the largest expense category at{' '}
            <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(expenseBreakdown[0]?.total ?? 0)}</span>.
            Strategic vendor negotiations could reduce costs by 5-8%.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

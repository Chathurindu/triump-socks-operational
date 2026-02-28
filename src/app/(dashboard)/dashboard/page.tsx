'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  DollarSign, Users, Factory, ShoppingCart,
  TrendingUp, AlertTriangle, Wrench, Settings2,
  GripVertical, Eye, EyeOff, RotateCcw,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

/* ── types ──────────────────────────────────────────────── */
type Widget = {
  id: string; label: string; type: 'stat' | 'chart' | 'list';
  enabled: boolean; order: number; size: number;
};

type DashData = {
  totalRevenue: number; totalExpense: number; netProfit: number;
  totalEmployees: number; presentToday: number; activeOrders: number;
  lowStockItems: number; productionInProgress: number;
  monthlyRevenue: { month: string; revenue: number; expense: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  recentTransactions: any[];
  overdueInvoices: any[];
  recentExpenses: any[];
  pendingQuotations: any[];
};

const PIE_COLORS = ['#d4730a','#3b82f6','#22c55e','#f59e0b','#a855f7','#ef4444'];

export default function DashboardPage() {
  const [data, setData]         = useState<DashData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [widgets, setWidgets]   = useState<Widget[]>([]);
  const [defaults, setDefaults] = useState<Widget[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [dragIdx, setDragIdx]   = useState<number | null>(null);
  const toast = useToast();

  /* Fetch widget layout */
  useEffect(() => {
    fetch('/api/dashboard/widgets')
      .then(r => r.json())
      .then(j => { setWidgets(j.widgets ?? []); setDefaults(j.defaults ?? []); })
      .catch(() => {});
  }, []);

  /* Fetch dashboard data */
  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const saveLayout = useCallback(async (w: Widget[]) => {
    try {
      await fetch('/api/dashboard/widgets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgets: w }),
      });
    } catch {}
  }, []);

  const toggleWidget = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  };

  const resetLayout = () => setWidgets([...defaults]);

  const saveConfig = () => {
    saveLayout(widgets);
    setConfigOpen(false);
    toast.success('Saved', 'Dashboard layout saved.');
  };

  /* Drag & drop */
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const updated = [...widgets];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    updated.forEach((w, i) => w.order = i);
    setWidgets(updated);
    setDragIdx(idx);
  };
  const handleDragEnd = () => { setDragIdx(null); saveLayout(widgets); };

  /* ── render helpers ─────────────────────────────────────── */
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full" />
    </div>
  );
  if (!data) return <div className="text-sm text-gray-500 dark:text-gray-400">Failed to load dashboard.</div>;

  const enabled = widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order);
  const stats  = enabled.filter(w => w.type === 'stat');
  const charts = enabled.filter(w => w.type === 'chart');
  const lists  = enabled.filter(w => w.type === 'list');

  const renderStat = (w: Widget, i: number) => {
    const map: Record<string, { title: string; value: any; icon: any; iconColor: string; desc?: string; change?: number }> = {
      'revenue':    { title: 'Revenue (This Month)', value: formatCurrency(data.totalRevenue), icon: DollarSign, iconColor: 'amber', change: 8.4 },
      'expenses':   { title: 'Expenses (This Month)', value: formatCurrency(data.totalExpense), icon: TrendingUp, iconColor: 'red', change: -3.1 },
      'net-profit': { title: 'Net Profit', value: formatCurrency(data.netProfit), icon: DollarSign, iconColor: 'green', change: 12.5 },
      'employees':  { title: 'Active Employees', value: data.totalEmployees, icon: Users, iconColor: 'blue', desc: `${data.presentToday} present today` },
      'orders':     { title: 'Active Sales Orders', value: data.activeOrders, icon: ShoppingCart, iconColor: 'purple' },
      'low-stock':  { title: 'Low Stock Alerts', value: data.lowStockItems, icon: AlertTriangle, iconColor: 'red' },
      'production': { title: 'In Production', value: data.productionInProgress, icon: Factory, iconColor: 'amber' },
      'total-emp':  { title: 'Total Employees', value: data.totalEmployees, icon: Wrench, iconColor: 'gray' },
    };
    const cfg = map[w.id];
    if (!cfg) return null;
    return <StatCard key={w.id} title={cfg.title} value={cfg.value} icon={cfg.icon} iconColor={cfg.iconColor} change={cfg.change} description={cfg.desc} animDelay={`anim-d${Math.min(i+1,6)}`} />;
  };

  const renderChart = (w: Widget) => {
    if (w.id === 'rev-chart') return (
      <Card key={w.id} title="Revenue vs Expense (6 months)" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data.monthlyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#d4730a" stopOpacity={0.15} /><stop offset="95%" stopColor="#d4730a" stopOpacity={0} /></linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={v => formatCurrency(Number(v))} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="revenue" stroke="#d4730a" fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
            <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} name="Expense" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    );
    if (w.id === 'pie-chart') return (
      <Card key={w.id} title="Revenue by Product">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data.topProducts} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={75}
              label={({ name, percent }: any) => `${(name ?? '').split(' ')[0]} ${((percent ?? 0)*100).toFixed(0)}%`}
              labelLine={false} style={{ fontSize: 9 }}>
              {data.topProducts.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={v => formatCurrency(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    );
    if (w.id === 'bar-chart') return (
      <Card key={w.id} title="Top Products by Units Sold">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.topProducts.slice(0,6)} layout="vertical" margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
            <Tooltip />
            <Bar dataKey="quantity" fill="#d4730a" radius={[0,3,3,0]} name="Units" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    );
    return null;
  };

  const renderList = (w: Widget) => {
    if (w.id === 'recent-txn') return (
      <Card key={w.id} title="Recent Transactions">
        <div className="space-y-1">
          {data.recentTransactions.map(t => (
            <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-none">
              <div className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.txn_type==='income'?'bg-green-500':'bg-red-500'}`} />
                <div>
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight">{t.description?.length>35?t.description.slice(0,35)+'…':t.description}</p>
                  <p className="text-[0.65rem] text-gray-400">{formatDate(t.txn_date)} · {t.category}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold tabular-nums flex-shrink-0 ${t.txn_type==='income'?'text-green-600 dark:text-green-400':'text-red-600 dark:text-red-400'}`}>
                {t.txn_type==='income'?'+':'-'}{formatCurrency(t.amount)}
              </span>
            </div>
          ))}
          {!data.recentTransactions.length && <p className="text-xs text-gray-400 text-center py-4">No transactions yet.</p>}
        </div>
      </Card>
    );
    if (w.id === 'overdue-inv') return (
      <Card key={w.id} title="Overdue Invoices">
        <div className="space-y-1">
          {(data.overdueInvoices??[]).map((inv: any) => (
            <div key={inv.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-none">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight">{inv.invoice_number}</p>
                  <p className="text-[0.65rem] text-gray-400">{inv.customer_name??'No customer'} · Due {formatDate(inv.due_date)}</p>
                </div>
              </div>
              <span className="text-xs font-semibold tabular-nums text-red-600 dark:text-red-400 flex-shrink-0">{formatCurrency(parseFloat(inv.grand_total)-parseFloat(inv.amount_paid||0))}</span>
            </div>
          ))}
          {!(data.overdueInvoices??[]).length && <p className="text-xs text-gray-400 text-center py-4">No overdue invoices.</p>}
        </div>
      </Card>
    );
    if (w.id === 'recent-exp') return (
      <Card key={w.id} title="Recent Expenses">
        <div className="space-y-1">
          {(data.recentExpenses??[]).map((exp: any) => (
            <div key={exp.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-none">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight">{(exp.description??'Expense').length>35?exp.description.slice(0,35)+'…':(exp.description??'Expense')}</p>
                  <p className="text-[0.65rem] text-gray-400">{formatDate(exp.expense_date)} · {exp.category_name??'Uncategorized'}</p>
                </div>
              </div>
              <span className="text-xs font-semibold tabular-nums text-red-600 dark:text-red-400 flex-shrink-0">-{formatCurrency(parseFloat(exp.amount))}</span>
            </div>
          ))}
          {!(data.recentExpenses??[]).length && <p className="text-xs text-gray-400 text-center py-4">No expenses yet.</p>}
        </div>
      </Card>
    );
    if (w.id === 'quotes') return (
      <Card key={w.id} title="Pending Quotations">
        <div className="space-y-1">
          {(data.pendingQuotations??[]).map((q: any) => (
            <div key={q.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-none">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight">{q.quote_number}</p>
                  <p className="text-[0.65rem] text-gray-400">{q.customer_name??'No customer'} · {formatDate(q.quote_date)}</p>
                </div>
              </div>
              <span className="text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400 flex-shrink-0">{formatCurrency(parseFloat(q.grand_total))}</span>
            </div>
          ))}
          {!(data.pendingQuotations??[]).length && <p className="text-xs text-gray-400 text-center py-4">No pending quotations.</p>}
        </div>
      </Card>
    );
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Header with customize button */}
      <div className="flex items-center justify-end">
        <Button variant="ghost" size="sm" icon={<Settings2 size={13} />} onClick={() => setConfigOpen(true)}>Customize</Button>
      </div>

      {/* Stats */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((w, i) => (
            <div key={w.id} draggable onDragStart={() => handleDragStart(widgets.findIndex(x => x.id===w.id))}
              onDragOver={e => handleDragOver(e, widgets.findIndex(x => x.id===w.id))} onDragEnd={handleDragEnd}
              className="cursor-grab active:cursor-grabbing">{renderStat(w, i)}</div>
          ))}
        </div>
      )}

      {/* Charts */}
      {charts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {charts.map(w => (
            <div key={w.id} draggable onDragStart={() => handleDragStart(widgets.findIndex(x => x.id===w.id))}
              onDragOver={e => handleDragOver(e, widgets.findIndex(x => x.id===w.id))} onDragEnd={handleDragEnd}
              className={`cursor-grab active:cursor-grabbing ${w.size===2?'lg:col-span-2':''}`}>{renderChart(w)}</div>
          ))}
        </div>
      )}

      {/* Lists */}
      {lists.length > 0 && (
        <div className={`grid grid-cols-1 gap-5 ${lists.length>=3?'lg:grid-cols-3':lists.length===2?'lg:grid-cols-2':''}`}>
          {lists.map(w => (
            <div key={w.id} draggable onDragStart={() => handleDragStart(widgets.findIndex(x => x.id===w.id))}
              onDragOver={e => handleDragOver(e, widgets.findIndex(x => x.id===w.id))} onDragEnd={handleDragEnd}
              className="cursor-grab active:cursor-grabbing">{renderList(w)}</div>
          ))}
        </div>
      )}

      {/* Widget Config Modal */}
      <Modal open={configOpen} onClose={() => setConfigOpen(false)} title="Customize Dashboard" size="md">
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {widgets.map((w, idx) => (
            <div key={w.id} draggable onDragStart={() => setDragIdx(idx)}
              onDragOver={e => { e.preventDefault(); handleDragOver(e, idx); }} onDragEnd={() => setDragIdx(null)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${dragIdx===idx?'bg-amber-50 dark:bg-amber-900/20':'hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)]'}`}>
              <GripVertical size={14} className="text-slate-300 cursor-grab flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${w.enabled?'text-slate-800 dark:text-white':'text-slate-400 dark:text-slate-500'}`}>{w.label}</p>
                <p className="text-[0.65rem] text-slate-400 capitalize">{w.type}</p>
              </div>
              <button onClick={() => toggleWidget(w.id)}
                className={`p-1.5 rounded-md transition-colors ${w.enabled?'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400':'text-slate-300 bg-slate-50 dark:bg-slate-800 dark:text-slate-500'}`}>
                {w.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="ghost" size="sm" icon={<RotateCcw size={12} />} onClick={resetLayout}>Reset to Default</Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={saveConfig}>Save Layout</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

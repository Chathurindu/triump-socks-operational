'use client';
import { useEffect, useState, useCallback } from 'react';
import { ResponsiveGridLayout, useContainerWidth, verticalCompactor } from 'react-grid-layout';
import type { Layout, LayoutItem } from 'react-grid-layout';
import {
  DollarSign, Users, Factory, ShoppingCart,
  TrendingUp, AlertTriangle, Wrench, Settings2,
  GripVertical, Eye, EyeOff, RotateCcw, Lock, Unlock,
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
  id: string; label: string; type: 'stat' | 'chart' | 'list' | 'mixed';
  enabled: boolean; x: number; y: number; w: number; h: number;
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

/* Default sizes for migration from old format */
const WIDGET_SIZES: Record<string, [number, number]> = {
  'revenue': [3,2], 'expenses': [3,2], 'net-profit': [3,2], 'employees': [3,2],
  'orders': [3,2], 'low-stock': [3,2], 'production': [3,2], 'total-emp': [3,2],
  'rev-chart': [8,4], 'pie-chart': [4,4],
  'bar-chart': [4,4], 'recent-txn': [4,4], 'overdue-inv': [4,4],
  'recent-exp': [6,4], 'quotes': [6,4],
};

const MIN_SIZES: Record<string, { minW: number; minH: number }> = {
  stat: { minW: 2, minH: 2 }, chart: { minW: 2, minH: 3 },
  list: { minW: 2, minH: 3 }, mixed: { minW: 2, minH: 3 },
};

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 } as const;
const COLS        = { lg: 12,  md: 10,  sm: 6,   xs: 4,   xxs: 2 } as const;

/** Generate a responsive layout for a given column count from the widget list */
function generateResponsiveLayout(widgets: Widget[], cols: number): LayoutItem[] {
  const items: LayoutItem[] = [];
  let cx = 0, cy = 0, rowH = 0;
  for (const w of widgets) {
    if (!w.enabled) continue;
    const ww = Math.min(w.w, cols);
    const hh = w.h;
    if (cx + ww > cols) { cx = 0; cy += rowH; rowH = 0; }
    items.push({
      i: w.id, x: cx, y: cy, w: ww, h: hh,
      minW: MIN_SIZES[w.type]?.minW ?? 2,
      minH: MIN_SIZES[w.type]?.minH ?? 2,
    });
    cx += ww;
    rowH = Math.max(rowH, hh);
  }
  return items;
}

/* Migrate old order/size format → new x/y/w/h format */
function migrateWidgets(raw: any[]): Widget[] {
  if (!raw?.length) return [];
  if (typeof raw[0].x === 'number') return raw as Widget[];
  let cx = 0, cy = 0, rowH = 0;
  return raw.map((w: any) => {
    const [ww, hh] = WIDGET_SIZES[w.id] ?? [4, 3];
    if (cx + ww > 12) { cx = 0; cy += rowH; rowH = 0; }
    const result: Widget = { id: w.id, label: w.label, type: w.type, enabled: w.enabled, x: cx, y: cy, w: ww, h: hh };
    cx += ww; rowH = Math.max(rowH, hh);
    return result;
  });
}

export default function DashboardPage() {
  const [data, setData]         = useState<DashData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [widgets, setWidgets]   = useState<Widget[]>([]);
  const [defaults, setDefaults] = useState<Widget[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [locked, setLocked]     = useState(true);
  const { width: gridWidth, mounted, containerRef } = useContainerWidth({ initialWidth: 1200 });
  const toast = useToast();

  /* Fetch widget layout */
  useEffect(() => {
    fetch('/api/dashboard/widgets')
      .then(r => r.json())
      .then(j => {
        setWidgets(migrateWidgets(j.widgets ?? []));
        setDefaults(j.defaults ?? []);
      })
      .catch(() => {});
  }, []);

  /* Fetch dashboard data */
  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const saveWidgets = useCallback(async (w: Widget[]) => {
    try {
      await fetch('/api/dashboard/widgets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgets: w }),
      });
    } catch {}
  }, []);

  /* Sync layout after drag/resize */
  const syncLayout = useCallback((layout: Layout) => {
    setWidgets(prev => {
      const updated = prev.map(w => {
        const item = layout.find(l => l.i === w.id);
        if (!item) return w;
        return { ...w, x: item.x, y: item.y, w: item.w, h: item.h };
      });
      saveWidgets(updated);
      return updated;
    });
  }, [saveWidgets]);

  const toggleWidget = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  };

  const resetLayout = () => setWidgets(migrateWidgets([...defaults]));

  const saveConfig = () => {
    saveWidgets(widgets);
    setConfigOpen(false);
    toast.success('Saved', 'Dashboard layout saved.');
  };

  /* ── render helpers ─────────────────────────────────────── */
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full" />
    </div>
  );
  if (!data) return <div className="text-sm text-gray-500 dark:text-gray-400">Failed to load dashboard.</div>;

  const enabled = widgets.filter(w => w.enabled);

  const lgLayout: LayoutItem[] = enabled.map(w => ({
    i: w.id, x: w.x, y: w.y, w: w.w, h: w.h,
    minW: MIN_SIZES[w.type]?.minW ?? 2,
    minH: MIN_SIZES[w.type]?.minH ?? 2,
    static: locked,
  }));

  const responsiveLayouts = {
    lg:  lgLayout,
    md:  generateResponsiveLayout(enabled, COLS.md),
    sm:  generateResponsiveLayout(enabled, COLS.sm),
    xs:  generateResponsiveLayout(enabled, COLS.xs),
    xxs: generateResponsiveLayout(enabled, COLS.xxs),
  };

  const renderStat = (w: Widget) => {
    const map: Record<string, { title: string; value: any; icon: any; iconColor: string; desc?: string; change?: number }> = {
      'revenue':    { title: 'Revenue', value: formatCurrency(data.totalRevenue), icon: DollarSign, iconColor: 'amber', change: 8.4 },
      'expenses':   { title: 'Expenses', value: formatCurrency(data.totalExpense), icon: TrendingUp, iconColor: 'red', change: -3.1 },
      'net-profit': { title: 'Net Profit', value: formatCurrency(data.netProfit), icon: DollarSign, iconColor: 'green', change: 12.5 },
      'employees':  { title: 'Employees', value: data.totalEmployees, icon: Users, iconColor: 'blue', desc: `${data.presentToday} present today` },
      'orders':     { title: 'Active Orders', value: data.activeOrders, icon: ShoppingCart, iconColor: 'purple' },
      'low-stock':  { title: 'Low Stock', value: data.lowStockItems, icon: AlertTriangle, iconColor: 'red' },
      'production': { title: 'Production', value: data.productionInProgress, icon: Factory, iconColor: 'amber' },
      'total-emp':  { title: 'Total Staff', value: data.totalEmployees, icon: Wrench, iconColor: 'gray' },
    };
    const cfg = map[w.id];
    if (!cfg) return null;
    return <StatCard title={cfg.title} value={cfg.value} icon={cfg.icon} iconColor={cfg.iconColor} change={cfg.change} description={cfg.desc} />;
  };

  const renderChart = (w: Widget) => {
    if (w.id === 'rev-chart') return (
      <Card title="Revenue vs Expense">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthlyRevenue ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
        </div>
      </Card>
    );
    if (w.id === 'pie-chart') return (
      <Card title="Revenue by Product">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.topProducts ?? []} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                label={({ name, percent }: any) => `${(name ?? '').split(' ')[0]} ${((percent ?? 0)*100).toFixed(0)}%`}
                labelLine={false} style={{ fontSize: 9 }}>
                {(data.topProducts ?? []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => formatCurrency(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
    if (w.id === 'bar-chart') return (
      <Card title="Top Products by Units">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(data.topProducts ?? []).slice(0,6)} layout="vertical" margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
              <Tooltip />
              <Bar dataKey="quantity" fill="#d4730a" radius={[0,3,3,0]} name="Units" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
    return null;
  };

  const renderList = (w: Widget) => {
    if (w.id === 'recent-txn') return (
      <Card title="Recent Transactions">
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
          {(data.recentTransactions ?? []).map(t => (
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
          {!(data.recentTransactions ?? []).length && <p className="text-xs text-gray-400 text-center py-4">No transactions yet.</p>}
        </div>
      </Card>
    );
    if (w.id === 'overdue-inv') return (
      <Card title="Overdue Invoices">
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
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
      <Card title="Recent Expenses">
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
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
      <Card title="Pending Quotations">
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
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

  const renderWidget = (w: Widget) => {
    if (w.type === 'stat') return renderStat(w);
    if (w.type === 'chart') return renderChart(w);
    if (w.type === 'list') return renderList(w);
    if (w.type === 'mixed') return renderChart(w) || renderList(w);
    return null;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={locked ? 'ghost' : 'primary'}
            size="sm"
            icon={locked ? <Lock size={13} /> : <Unlock size={13} />}
            onClick={() => setLocked(!locked)}
          >
            {locked ? 'Locked' : 'Editing'}
          </Button>
          {!locked && (
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
              Drag to reposition · Resize from corners
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" icon={<Settings2 size={13} />} onClick={() => setConfigOpen(true)}>Customize</Button>
      </div>

      {/* Free-form Drag & Drop Grid */}
      <div ref={containerRef}>
        {mounted ? (
          enabled.length > 0 ? (
            <ResponsiveGridLayout
              className="dashboard-grid"
              layouts={responsiveLayouts}
              width={gridWidth}
              breakpoints={BREAKPOINTS}
              cols={COLS}
              rowHeight={80}
              margin={[16, 16] as const}
              containerPadding={[0, 0] as const}
              dragConfig={{ enabled: !locked, handle: '.widget-drag-handle', threshold: 3, bounded: false }}
              resizeConfig={{ enabled: !locked, handles: ['se'] as const }}
              compactor={verticalCompactor}
              onLayoutChange={(layout) => syncLayout(layout)}
            >
              {enabled.map(w => (
                <div key={w.id} className={`rounded-xl overflow-hidden ${!locked ? 'widget-edit-ring' : ''}`}>
                  {!locked && (
                    <div className="widget-drag-handle">
                      <GripVertical size={14} />
                    </div>
                  )}
                  <div className={`widget-body ${w.type !== 'stat' ? 'widget-flex' : ''}`}>
                    {renderWidget(w)}
                  </div>
                </div>
              ))}
            </ResponsiveGridLayout>
          ) : (
            <div className="text-center py-16">
              <p className="text-sm text-gray-400 dark:text-gray-500">No widgets enabled. Click <strong>Customize</strong> to add widgets.</p>
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="triumph-card h-28 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />
            ))}
          </div>
        )}
      </div>

      {/* Customize Widgets Modal */}
      <Modal open={configOpen} onClose={() => setConfigOpen(false)} title="Customize Dashboard" size="md">
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {widgets.map(w => (
            <div key={w.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)]">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${w.enabled ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>{w.label}</p>
                <p className="text-[0.65rem] text-slate-400 capitalize">{w.type} · {w.w}×{w.h}</p>
              </div>
              <button onClick={() => toggleWidget(w.id)}
                className={`p-1.5 rounded-md transition-colors ${w.enabled ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' : 'text-slate-300 bg-slate-50 dark:bg-slate-800 dark:text-slate-500'}`}>
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

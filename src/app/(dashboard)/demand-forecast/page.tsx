'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Plus, BarChart3, LineChart as LineChartIcon,
  Package, ArrowRight,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar,
} from 'recharts';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatNumber } from '@/lib/utils';

/* ── helpers ── */
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthLabel(m: number, y: number) {
  return `${MONTH_NAMES[m - 1]} ${String(y).slice(-2)}`;
}

/* ── page ── */
export default function DemandForecastPage() {
  const toast = useToast();

  const [productId, setProductId] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const [form, setForm] = useState({
    product_id: '',
    period_month: String(new Date().getMonth() + 1),
    period_year: String(new Date().getFullYear()),
    quantity_sold: '',
    revenue: '',
  });

  /* ── fetch products meta ── */
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/demand-forecast?meta=1');
      const json = await res.json();
      setProducts(json.products ?? []);
    } catch {
      toast.error('Failed to load products');
    }
  }, [toast]);

  /* ── fetch overview ── */
  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/demand-forecast?action=overview');
      const json = await res.json();
      setOverview(json);
    } catch {
      toast.error('Failed to load overview');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /* ── fetch product detail ── */
  const fetchDetail = useCallback(async (pid: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/demand-forecast?product_id=${pid}`);
      const json = await res.json();
      setDetail(json);
    } catch {
      toast.error('Failed to load product forecast');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /* ── initial load ── */
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    if (productId) {
      setOverview(null);
      fetchDetail(productId);
    } else {
      setDetail(null);
      fetchOverview();
    }
  }, [productId, fetchDetail, fetchOverview]);

  /* ── form submit ── */
  const handleSubmit = async () => {
    const payload = {
      product_id: form.product_id || productId,
      period_month: Number(form.period_month),
      period_year: Number(form.period_year),
      quantity_sold: Number(form.quantity_sold),
      revenue: Number(form.revenue || 0),
    };
    if (!payload.product_id || !payload.quantity_sold) {
      toast.error('Product and quantity are required');
      return;
    }
    try {
      const res = await fetch('/api/demand-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }
      toast.success('Record saved');
      setFormOpen(false);
      setForm(f => ({ ...f, quantity_sold: '', revenue: '' }));
      // refresh
      if (productId) fetchDetail(productId);
      else fetchOverview();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save');
    }
  };

  /* ── build chart data for product detail ── */
  const chartData = (() => {
    if (!detail) return [];
    const historyRows = [...(detail.history ?? [])].reverse();
    const items = historyRows.map((r: any) => ({
      label: monthLabel(r.period_month, r.period_year),
      actual: r.quantity_sold,
      forecast: null as number | null,
    }));
    for (const f of detail.forecast ?? []) {
      items.push({
        label: monthLabel(f.month, f.year),
        actual: null as number | null,
        forecast: f.predicted_qty,
      });
    }
    // bridge: last actual point repeated as first forecast
    if (historyRows.length > 0 && (detail.forecast ?? []).length > 0) {
      const lastActual = historyRows[historyRows.length - 1];
      const bridgeIdx = items.findIndex(
        i => i.label === monthLabel(lastActual.period_month, lastActual.period_year)
      );
      if (bridgeIdx !== -1) {
        items[bridgeIdx].forecast = lastActual.quantity_sold;
      }
    }
    return items;
  })();

  /* ── overview chart data ── */
  const overviewChartData = (overview?.overview ?? []).map((r: any) => ({
    name: r.product_name?.length > 18 ? r.product_name.slice(0, 16) + '…' : r.product_name,
    qty: r.total_sold,
  }));

  return (
    <div className="space-y-6 anim-fade-up">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-[var(--dark-text)]">
            Demand Forecasting
          </h1>
          <p className="text-sm text-slate-500 dark:text-[var(--dark-muted)] mt-1">
            Analyse demand history and view 3-month predictions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => {
            setForm(f => ({
              ...f,
              product_id: productId || '',
            }));
            setFormOpen(true);
          }}>
            <Plus size={16} className="mr-1" /> Add Data
          </Button>
        </div>
      </div>

      {/* ── Product Selector ── */}
      <Card className="triumph-card">
        <div className="p-4">
          <label className="triumph-label text-sm font-medium mb-1 block">Select Product</label>
          <select
            className="triumph-input w-full sm:w-80"
            value={productId}
            onChange={e => setProductId(e.target.value)}
          >
            <option value="">— All Products (Overview) —</option>
            {products.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </div>
      </Card>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/*  OVERVIEW                                                      */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {!productId && overview && !loading && (
        <>
          {/* Top Products Chart */}
          <Card className="triumph-card anim-fade-up">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-blue-500" />
                <h2 className="text-base font-semibold text-slate-800 dark:text-[var(--dark-text)]">
                  Top 10 Products — Last 12 Months
                </h2>
              </div>
              {overviewChartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overviewChartData} margin={{ top: 5, right: 20, bottom: 60, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
                      <Tooltip formatter={(v) => formatNumber(Number(v))} />
                      <Bar dataKey="qty" name="Qty Sold" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-400 py-8 text-center">No demand data yet.</p>
              )}
            </div>
          </Card>

          {/* Trend Table */}
          <Card className="triumph-card anim-fade-up">
            <div className="p-5">
              <h2 className="text-base font-semibold text-slate-800 dark:text-[var(--dark-text)] mb-4">
                Demand Trend (Quarter-over-Quarter)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-[var(--dark-border)]">
                      <th className="text-left py-2 px-3 font-medium text-slate-500 dark:text-[var(--dark-muted)]">Product</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-[var(--dark-muted)]">Total Sold</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-[var(--dark-muted)]">Revenue</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-[var(--dark-muted)]">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(overview.overview ?? []).map((r: any) => {
                      const pct = r.trend?.change_percent ?? 0;
                      const isUp = pct >= 0;
                      return (
                        <tr
                          key={r.product_id}
                          className="border-b border-slate-50 dark:border-[var(--dark-border)] hover:bg-slate-50/50 dark:hover:bg-[var(--dark-surface)] cursor-pointer transition-colors"
                          onClick={() => setProductId(String(r.product_id))}
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <Package size={14} className="text-slate-400" />
                              <span className="font-medium text-slate-700 dark:text-[var(--dark-text)]">{r.product_name}</span>
                              <span className="text-xs text-slate-400">({r.sku})</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-[var(--dark-text)]">
                            {formatNumber(r.total_sold)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-[var(--dark-text)]">
                            {formatCurrency(r.total_revenue)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              {isUp ? (
                                <TrendingUp size={14} className="text-green-500" />
                              ) : (
                                <TrendingDown size={14} className="text-red-500" />
                              )}
                              <span className={`text-xs font-semibold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                                {isUp ? '+' : ''}{pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {(overview.overview ?? []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-400 text-sm">
                          No demand data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/*  PRODUCT DETAIL                                                 */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {productId && detail && !loading && (
        <>
          {/* Product info */}
          {detail.product && (
            <div className="flex items-center gap-3 anim-fade-up">
              <Badge color="blue" label={detail.product.sku} />
              <span className="text-lg font-semibold text-slate-800 dark:text-[var(--dark-text)]">
                {detail.product.name}
              </span>
            </div>
          )}

          {/* Forecast Line Chart */}
          <Card className="triumph-card anim-fade-up">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <LineChartIcon size={18} className="text-amber-500" />
                <h2 className="text-base font-semibold text-slate-800 dark:text-[var(--dark-text)]">
                  Demand History &amp; Forecast
                </h2>
              </div>
              {chartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
                      <Tooltip formatter={(v) => formatNumber(Number(v))} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        name="Actual"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        name="Forecast"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        dot={{ r: 3 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-400 py-8 text-center">No data available for this product.</p>
              )}
            </div>
          </Card>

          {/* History + Forecast Tables side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* History Table */}
            <Card className="triumph-card anim-fade-up">
              <div className="p-5">
                <h2 className="text-base font-semibold text-slate-800 dark:text-[var(--dark-text)] mb-4">
                  Sales History
                </h2>
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-[var(--dark-card)]">
                      <tr className="border-b border-slate-100 dark:border-[var(--dark-border)]">
                        <th className="text-left py-2 px-3 font-medium text-slate-500 dark:text-[var(--dark-muted)]">Month</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-[var(--dark-muted)]">Qty Sold</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-[var(--dark-muted)]">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.history ?? []).map((r: any) => (
                        <tr key={r.id} className="border-b border-slate-50 dark:border-[var(--dark-border)]">
                          <td className="py-2 px-3 text-slate-700 dark:text-[var(--dark-text)]">
                            {MONTH_FULL[r.period_month - 1]} {r.period_year}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-slate-700 dark:text-[var(--dark-text)]">
                            {formatNumber(r.quantity_sold)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600 dark:text-[var(--dark-muted)]">
                            {formatCurrency(Number(r.revenue))}
                          </td>
                        </tr>
                      ))}
                      {(detail.history ?? []).length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center py-6 text-slate-400 text-sm">No history records</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            {/* Forecast Table */}
            <Card className="triumph-card anim-fade-up">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowRight size={16} className="text-amber-500" />
                  <h2 className="text-base font-semibold text-slate-800 dark:text-[var(--dark-text)]">
                    3-Month Forecast
                  </h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-[var(--dark-border)]">
                      <th className="text-left py-2 px-3 font-medium text-slate-500 dark:text-[var(--dark-muted)]">Month</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-[var(--dark-muted)]">Predicted Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.forecast ?? []).map((f: any, i: number) => (
                      <tr key={i} className="border-b border-slate-50 dark:border-[var(--dark-border)]">
                        <td className="py-2 px-3 text-slate-700 dark:text-[var(--dark-text)]">
                          <Badge color="amber" label="Forecast" className="mr-2" />
                          {MONTH_FULL[f.month - 1]} {f.year}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                          {formatNumber(f.predicted_qty)}
                        </td>
                      </tr>
                    ))}
                    {(detail.forecast ?? []).length === 0 && (
                      <tr>
                        <td colSpan={2} className="text-center py-6 text-slate-400 text-sm">
                          Not enough history for forecast
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/*  ADD DATA MODAL                                                 */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add / Update Demand Record">
        <div className="p-5 space-y-4">
          {/* Product */}
          <div>
            <label className="triumph-label text-sm font-medium mb-1 block">Product</label>
            <select
              className="triumph-input w-full"
              value={form.product_id}
              onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
            >
              <option value="">— Select product —</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>

          {/* Month / Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="triumph-label text-sm font-medium mb-1 block">Month</label>
              <select
                className="triumph-input w-full"
                value={form.period_month}
                onChange={e => setForm(f => ({ ...f, period_month: e.target.value }))}
              >
                {MONTH_FULL.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="triumph-label text-sm font-medium mb-1 block">Year</label>
              <input
                type="number"
                className="triumph-input w-full"
                value={form.period_year}
                onChange={e => setForm(f => ({ ...f, period_year: e.target.value }))}
              />
            </div>
          </div>

          {/* Quantity / Revenue */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="triumph-label text-sm font-medium mb-1 block">Quantity Sold</label>
              <input
                type="number"
                className="triumph-input w-full"
                value={form.quantity_sold}
                onChange={e => setForm(f => ({ ...f, quantity_sold: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="triumph-label text-sm font-medium mb-1 block">Revenue</label>
              <input
                type="number"
                className="triumph-input w-full"
                value={form.revenue}
                onChange={e => setForm(f => ({ ...f, revenue: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Add / Update Record</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

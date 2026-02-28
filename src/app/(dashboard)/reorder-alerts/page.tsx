'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle, Package, TrendingDown, DollarSign,
  Pencil, Settings, Bell, Clock, Truck, BarChart3,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatNumber } from '@/lib/utils';

const PAGE_SIZE = 20;

const EDIT_EMPTY = {
  id: '',
  reorder_point: '',
  reorder_quantity: '',
  lead_time_days: '',
  preferred_supplier_id: '',
};
type EditForm = typeof EDIT_EMPTY;

export default function ReorderAlertsPage() {
  /* ── state ── */
  const [tab, setTab] = useState<'alerts' | 'settings'>('alerts');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* settings table */
  const [settingsPage, setSettingsPage] = useState(1);
  const [settingsSearch, setSettingsSearch] = useState('');

  /* edit modal */
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<EditForm>(EDIT_EMPTY);
  const [saving, setSaving] = useState(false);

  /* suppliers */
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const toast = useToast();

  /* ── fetch suppliers ── */
  useEffect(() => {
    fetch('/api/suppliers')
      .then((r) => r.json())
      .then((j) => setSuppliers(j.data ?? j.suppliers ?? []))
      .catch(() => {});
  }, []);

  /* ── fetch alerts ── */
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reorder-alerts');
      const json = await res.json();
      setAlerts(json.alerts ?? []);
      setSummary(json.summary ?? null);
    } catch {
      toast.error('Error', 'Failed to load reorder alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── fetch settings ── */
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reorder-alerts?action=settings');
      const json = await res.json();
      setSettings(json.items ?? []);
    } catch {
      toast.error('Error', 'Failed to load reorder settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── load on tab change ── */
  useEffect(() => {
    if (tab === 'alerts') fetchAlerts();
    else fetchSettings();
  }, [tab, fetchAlerts, fetchSettings]);

  /* ── edit handlers ── */
  const openEdit = (item: any) => {
    setEditItem(item);
    setEditForm({
      id: String(item.id),
      reorder_point: String(item.reorder_point ?? ''),
      reorder_quantity: String(item.reorder_quantity ?? ''),
      lead_time_days: String(item.lead_time_days ?? ''),
      preferred_supplier_id: String(item.preferred_supplier_id ?? ''),
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editForm.id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/reorder-alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(editForm.id),
          reorder_point: parseInt(editForm.reorder_point) || 0,
          reorder_quantity: parseInt(editForm.reorder_quantity) || 0,
          lead_time_days: parseInt(editForm.lead_time_days) || 0,
          preferred_supplier_id: editForm.preferred_supplier_id ? parseInt(editForm.preferred_supplier_id) : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Updated', `Reorder settings for ${editItem?.name} saved.`);
      setEditOpen(false);
      if (tab === 'alerts') fetchAlerts();
      else fetchSettings();
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const ef = (k: keyof EditForm, v: string) => setEditForm((p) => ({ ...p, [k]: v }));

  /* ── alert severity helper ── */
  const getSeverity = (item: any) => {
    if (Number(item.quantity) === 0) return { label: 'Critical', color: 'red' as const };
    return { label: 'Low Stock', color: 'amber' as const };
  };

  /* ── stock bar width ── */
  const getStockPercent = (item: any) => {
    const qty = Number(item.quantity) || 0;
    const rp = Number(item.reorder_point) || 1;
    return Math.min(Math.max((qty / rp) * 100, 0), 100);
  };

  /* ── KPI cards ── */
  const kpis = summary
    ? [
        { label: 'Total Alerts', value: formatNumber(summary.total_alerts ?? 0), icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
        { label: 'Critical (Out of Stock)', value: formatNumber(summary.critical ?? 0), icon: Package, color: 'text-red-700 dark:text-red-400', bg: 'bg-red-200 dark:bg-red-900/40' },
        { label: 'Low Stock', value: formatNumber(summary.low_stock ?? 0), icon: TrendingDown, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
        { label: 'Total Reorder Value', value: formatCurrency(parseFloat(summary.total_reorder_value) || 0), icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
      ]
    : [];

  /* ── settings columns ── */
  const settingsColumns: Column[] = [
    {
      key: 'name', label: 'Item Name', width: '200px',
      render: (r) => <span className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{r.name}</span>,
    },
    {
      key: 'sku', label: 'SKU', width: '110px',
      render: (r) => <span className="font-mono text-[0.7rem] text-slate-400 dark:text-[var(--dark-text-3)]">{r.sku}</span>,
    },
    {
      key: 'quantity', label: 'Current Stock', align: 'right', width: '110px',
      render: (r) => <span className="text-sm tabular-nums text-slate-700 dark:text-[var(--dark-text)]">{formatNumber(r.quantity ?? 0)}</span>,
    },
    {
      key: 'reorder_point', label: 'Reorder Point', align: 'right', width: '120px',
      render: (r) => (
        <span className="text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">{formatNumber(r.reorder_point ?? 0)}</span>
      ),
    },
    {
      key: 'reorder_quantity', label: 'Reorder Qty', align: 'right', width: '110px',
      render: (r) => <span className="text-sm tabular-nums text-slate-600 dark:text-[var(--dark-text-2)]">{formatNumber(r.reorder_quantity ?? 0)}</span>,
    },
    {
      key: 'lead_time_days', label: 'Lead Time', align: 'center', width: '100px',
      render: (r) => (
        <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">
          {r.lead_time_days ? `${r.lead_time_days} days` : '—'}
        </span>
      ),
    },
    {
      key: 'supplier_name', label: 'Preferred Supplier', width: '160px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-2)]">{r.supplier_name ?? '—'}</span>,
    },
    {
      key: 'actions', label: '', width: '60px', sortable: false, align: 'right',
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); openEdit(r); }}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
          title="Edit settings"
        >
          <Pencil size={13} />
        </button>
      ),
    },
  ];

  /* ── filtered settings for search ── */
  const filteredSettings = settingsSearch
    ? settings.filter(
        (s) =>
          s.name?.toLowerCase().includes(settingsSearch.toLowerCase()) ||
          s.sku?.toLowerCase().includes(settingsSearch.toLowerCase()),
      )
    : settings;

  return (
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 anim-fade-up anim-d1">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Bell size={20} className="text-red-500" /> Reorder Alerts
          </h1>
          <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">
            Monitor stock levels and manage reorder settings
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-[var(--dark-surface)] rounded-lg p-0.5">
          {(['alerts', 'settings'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === t
                  ? 'bg-white dark:bg-[var(--dark-bg)] text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-[var(--dark-text-3)] hover:text-slate-700 dark:hover:text-[var(--dark-text)]'
              }`}
            >
              {t === 'alerts' ? (
                <span className="flex items-center gap-1.5"><AlertTriangle size={12} /> Alerts</span>
              ) : (
                <span className="flex items-center gap-1.5"><Settings size={12} /> Settings</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════ ALERTS TAB ══════════════ */}
      {tab === 'alerts' && (
        <>
          {/* ── KPIs ── */}
          {kpis.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpis.map((k, i) => {
                const Icon = k.icon;
                return (
                  <div key={k.label} className={`triumph-card p-4 flex items-center gap-3 anim-fade-up anim-d${Math.min(i + 1, 6)}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.bg}`}>
                      <Icon size={18} className={k.color} />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{k.value}</p>
                      <p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">{k.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Alert Cards ── */}
          {loading ? (
            <div className="triumph-card p-12 text-center">
              <div className="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 mt-2">Loading alerts…</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="triumph-card p-12 text-center anim-fade-up anim-d3">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-sm font-medium text-slate-600 dark:text-[var(--dark-text)]">All stock levels are healthy</p>
              <p className="text-xs text-slate-400 dark:text-[var(--dark-text-3)] mt-1">No items are at or below their reorder point.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {alerts.map((item, i) => {
                const severity = getSeverity(item);
                const pct = getStockPercent(item);
                const deficit = Number(item.deficit) || 0;
                return (
                  <div
                    key={item.id}
                    className={`triumph-card p-4 space-y-3 anim-fade-up anim-d${Math.min(i + 1, 6)} border-l-[3px] ${
                      severity.color === 'red'
                        ? 'border-l-red-500'
                        : 'border-l-amber-400'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{item.name}</p>
                        <p className="font-mono text-[0.65rem] text-slate-400 dark:text-[var(--dark-text-3)]">{item.sku}</p>
                      </div>
                      <Badge color={severity.color} label={severity.label} />
                    </div>

                    {/* Stock bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">
                          Stock: <span className="font-semibold text-slate-700 dark:text-[var(--dark-text)]">{formatNumber(item.quantity ?? 0)}</span>
                        </span>
                        <span className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">
                          Reorder Point: <span className="font-semibold">{formatNumber(item.reorder_point)}</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-[var(--dark-surface)] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            severity.color === 'red' ? 'bg-red-500' : 'bg-amber-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Detail grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[0.7rem]">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-[var(--dark-text-3)]">
                        <TrendingDown size={11} className="text-red-400 flex-shrink-0" />
                        <span>Deficit: <span className="font-semibold text-red-600 dark:text-red-400">{formatNumber(deficit)}</span></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-[var(--dark-text-3)]">
                        <BarChart3 size={11} className="text-blue-400 flex-shrink-0" />
                        <span>Reorder Qty: <span className="font-semibold text-slate-700 dark:text-[var(--dark-text)]">{formatNumber(item.reorder_quantity ?? 0)}</span></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-[var(--dark-text-3)]">
                        <Clock size={11} className="text-purple-400 flex-shrink-0" />
                        <span>Lead Time: <span className="font-semibold text-slate-700 dark:text-[var(--dark-text)]">{item.lead_time_days ? `${item.lead_time_days}d` : '—'}</span></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-[var(--dark-text-3)]">
                        <Truck size={11} className="text-green-400 flex-shrink-0" />
                        <span className="truncate">Supplier: <span className="font-semibold text-slate-700 dark:text-[var(--dark-text)]">{item.supplier_name ?? '—'}</span></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════ SETTINGS TAB ══════════════ */}
      {tab === 'settings' && (
        <DataTable
          columns={settingsColumns}
          data={filteredSettings.slice((settingsPage - 1) * PAGE_SIZE, settingsPage * PAGE_SIZE)}
          total={filteredSettings.length}
          page={settingsPage}
          pageSize={PAGE_SIZE}
          loading={loading}
          search={settingsSearch}
          onSearchChange={(v) => { setSettingsSearch(v); setSettingsPage(1); }}
          onPageChange={setSettingsPage}
          onRowDoubleClick={openEdit}
          searchPlaceholder="Search items by name or SKU…"
          emptyIcon="📦"
          emptyText="No inventory items found."
        />
      )}

      {/* ── Edit Modal ── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Edit Reorder Settings — ${editItem?.name ?? ''}`} size="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">Reorder Point *</label>
            <input
              type="number"
              min="0"
              className="triumph-input"
              value={editForm.reorder_point}
              onChange={(e) => ef('reorder_point', e.target.value)}
              placeholder="Minimum stock level"
            />
            <p className="text-[0.6rem] text-slate-400 mt-0.5">Alert triggers when stock falls to this level</p>
          </div>
          <div>
            <label className="triumph-label">Reorder Quantity *</label>
            <input
              type="number"
              min="0"
              className="triumph-input"
              value={editForm.reorder_quantity}
              onChange={(e) => ef('reorder_quantity', e.target.value)}
              placeholder="Qty to reorder"
            />
            <p className="text-[0.6rem] text-slate-400 mt-0.5">Recommended quantity to order</p>
          </div>
          <div>
            <label className="triumph-label">Lead Time (days)</label>
            <input
              type="number"
              min="0"
              className="triumph-input"
              value={editForm.lead_time_days}
              onChange={(e) => ef('lead_time_days', e.target.value)}
              placeholder="e.g. 7"
            />
            <p className="text-[0.6rem] text-slate-400 mt-0.5">Expected delivery time from supplier</p>
          </div>
          <div>
            <label className="triumph-label">Preferred Supplier</label>
            <select
              className="triumph-input"
              value={editForm.preferred_supplier_id}
              onChange={(e) => ef('preferred_supplier_id', e.target.value)}
            >
              <option value="">— None —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} loading={saving}>Save Changes</Button>
        </div>
      </Modal>
    </div>
  );
}

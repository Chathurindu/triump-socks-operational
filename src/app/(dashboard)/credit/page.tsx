'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Users, CreditCard, ShieldAlert, Ban, DollarSign,
  Pencil, Clock, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import { Card } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

type Tab = 'overview' | 'aging' | 'history';

type EditForm = {
  id: string; credit_limit: string; credit_status: string; payment_terms: string; notes: string;
};

const EMPTY_FORM: EditForm = {
  id: '', credit_limit: '', credit_status: 'active', payment_terms: '30', notes: '',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'green', on_hold: 'amber', blocked: 'red', vip: 'purple',
};

export default function CreditPage() {
  const [tab, setTab] = useState<Tab>('overview');

  /* ── Overview ───────────────────────── */
  const [customers, setCustomers]   = useState<any[]>([]);
  const [summary, setSummary]       = useState<any>(null);
  const [loading, setLoading]       = useState(true);

  /* ── Edit Modal ───────────────────── */
  const [editOpen, setEditOpen]     = useState(false);
  const [form, setForm]             = useState<EditForm>({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);

  /* ── Aging ──────────────────────────── */
  const [agingRows, setAgingRows]       = useState<any[]>([]);
  const [agingSummary, setAgingSummary] = useState<any>(null);
  const [agingLoading, setAgingLoading] = useState(true);

  /* ── History ────────────────────────── */
  const [historyRows, setHistoryRows]         = useState<any[]>([]);
  const [historyLoading, setHistoryLoading]   = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');

  const toast = useToast();

  /* ── Fetch overview ─────────────────── */
  const fetchOverview = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/credit');
    const json = await res.json();
    setCustomers(json.rows ?? []);
    setSummary(json.summary ?? null);
    setLoading(false);
  }, []);

  /* ── Fetch aging ────────────────────── */
  const fetchAging = useCallback(async () => {
    setAgingLoading(true);
    const res = await fetch('/api/credit?aging=1');
    const json = await res.json();
    const rows = json.rows ?? [];
    setAgingRows(rows);
    const totals = rows.reduce(
      (acc: any, r: any) => ({
        current: acc.current + Number(r.current_due ?? 0),
        d30: acc.d30 + Number(r.days_30 ?? 0),
        d60: acc.d60 + Number(r.days_60 ?? 0),
        d90: acc.d90 + Number(r.days_90 ?? 0),
        over90: acc.over90 + Number(r.over_90 ?? 0),
      }),
      { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 },
    );
    setAgingSummary(totals);
    setAgingLoading(false);
  }, []);

  /* ── Fetch history ──────────────────── */
  const fetchHistory = useCallback(async (custId: string) => {
    if (!custId) { setHistoryRows([]); return; }
    setHistoryLoading(true);
    const res = await fetch(`/api/credit?history=${custId}`);
    const json = await res.json();
    setHistoryRows(json.rows ?? []);
    setHistoryLoading(false);
  }, []);

  /* ── Effects ────────────────────────── */
  useEffect(() => { if (tab === 'overview') fetchOverview(); }, [tab, fetchOverview]);
  useEffect(() => { if (tab === 'aging') fetchAging(); }, [tab, fetchAging]);
  useEffect(() => { if (tab === 'history' && selectedCustomer) fetchHistory(selectedCustomer); }, [tab, selectedCustomer, fetchHistory]);

  /* ── Edit helpers ───────────────────── */
  const openEdit = (row: any) => {
    setForm({
      id: String(row.id),
      credit_limit: String(row.credit_limit ?? ''),
      credit_status: row.credit_status ?? 'active',
      payment_terms: String(row.payment_terms ?? 30),
      notes: '',
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.credit_limit || isNaN(+form.credit_limit)) { toast.warning('Validation', 'Valid credit limit is required.'); return; }
    if (!form.payment_terms || isNaN(+form.payment_terms)) { toast.warning('Validation', 'Valid payment terms is required.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/credit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          credit_limit: Number(form.credit_limit),
          credit_status: form.credit_status,
          payment_terms: Number(form.payment_terms),
          notes: form.notes,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Updated', 'Credit settings updated successfully.');
      setEditOpen(false);
      fetchOverview();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  const f = (k: keyof EditForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  /* ── Columns: Overview ──────────────── */
  const overviewColumns: Column[] = [
    { key: 'name', label: 'Customer', sortable: true,
      render: r => <span className="text-xs font-medium text-slate-700 dark:text-[var(--dark-text)] truncate block max-w-[180px]">{r.name}</span> },
    { key: 'credit_limit', label: 'Credit Limit', width: '120px', align: 'right', sortable: true,
      render: r => <span className="text-xs tabular-nums font-semibold">{formatCurrency(Number(r.credit_limit ?? 0))}</span> },
    { key: 'credit_used', label: 'Credit Used', width: '120px', align: 'right', sortable: true,
      render: r => <span className="text-xs tabular-nums text-slate-500">{formatCurrency(Number(r.credit_used ?? 0))}</span> },
    { key: 'available', label: 'Available', width: '120px', align: 'right',
      render: r => {
        const avail = Number(r.credit_limit ?? 0) - Number(r.credit_used ?? 0);
        return <span className={`text-xs tabular-nums font-semibold ${avail < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{formatCurrency(avail)}</span>;
      } },
    { key: 'credit_status', label: 'Status', width: '100px',
      render: r => <Badge label={(r.credit_status ?? 'active').replace('_', ' ')} color={(STATUS_COLORS[r.credit_status] ?? 'gray') as 'green' | 'amber' | 'red' | 'purple' | 'gray'} /> },
    { key: 'payment_terms', label: 'Terms', width: '80px', align: 'center',
      render: r => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.payment_terms ?? 30} days</span> },
    { key: 'actions', label: '', width: '50px', sortable: false, align: 'right',
      render: r => (
        <button onClick={e => { e.stopPropagation(); openEdit(r); }}
          className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Edit">
          <Pencil size={11} />
        </button>
      ) },
  ];

  /* ── Columns: Aging ─────────────────── */
  const agingColumns: Column[] = [
    { key: 'name', label: 'Customer', sortable: true,
      render: r => <span className="text-xs font-medium text-slate-700 dark:text-[var(--dark-text)] truncate block max-w-[160px]">{r.name}</span> },
    { key: 'current_due', label: 'Current', width: '110px', align: 'right',
      render: r => <span className="text-xs tabular-nums text-green-600 dark:text-green-400">{formatCurrency(Number(r.current_due ?? 0))}</span> },
    { key: 'days_30', label: '1-30 Days', width: '110px', align: 'right',
      render: r => <span className="text-xs tabular-nums text-amber-600 dark:text-amber-400">{formatCurrency(Number(r.days_30 ?? 0))}</span> },
    { key: 'days_60', label: '31-60 Days', width: '110px', align: 'right',
      render: r => <span className="text-xs tabular-nums text-orange-600 dark:text-orange-400">{formatCurrency(Number(r.days_60 ?? 0))}</span> },
    { key: 'days_90', label: '61-90 Days', width: '110px', align: 'right',
      render: r => <span className="text-xs tabular-nums text-red-500 dark:text-red-400">{formatCurrency(Number(r.days_90 ?? 0))}</span> },
    { key: 'over_90', label: 'Over 90 Days', width: '110px', align: 'right',
      render: r => <span className="text-xs tabular-nums font-semibold text-red-700 dark:text-red-300">{formatCurrency(Number(r.over_90 ?? 0))}</span> },
  ];

  /* ── Columns: History ───────────────── */
  const historyColumns: Column[] = [
    { key: 'created_at', label: 'Date', width: '110px', sortable: true,
      render: r => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{formatDate(r.created_at)}</span> },
    { key: 'event_type', label: 'Event', width: '130px',
      render: r => <Badge label={(r.event_type ?? '').replace(/_/g, ' ')} color={r.event_type === 'limit_change' ? 'blue' : r.event_type === 'payment' ? 'green' : 'gray'} /> },
    { key: 'amount', label: 'Amount', width: '120px', align: 'right',
      render: r => <span className="text-xs tabular-nums font-semibold">{formatCurrency(Number(r.amount ?? 0))}</span> },
    { key: 'balance_after', label: 'Balance After', width: '120px', align: 'right',
      render: r => <span className="text-xs tabular-nums text-slate-500">{formatCurrency(Number(r.balance_after ?? 0))}</span> },
    { key: 'reference', label: 'Reference',
      render: r => <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)] truncate block max-w-[180px]">{r.reference ?? '—'}</span> },
    { key: 'notes', label: 'Notes',
      render: r => <span className="text-xs text-slate-400 truncate block max-w-[180px]">{r.notes ?? '—'}</span> },
  ];

  /* ── KPIs ───────────────────────────── */
  const totalCustomers = customers.length;
  const activeCount  = customers.filter(c => c.credit_status === 'active').length;
  const holdCount    = customers.filter(c => c.credit_status === 'on_hold').length;
  const blockedCount = customers.filter(c => c.credit_status === 'blocked').length;
  const totalOutstanding = customers.reduce((s, c) => s + Number(c.outstanding ?? 0), 0);

  const kpis = [
    { label: 'Total Customers', value: totalCustomers,                  icon: Users,        color: 'text-blue-500',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Active Credit',   value: activeCount,                     icon: CheckCircle,  color: 'text-green-500',  bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'On Hold',         value: holdCount,                       icon: ShieldAlert,  color: 'text-amber-500',  bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Blocked',         value: blockedCount,                    icon: Ban,          color: 'text-red-500',    bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Total Outstanding', value: formatCurrency(totalOutstanding), icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  ];

  /* ── Aging KPI cards ────────────────── */
  const agingKpis = agingSummary ? [
    { label: 'Current',       value: formatCurrency(agingSummary.current), icon: CheckCircle,   color: 'text-green-500',  bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: '1-30 Days',     value: formatCurrency(agingSummary.d30),     icon: Clock,          color: 'text-amber-500',  bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: '31-60 Days',    value: formatCurrency(agingSummary.d60),     icon: Clock,          color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { label: '61-90 Days',    value: formatCurrency(agingSummary.d90),     icon: AlertTriangle,  color: 'text-red-500',    bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Over 90 Days',  value: formatCurrency(agingSummary.over90),  icon: Ban,            color: 'text-red-700',    bg: 'bg-red-200 dark:bg-red-900/40' },
  ] : [];

  /* ── Aging chart data ───────────────── */
  const agingChartData = agingSummary ? [
    { bucket: 'Current',  amount: agingSummary.current },
    { bucket: '1-30',     amount: agingSummary.d30 },
    { bucket: '31-60',    amount: agingSummary.d60 },
    { bucket: '61-90',    amount: agingSummary.d90 },
    { bucket: '90+',      amount: agingSummary.over90 },
  ] : [];

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'aging',    label: 'Aging Report' },
    { key: 'history',  label: 'History' },
  ];

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 dark:bg-[var(--dark-surface)] p-1 rounded-lg w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === t.key ? 'bg-white dark:bg-[var(--dark-bg)] text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-[var(--dark-text-3)] hover:text-slate-700 dark:hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ OVERVIEW TAB ══════════ */}
      {tab === 'overview' && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {kpis.map((k, i) => { const Icon = k.icon; return (
              <div key={k.label} className={`triumph-card p-4 flex items-center gap-3 anim-fade-up anim-d${Math.min(i + 1, 6)}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.bg}`}><Icon size={18} className={k.color} /></div>
                <div><p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{k.value}</p><p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">{k.label}</p></div>
              </div>
            ); })}
          </div>

          {/* Customer DataTable */}
          <DataTable columns={overviewColumns} data={customers} total={customers.length} page={1} pageSize={customers.length || 1} loading={loading}
            onPageChange={() => {}} searchPlaceholder="Search customers…" emptyIcon="💳" emptyText="No customers found."
            onRowDoubleClick={openEdit}
          />
        </>
      )}

      {/* ══════════ AGING TAB ══════════ */}
      {tab === 'aging' && (
        <>
          {/* Summary cards */}
          {agingKpis.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {agingKpis.map((k, i) => { const Icon = k.icon; return (
                <div key={k.label} className={`triumph-card p-4 flex items-center gap-3 anim-fade-up anim-d${Math.min(i + 1, 6)}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.bg}`}><Icon size={18} className={k.color} /></div>
                  <div><p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{k.value}</p><p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">{k.label}</p></div>
                </div>
              ); })}
            </div>
          )}

          {/* Aging bar chart */}
          {agingChartData.length > 0 && (
            <Card title="Aging Breakdown" className="anim-fade-up">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={agingChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Amount" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Aging DataTable */}
          <DataTable columns={agingColumns} data={agingRows} total={agingRows.length} page={1} pageSize={agingRows.length || 1} loading={agingLoading}
            onPageChange={() => {}} searchPlaceholder="Search customers…" emptyIcon="📊" emptyText="No aging data found."
          />
        </>
      )}

      {/* ══════════ HISTORY TAB ══════════ */}
      {tab === 'history' && (
        <>
          <div className="triumph-card p-4 anim-fade-up">
            <label className="triumph-label">Select Customer</label>
            <select className="triumph-input max-w-sm" value={selectedCustomer}
              onChange={e => { setSelectedCustomer(e.target.value); fetchHistory(e.target.value); }}>
              <option value="">— Choose a customer —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {selectedCustomer && (
            <DataTable columns={historyColumns} data={historyRows} total={historyRows.length} page={1} pageSize={historyRows.length || 1} loading={historyLoading}
              onPageChange={() => {}} searchPlaceholder="Search history…" emptyIcon="📜" emptyText="No credit history for this customer."
            />
          )}
        </>
      )}

      {/* ══════════ EDIT MODAL ══════════ */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Credit Settings" size="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">Credit Limit *</label>
            <input type="number" className="triumph-input" value={form.credit_limit} onChange={e => f('credit_limit', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="triumph-label">Credit Status *</label>
            <select className="triumph-input" value={form.credit_status} onChange={e => f('credit_status', e.target.value)}>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="blocked">Blocked</option>
              <option value="vip">VIP</option>
            </select>
          </div>
          <div>
            <label className="triumph-label">Payment Terms (days) *</label>
            <input type="number" className="triumph-input" value={form.payment_terms} onChange={e => f('payment_terms', e.target.value)} placeholder="30" />
          </div>
          <div className="sm:col-span-2">
            <label className="triumph-label">Notes</label>
            <textarea className="triumph-input resize-none" rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Reason for change…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} loading={saving}>Update</Button>
        </div>
      </Modal>
    </div>
  );
}

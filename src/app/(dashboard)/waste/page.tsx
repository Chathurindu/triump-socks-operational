'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, AlertTriangle, Package, DollarSign,
  PieChart as PieIcon, Pencil, Trash2, BarChart3,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import { Card } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatCurrency, getMonthName } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const PAGE_SIZE = 15;

const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#6b7280'];

const WASTE_TYPES = [
  { value: '',               label: 'All' },
  { value: 'damage',         label: 'Damage' },
  { value: 'defect',         label: 'Defect' },
  { value: 'material_waste', label: 'Material Waste' },
  { value: 'rework',         label: 'Rework' },
  { value: 'other',          label: 'Other' },
];

type BadgeColor = 'amber' | 'blue' | 'green' | 'red' | 'gray' | 'purple';
const TYPE_COLORS: Record<string, BadgeColor> = {
  damage: 'red',
  defect: 'amber',
  material_waste: 'blue',
  rework: 'purple',
  other: 'gray',
};

type FormData = {
  production_order_id: string; product_id: string; waste_type: string;
  quantity: string; unit_cost: string; cause: string; machine_id: string;
  reported_by: string; waste_date: string; notes: string;
};

const EMPTY: FormData = {
  production_order_id: '', product_id: '', waste_type: 'damage',
  quantity: '', unit_cost: '', cause: '', machine_id: '',
  reported_by: '', waste_date: new Date().toISOString().slice(0, 10), notes: '',
};

export default function WastePage() {
  const [data, setData]       = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState<FormData>({ ...EMPTY });
  const [saving, setSaving]     = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  // Meta
  const [productionOrders, setProductionOrders] = useState<any[]>([]);
  const [products, setProducts]                 = useState<any[]>([]);
  const [machines, setMachines]                 = useState<any[]>([]);
  const [employees, setEmployees]               = useState<any[]>([]);

  // Report
  const [showReport, setShowReport]       = useState(false);
  const [reportYear, setReportYear]       = useState(new Date().getFullYear());
  const [report, setReport]               = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const toast = useToast();

  useEffect(() => {
    fetch('/api/waste?meta=1').then(r => r.json()).then(j => {
      setProductionOrders(j.productionOrders ?? []);
      setProducts(j.products ?? []);
      setMachines(j.machines ?? []);
      setEmployees(j.employees ?? []);
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, waste_type: typeFilter,
    });
    const res = await fetch(`/api/waste?${qs}`);
    const json = await res.json();
    setData(json.rows ?? []);
    setTotal(json.total ?? 0);
    setSummary(json.summary ?? null);
    setLoading(false);
  }, [page, search, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    const res = await fetch(`/api/waste?report=1&year=${reportYear}`);
    const json = await res.json();
    setReport(json);
    setReportLoading(false);
  }, [reportYear]);

  useEffect(() => { if (showReport) fetchReport(); }, [showReport, fetchReport]);

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };

  const openAdd = () => { setEditId(null); setForm({ ...EMPTY }); setFormOpen(true); };
  const openEdit = (row: any) => {
    setEditId(row.id);
    setForm({
      production_order_id: row.production_order_id ? String(row.production_order_id) : '',
      product_id: row.product_id ? String(row.product_id) : '',
      waste_type: row.waste_type ?? 'damage',
      quantity: String(row.quantity ?? ''),
      unit_cost: String(row.unit_cost ?? ''),
      cause: row.cause ?? '',
      machine_id: row.machine_id ? String(row.machine_id) : '',
      reported_by: row.reported_by ? String(row.reported_by) : '',
      waste_date: row.waste_date?.slice(0, 10) ?? '',
      notes: row.notes ?? '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.quantity || isNaN(+form.quantity)) { toast.warning('Validation', 'Valid quantity is required.'); return; }
    if (!form.unit_cost || isNaN(+form.unit_cost)) { toast.warning('Validation', 'Valid unit cost is required.'); return; }
    setSaving(true);
    try {
      const method = editId ? 'PATCH' : 'POST';
      const body = editId
        ? { id: editId, ...form, quantity: Number(form.quantity), unit_cost: Number(form.unit_cost) }
        : { ...form, quantity: Number(form.quantity), unit_cost: Number(form.unit_cost) };
      const res = await fetch('/api/waste', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editId ? 'Updated' : 'Created', `Waste record ${editId ? 'updated' : 'logged'} successfully.`);
      setFormOpen(false);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/waste', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', 'Waste record deleted.');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setDeleting(false); }
  };

  const f = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }));

  const columns: Column[] = [
    { key: 'waste_date', label: 'Date', width: '95px', sortable: true,
      render: r => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{formatDate(r.waste_date)}</span> },
    { key: 'product_name', label: 'Product', sortable: true,
      render: r => <span className="text-xs text-slate-600 dark:text-[var(--dark-text)] truncate block max-w-[160px]">{r.product_name ?? '—'}</span> },
    { key: 'waste_type', label: 'Type', width: '120px',
      render: r => <Badge label={(r.waste_type ?? '').replace('_', ' ')} color={TYPE_COLORS[r.waste_type] ?? 'gray'} /> },
    { key: 'quantity', label: 'Qty', width: '70px', align: 'right',
      render: r => <span className="text-xs font-semibold tabular-nums">{r.quantity}</span> },
    { key: 'unit_cost', label: 'Unit Cost', width: '100px', align: 'right',
      render: r => <span className="text-xs tabular-nums text-slate-500">{formatCurrency(r.unit_cost)}</span> },
    { key: 'total_cost', label: 'Total Cost', width: '110px', align: 'right',
      render: r => <span className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">{formatCurrency(r.total_cost)}</span> },
    { key: 'cause', label: 'Cause', width: '130px',
      render: r => <span className="text-xs text-slate-400 truncate block max-w-[120px]">{r.cause ?? '—'}</span> },
    { key: 'reported_by_name', label: 'Reported By', width: '120px',
      render: r => <span className="text-xs text-slate-500 truncate block max-w-[110px]">{r.reported_by_name ?? '—'}</span> },
    { key: 'actions', label: '', width: '70px', sortable: false, align: 'right',
      render: r => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={e => { e.stopPropagation(); openEdit(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Edit"><Pencil size={11} /></button>
          <button onClick={e => { e.stopPropagation(); setDeleteTarget(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete"><Trash2 size={11} /></button>
        </div>
      ) },
  ];

  const kpis = summary ? [
    { label: 'Total Records',  value: summary.total,                                        icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Total Quantity',  value: summary.total_qty ?? 0,                               icon: Package,       color: 'text-amber-500',  bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Total Cost',     value: formatCurrency(parseFloat(summary.total_cost ?? 0)),   icon: DollarSign,    color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Damage / Defect', value: `${summary.damage_count ?? 0} / ${summary.defect_count ?? 0}`, icon: PieIcon, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  ] : [];

  // Build monthly chart data (12 months)
  const monthlyChartData = Array.from({ length: 12 }, (_, i) => ({
    month: getMonthName(i + 1).slice(0, 3),
    cost: parseFloat(report?.monthly?.find((m: any) => m.month === i + 1)?.cost ?? 0),
  }));

  // By type pie data
  const byTypeData = (report?.byType ?? []).map((t: any) => ({
    name: (t.waste_type ?? '').replace('_', ' '),
    value: parseFloat(t.cost ?? 0),
  }));

  // By cause top 5 horizontal bar
  const byCauseData = (report?.byCause ?? []).slice(0, 5).map((c: any) => ({
    cause: c.cause ?? 'Unknown',
    cost: parseFloat(c.cost ?? 0),
  }));

  return (
    <div className="space-y-4">
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map((k, i) => { const Icon = k.icon; return (
            <div key={k.label} className={`triumph-card p-4 flex items-center gap-3 anim-fade-up anim-d${Math.min(i + 1, 6)}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.bg}`}><Icon size={18} className={k.color} /></div>
              <div><p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{k.value}</p><p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">{k.label}</p></div>
            </div>
          ); })}
        </div>
      )}

      {/* Report Toggle */}
      <div className="flex justify-end">
        <Button variant={showReport ? 'primary' : 'outline'} size="sm" icon={<BarChart3 size={13} />}
          onClick={() => setShowReport(p => !p)}>
          {showReport ? 'Hide Report' : 'Waste Report'}
        </Button>
      </div>

      {/* Report Section */}
      {showReport && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 anim-fade-up">
          {/* Monthly Waste Cost */}
          <Card title={`Monthly Waste Cost — ${reportYear}`} className="lg:col-span-2"
            action={
              <div className="flex items-center gap-1">
                <button onClick={() => setReportYear(y => y - 1)} className="text-xs px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-[var(--dark-surface)] transition-colors">&larr;</button>
                <span className="text-xs font-semibold text-slate-600 dark:text-white">{reportYear}</span>
                <button onClick={() => setReportYear(y => y + 1)} className="text-xs px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-[var(--dark-surface)] transition-colors">&rarr;</button>
              </div>
            }>
            {reportLoading ? (
              <div className="flex items-center justify-center h-40"><div className="animate-spin w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="cost" fill="#ef4444" radius={[3, 3, 0, 0]} name="Waste Cost" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* By Type Pie */}
          <Card title="By Type">
            {reportLoading ? (
              <div className="flex items-center justify-center h-40"><div className="animate-spin w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full" /></div>
            ) : byTypeData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={byTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                    label={({ name, percent }: any) => `${(name ?? '').split(' ')[0]} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false} style={{ fontSize: 9 }}>
                    {byTypeData.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-slate-400 text-center py-8">No data for this year.</p>}
          </Card>

          {/* By Cause Top 5 horizontal bar */}
          <Card title="Top Causes" className="lg:col-span-3">
            {reportLoading ? (
              <div className="flex items-center justify-center h-40"><div className="animate-spin w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full" /></div>
            ) : byCauseData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byCauseData} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="cause" tick={{ fontSize: 10 }} width={55} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="cost" fill="#f59e0b" radius={[0, 3, 3, 0]} name="Cost" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-slate-400 text-center py-8">No cause data for this year.</p>}
          </Card>
        </div>
      )}

      <DataTable columns={columns} data={data} total={total} page={page} pageSize={PAGE_SIZE} loading={loading}
        search={search} onSearchChange={handleSearchChange} onPageChange={setPage}
        searchPlaceholder="Search waste records…" emptyIcon="🗑️" emptyText="No waste records found."
        onRowDoubleClick={openEdit}
        toolbar={<>
          <div className="flex gap-1 flex-wrap">
            {WASTE_TYPES.map(t => (
              <button key={t.value} onClick={() => { setTypeFilter(t.value); setPage(1); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${typeFilter === t.value ? 'bg-red-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'}`}>{t.label}</button>
            ))}
          </div>
          <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>Log Waste</Button>
        </>}
      />

      {/* Form Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? 'Edit Waste Record' : 'Log Waste'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">Production Order</label>
            <select className="triumph-input" value={form.production_order_id} onChange={e => f('production_order_id', e.target.value)}>
              <option value="">— Select —</option>
              {productionOrders.map(po => <option key={po.id} value={po.id}>{po.order_number}{po.product_name ? ` — ${po.product_name}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Product *</label>
            <select className="triumph-input" value={form.product_id} onChange={e => f('product_id', e.target.value)}>
              <option value="">— Select —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Waste Type *</label>
            <select className="triumph-input" value={form.waste_type} onChange={e => f('waste_type', e.target.value)}>
              <option value="damage">Damage</option>
              <option value="defect">Defect</option>
              <option value="material_waste">Material Waste</option>
              <option value="rework">Rework</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div><label className="triumph-label">Quantity *</label><input type="number" className="triumph-input" value={form.quantity} onChange={e => f('quantity', e.target.value)} placeholder="0" /></div>
          <div><label className="triumph-label">Unit Cost *</label><input type="number" step="0.01" className="triumph-input" value={form.unit_cost} onChange={e => f('unit_cost', e.target.value)} placeholder="0.00" /></div>
          <div><label className="triumph-label">Cause</label><input className="triumph-input" value={form.cause} onChange={e => f('cause', e.target.value)} placeholder="e.g. Machine fault, Operator error" /></div>
          <div>
            <label className="triumph-label">Machine</label>
            <select className="triumph-input" value={form.machine_id} onChange={e => f('machine_id', e.target.value)}>
              <option value="">— Select —</option>
              {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Reported By</label>
            <select className="triumph-input" value={form.reported_by} onChange={e => f('reported_by', e.target.value)}>
              <option value="">— Select —</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div><label className="triumph-label">Waste Date *</label><input type="date" className="triumph-input" value={form.waste_date} onChange={e => f('waste_date', e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="triumph-label">Notes</label><textarea className="triumph-input resize-none" rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} loading={saving}>{editId ? 'Update' : 'Log Waste'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        variant="danger" title="Delete Waste Record?" message={`Delete this waste record of ${formatCurrency(parseFloat(deleteTarget?.total_cost ?? 0))}? This action cannot be undone.`}
        confirmLabel="Delete" loading={deleting} />
    </div>
  );
}

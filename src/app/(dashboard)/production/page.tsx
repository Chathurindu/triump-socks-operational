'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, ClipboardList, Cog, CheckCircle2, Target, BarChart3,
  Pencil, Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatNumber } from '@/lib/utils';

const PAGE_SIZE = 15;

const STATUS_TABS = [
  { value: '',            label: 'All' },
  { value: 'planned',     label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
];

const EMPTY_FORM = {
  product_id: '', quantity: '', produced_qty: '0', status: 'planned',
  start_date: '', end_date: '', machine_id: '', supervisor_id: '', notes: '',
};
type FormData = typeof EMPTY_FORM;

export default function ProductionPage() {
  /* ── state ── */
  const [data, setData]               = useState<any[]>([]);
  const [total, setTotal]             = useState(0);
  const [summary, setSummary]         = useState<any>(null);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [page, setPage]               = useState(1);
  const [sortKey, setSortKey]         = useState('created_at');
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading]         = useState(true);

  /* form / modal */
  const [formOpen, setFormOpen]       = useState(false);
  const [editItem, setEditItem]       = useState<any>(null);
  const [form, setForm]               = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);

  /* delete */
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  /* meta */
  const [products, setProducts]       = useState<any[]>([]);
  const [machines, setMachines]       = useState<any[]>([]);
  const [employees, setEmployees]     = useState<any[]>([]);

  const toast = useToast();

  /* ── load meta ── */
  useEffect(() => {
    fetch('/api/production?meta=1')
      .then((r) => r.json())
      .then((j) => {
        setProducts(j.products ?? []);
        setMachines(j.machines ?? []);
        setEmployees(j.employees ?? []);
      });
  }, []);

  /* ── fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      status: statusFilter, search,
      sortKey, sortDir,
    });
    const res = await fetch(`/api/production?${qs}`);
    const json = await res.json();
    setData(json.data ?? []);
    setTotal(json.total ?? 0);
    setSummary(json.summary ?? null);
    setLoading(false);
  }, [page, statusFilter, search, sortKey, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── handlers ── */
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleStatusChange = (v: string) => { setStatus(v); setPage(1); };
  const handleSortChange   = (key: string, dir: 'asc' | 'desc') => { setSortKey(key); setSortDir(dir); setPage(1); };

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (row: any) => {
    setEditItem(row);
    setForm({
      product_id:   row.product_id ?? '',
      quantity:     String(row.quantity ?? ''),
      produced_qty: String(row.produced_qty ?? '0'),
      status:       row.status ?? 'planned',
      start_date:   row.start_date ? String(row.start_date).slice(0, 10) : '',
      end_date:     row.end_date ? String(row.end_date).slice(0, 10) : '',
      machine_id:   row.machine_id ?? '',
      supervisor_id: row.supervisor_id ?? '',
      notes:        row.notes ?? '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.product_id) { toast.warning('Validation', 'Please select a product.'); return; }
    if (!form.quantity || parseInt(form.quantity) <= 0) { toast.warning('Validation', 'Quantity must be greater than 0.'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity: parseInt(form.quantity) || 0,
        produced_qty: parseInt(form.produced_qty) || 0,
        ...(editItem ? { id: editItem.id } : {}),
      };
      const res = await fetch('/api/production', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');

      toast.success(
        editItem ? 'Order Updated' : 'Order Created',
        editItem ? `Production order updated successfully.` : `New production order created.`,
      );
      setFormOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/production?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', `Order ${deleteTarget.order_number} has been deleted.`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const f = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  /* ── columns ── */
  const columns: Column[] = [
    {
      key: 'order_number', label: 'Order #', width: '130px',
      render: (r) => <span className="font-mono text-[0.7rem] text-amber-700 dark:text-amber-400">{r.order_number}</span>,
    },
    {
      key: 'product_name', label: 'Product', width: '200px',
      render: (r) => <span className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{r.product_name ?? '—'}</span>,
    },
    {
      key: 'quantity', label: 'Target', align: 'right', width: '90px',
      render: (r) => <span className="text-sm tabular-nums">{formatNumber(r.quantity)}</span>,
    },
    {
      key: 'produced_qty', label: 'Produced', align: 'right', width: '90px',
      render: (r) => <span className="text-sm tabular-nums">{formatNumber(r.produced_qty)}</span>,
    },
    {
      key: 'progress', label: 'Progress', width: '120px', sortable: false,
      render: (r) => {
        const pct = r.quantity > 0 ? Math.round((r.produced_qty / r.quantity) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-100 dark:bg-[var(--dark-surface)] rounded-full h-1.5 min-w-[50px]">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] tabular-nums w-8 text-right">{pct}%</span>
          </div>
        );
      },
    },
    {
      key: 'machine_name', label: 'Machine', width: '180px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-2)]">{r.machine_name ?? '—'}</span>,
    },
    {
      key: 'supervisor_name', label: 'Supervisor', width: '150px',
      render: (r) => <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">{r.supervisor_name ?? '—'}</span>,
    },
    {
      key: 'start_date', label: 'Start Date', width: '110px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.start_date ? formatDate(r.start_date) : '—'}</span>,
    },
    {
      key: 'status', label: 'Status', width: '110px',
      render: (r) => <Badge status={r.status} />,
    },
    {
      key: 'actions', label: '', width: '70px', sortable: false, align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            title="Edit"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
        </div>
      ),
    },
  ];

  /* ── KPI cards ── */
  const kpis = summary ? [
    { label: 'Planned', value: summary.planned, icon: ClipboardList, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'In Progress', value: summary.in_progress, icon: Cog, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Completed', value: summary.completed, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Total Planned', value: formatNumber(summary.total_qty), icon: Target, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Total Produced', value: formatNumber(summary.total_produced), icon: BarChart3, color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  ] : [];

  return (
    <div className="space-y-4">
      {/* ── KPIs ── */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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

      {/* ── Table ── */}
      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        loading={loading}
        search={search}
        onSearchChange={handleSearchChange}
        onPageChange={setPage}
        onRowDoubleClick={openEdit}
        searchPlaceholder="Search by order # or product…"
        emptyIcon="🏭"
        emptyText="No production orders found."
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        toolbar={
          <>
            <div className="flex gap-1">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleStatusChange(t.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    statusFilter === t.value
                      ? 'bg-amber-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>New Order</Button>
          </>
        }
      />

      {/* ── Form Modal ── */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Production Order' : 'New Production Order'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">Product *</label>
            <select className="triumph-input" value={form.product_id} onChange={(e) => f('product_id', e.target.value)}>
              <option value="">— Select Product —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Status</label>
            <select className="triumph-input" value={form.status} onChange={(e) => f('status', e.target.value)}>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="triumph-label">Target Quantity *</label>
            <input type="number" min="1" className="triumph-input" value={form.quantity} onChange={(e) => f('quantity', e.target.value)} placeholder="e.g. 10000" />
          </div>
          <div>
            <label className="triumph-label">Produced Quantity</label>
            <input type="number" min="0" className="triumph-input" value={form.produced_qty} onChange={(e) => f('produced_qty', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Start Date</label>
            <input type="date" className="triumph-input" value={form.start_date} onChange={(e) => f('start_date', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">End Date</label>
            <input type="date" className="triumph-input" value={form.end_date} onChange={(e) => f('end_date', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Machine</label>
            <select className="triumph-input" value={form.machine_id} onChange={(e) => f('machine_id', e.target.value)}>
              <option value="">— None —</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Supervisor</label>
            <select className="triumph-input" value={form.supervisor_id} onChange={(e) => f('supervisor_id', e.target.value)}>
              <option value="">— None —</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="triumph-label">Notes</label>
            <textarea className="triumph-input resize-none" rows={2} value={form.notes} onChange={(e) => f('notes', e.target.value)} placeholder="Optional notes…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          {editItem && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => { setFormOpen(false); setDeleteTarget(editItem); }}
              icon={<Trash2 size={12} />}
            >
              Delete
            </Button>
          )}
          <Button size="sm" onClick={handleSave} loading={saving}>
            {editItem ? 'Save Changes' : 'Create Order'}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        variant="danger"
        title="Delete Production Order?"
        message={`This will permanently delete order ${deleteTarget?.order_number ?? ''}. This action cannot be undone.`}
        confirmLabel="Delete Order"
        loading={deleting}
      />
    </div>
  );
}

'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Cog, CheckCircle2, Wrench, PauseCircle, AlertTriangle, Archive,
  Pencil, Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatCurrency } from '@/lib/utils';

const PAGE_SIZE = 15;

const STATUS_TABS = [
  { value: '',            label: 'All' },
  { value: 'operational', label: 'Operational' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'idle',        label: 'Idle' },
  { value: 'retired',     label: 'Retired' },
];

const EMPTY_FORM = {
  machine_code: '', name: '', type: '', brand: '', model: '',
  purchase_date: '', purchase_price: '', status: 'operational',
  last_maintenance: '', next_maintenance: '', notes: '',
};
type FormData = typeof EMPTY_FORM;

export default function MachinesPage() {
  /* ── state ── */
  const [data, setData]                 = useState<any[]>([]);
  const [total, setTotal]               = useState(0);
  const [summary, setSummary]           = useState<any>(null);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]                 = useState(1);
  const [sortKey, setSortKey]           = useState('created_at');
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading]           = useState(true);

  /* form / modal */
  const [formOpen, setFormOpen]   = useState(false);
  const [editItem, setEditItem]   = useState<any>(null);
  const [form, setForm]           = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  /* delete */
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  /* meta */
  const [machineTypes, setMachineTypes] = useState<string[]>([]);

  const toast = useToast();

  /* ── load meta ── */
  useEffect(() => {
    fetch('/api/machines?meta=1')
      .then((r) => r.json())
      .then((j) => setMachineTypes(j.types ?? []));
  }, []);

  /* ── fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, type: statusFilter,
      sortKey, sortDir,
    });
    const res = await fetch(`/api/machines?${qs}`);
    const json = await res.json();
    setData(json.data ?? []);
    setTotal(json.total ?? 0);
    setSummary(json.summary ?? null);
    setLoading(false);
  }, [page, statusFilter, search, sortKey, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── handlers ── */
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleStatusChange = (v: string) => { setStatusFilter(v); setPage(1); };
  const handleSortChange   = (key: string, dir: 'asc' | 'desc') => { setSortKey(key); setSortDir(dir); setPage(1); };

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (row: any) => {
    setEditItem(row);
    setForm({
      machine_code:     row.machine_code ?? '',
      name:             row.name ?? '',
      type:             row.type ?? '',
      brand:            row.brand ?? '',
      model:            row.model ?? '',
      purchase_date:    row.purchase_date ? String(row.purchase_date).slice(0, 10) : '',
      purchase_price:   row.purchase_price ? String(row.purchase_price) : '',
      status:           row.status ?? 'operational',
      last_maintenance: row.last_maintenance ? String(row.last_maintenance).slice(0, 10) : '',
      next_maintenance: row.next_maintenance ? String(row.next_maintenance).slice(0, 10) : '',
      notes:            row.notes ?? '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.machine_code.trim()) { toast.warning('Validation', 'Machine code is required.'); return; }
    if (!form.name.trim()) { toast.warning('Validation', 'Machine name is required.'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
        ...(editItem ? { id: editItem.id } : {}),
      };
      const res = await fetch('/api/machines', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');

      toast.success(
        editItem ? 'Machine Updated' : 'Machine Added',
        editItem ? `${form.name} updated successfully.` : `${form.name} added to machines.`,
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
      const res = await fetch(`/api/machines?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', `${deleteTarget.name} has been deleted.`);
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
      key: 'machine_code', label: 'Code', width: '110px',
      render: (r) => <span className="font-mono text-[0.7rem] text-amber-700 dark:text-amber-400">{r.machine_code}</span>,
    },
    {
      key: 'name', label: 'Machine Name', width: '200px',
      render: (r) => <span className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{r.name}</span>,
    },
    {
      key: 'type', label: 'Type', width: '120px',
      render: (r) => r.type ? <Badge label={r.type} color="blue" /> : <span className="text-xs text-slate-400">—</span>,
    },
    {
      key: 'brand', label: 'Brand', width: '120px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-2)]">{r.brand ?? '—'}</span>,
    },
    {
      key: 'model', label: 'Model', width: '120px',
      render: (r) => <span className="text-xs text-slate-400 dark:text-[var(--dark-text-3)]">{r.model ?? '—'}</span>,
    },
    {
      key: 'last_maintenance', label: 'Last Maint.', width: '120px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.last_maintenance ? formatDate(r.last_maintenance) : '—'}</span>,
    },
    {
      key: 'next_maintenance', label: 'Next Maint.', width: '120px',
      render: (r) => {
        const due = r.maintenance_due;
        return (
          <span className={`text-xs ${due ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-[var(--dark-text-3)]'}`}>
            {r.next_maintenance ? formatDate(r.next_maintenance) : '—'}
            {due && <AlertTriangle size={10} className="inline ml-1" />}
          </span>
        );
      },
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
    { label: 'Total Machines', value: summary.total, icon: Cog, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Operational', value: summary.operational, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'In Maintenance', value: summary.in_maintenance, icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Idle', value: summary.idle, icon: PauseCircle, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-700/30' },
    { label: 'Maintenance Due', value: summary.maintenance_due, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
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
        searchPlaceholder="Search by name, code, or brand…"
        emptyIcon="⚙️"
        emptyText="No machines found."
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
            <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>Add Machine</Button>
          </>
        }
      />

      {/* ── Form Modal ── */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Machine' : 'Add Machine'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">Machine Code *</label>
            <input className="triumph-input" value={form.machine_code} onChange={(e) => f('machine_code', e.target.value)} placeholder="e.g. KNT-001" />
          </div>
          <div>
            <label className="triumph-label">Machine Name *</label>
            <input className="triumph-input" value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="Machine name" />
          </div>
          <div>
            <label className="triumph-label">Type</label>
            <select className="triumph-input" value={form.type} onChange={(e) => f('type', e.target.value)}>
              <option value="">— Select —</option>
              {machineTypes.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="triumph-label">Status</label>
            <select className="triumph-input" value={form.status} onChange={(e) => f('status', e.target.value)}>
              <option value="operational">Operational</option>
              <option value="maintenance">Maintenance</option>
              <option value="idle">Idle</option>
              <option value="retired">Retired</option>
            </select>
          </div>
          <div>
            <label className="triumph-label">Brand</label>
            <input className="triumph-input" value={form.brand} onChange={(e) => f('brand', e.target.value)} placeholder="e.g. Juki" />
          </div>
          <div>
            <label className="triumph-label">Model</label>
            <input className="triumph-input" value={form.model} onChange={(e) => f('model', e.target.value)} placeholder="e.g. MO-6800" />
          </div>
          <div>
            <label className="triumph-label">Purchase Date</label>
            <input type="date" className="triumph-input" value={form.purchase_date} onChange={(e) => f('purchase_date', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Purchase Price (Rs)</label>
            <input type="number" min="0" step="0.01" className="triumph-input" value={form.purchase_price} onChange={(e) => f('purchase_price', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Last Maintenance</label>
            <input type="date" className="triumph-input" value={form.last_maintenance} onChange={(e) => f('last_maintenance', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Next Maintenance</label>
            <input type="date" className="triumph-input" value={form.next_maintenance} onChange={(e) => f('next_maintenance', e.target.value)} />
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
            {editItem ? 'Save Changes' : 'Add Machine'}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        variant="danger"
        title="Delete Machine?"
        message={`This will permanently delete "${deleteTarget?.name ?? ''}". This action cannot be undone.`}
        confirmLabel="Delete Machine"
        loading={deleting}
      />
    </div>
  );
}

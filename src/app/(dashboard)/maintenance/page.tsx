'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Wrench, AlertTriangle, Clock, DollarSign, ClipboardList,
  Pencil, Trash2, X, History,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatCurrency } from '@/lib/utils';

const PAGE_SIZE = 15;

const TYPE_TABS = [
  { value: '',            label: 'All' },
  { value: 'preventive',  label: 'Preventive' },
  { value: 'corrective',  label: 'Corrective' },
  { value: 'breakdown',   label: 'Breakdown' },
  { value: 'inspection',  label: 'Inspection' },
];

const STATUS_TABS = [
  { value: '',            label: 'All' },
  { value: 'open',        label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
];

type FormData = {
  machine_id: string; type: string; title: string; description: string;
  reported_by: string; assigned_to: string; start_date: string; end_date: string;
  cost: string; priority: string; status: string; downtime_hours: string; notes: string;
  parts_used: { name: string; quantity: string; cost: string }[];
};

const EMPTY: FormData = {
  machine_id: '', type: 'preventive', title: '', description: '',
  reported_by: '', assigned_to: '', start_date: new Date().toISOString().slice(0, 10),
  end_date: '', cost: '', priority: 'medium', status: 'open', downtime_hours: '', notes: '',
  parts_used: [],
};

type BadgeColor = 'red' | 'purple' | 'blue' | 'gray' | 'amber' | 'green';

const typeBadge = (t: string) => {
  const map: Record<string, BadgeColor> = { preventive: 'blue', corrective: 'amber', breakdown: 'red', inspection: 'green' };
  return <Badge label={t.charAt(0).toUpperCase() + t.slice(1)} color={map[t] ?? 'gray'} />;
};

const priorityBadge = (p: string) => {
  const map: Record<string, BadgeColor> = { low: 'gray', medium: 'amber', high: 'red', critical: 'red' };
  const cls = p === 'critical' ? 'font-bold' : '';
  return <span className={cls}><Badge label={p.charAt(0).toUpperCase() + p.slice(1)} color={map[p] ?? 'gray'} /></span>;
};

const statusBadge = (s: string) => {
  const map: Record<string, BadgeColor> = { open: 'amber', in_progress: 'blue', completed: 'green', cancelled: 'gray' };
  const label = s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1);
  return <Badge label={label} color={map[s] ?? 'gray'} />;
};

export default function MaintenancePage() {
  /* ── state ── */
  const [data, setData]               = useState<any[]>([]);
  const [total, setTotal]             = useState(0);
  const [summary, setSummary]         = useState<any>(null);
  const [search, setSearch]           = useState('');
  const [typeFilter, setTypeFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [machineFilter, setMachineFilter] = useState('');
  const [page, setPage]               = useState(1);
  const [sortKey, setSortKey]         = useState('created_at');
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading]         = useState(true);

  /* form / modal */
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm]         = useState<FormData>({ ...EMPTY });
  const [saving, setSaving]     = useState(false);

  /* delete */
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  /* meta */
  const [machines, setMachines]     = useState<any[]>([]);
  const [employees, setEmployees]   = useState<any[]>([]);

  /* machine history */
  const [machineHistory, setMachineHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const toast = useToast();

  /* ── load meta ── */
  useEffect(() => {
    fetch('/api/maintenance?meta=1')
      .then((r) => r.json())
      .then((j) => {
        setMachines(j.machines ?? []);
        setEmployees(j.employees ?? []);
      });
  }, []);

  /* ── fetch main list ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, type: typeFilter, status: statusFilter,
      sortKey, sortDir,
    });
    const res = await fetch(`/api/maintenance?${qs}`);
    const json = await res.json();
    setData(json.rows ?? []);
    setTotal(json.total ?? 0);
    setSummary(json.summary ?? null);
    setLoading(false);
  }, [page, typeFilter, statusFilter, search, sortKey, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── fetch machine history ── */
  const fetchMachineHistory = useCallback(async (mid: string) => {
    if (!mid) { setMachineHistory(null); return; }
    setHistoryLoading(true);
    const res = await fetch(`/api/maintenance?machine_id=${mid}`);
    const json = await res.json();
    setMachineHistory(json);
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    if (machineFilter) fetchMachineHistory(machineFilter);
    else setMachineHistory(null);
  }, [machineFilter, fetchMachineHistory]);

  /* ── handlers ── */
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleTypeChange   = (v: string) => { setTypeFilter(v); setPage(1); };
  const handleStatusChange = (v: string) => { setStatusFilter(v); setPage(1); };
  const handleMachineChange = (v: string) => { setMachineFilter(v); setPage(1); };
  const handleSortChange   = (key: string, dir: 'asc' | 'desc') => { setSortKey(key); setSortDir(dir); setPage(1); };

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...EMPTY, parts_used: [] });
    setFormOpen(true);
  };

  const openEdit = (row: any) => {
    setEditItem(row);
    let parts: { name: string; quantity: string; cost: string }[] = [];
    try {
      const raw = typeof row.parts_used === 'string' ? JSON.parse(row.parts_used) : row.parts_used;
      if (Array.isArray(raw)) parts = raw.map((p: any) => ({ name: p.name ?? '', quantity: String(p.quantity ?? ''), cost: String(p.cost ?? '') }));
    } catch { /* ignore */ }
    setForm({
      machine_id:     row.machine_id ? String(row.machine_id) : '',
      type:           row.type ?? 'preventive',
      title:          row.title ?? '',
      description:    row.description ?? '',
      reported_by:    row.reported_by ? String(row.reported_by) : '',
      assigned_to:    row.assigned_to ?? '',
      start_date:     row.start_date ? String(row.start_date).slice(0, 10) : '',
      end_date:       row.end_date ? String(row.end_date).slice(0, 10) : '',
      cost:           row.cost ? String(row.cost) : '',
      priority:       row.priority ?? 'medium',
      status:         row.status ?? 'open',
      downtime_hours: row.downtime_hours ? String(row.downtime_hours) : '',
      notes:          row.notes ?? '',
      parts_used:     parts,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.machine_id) { toast.warning('Validation', 'Please select a machine.'); return; }
    if (!form.title.trim()) { toast.warning('Validation', 'Title is required.'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        cost: form.cost ? parseFloat(form.cost) : 0,
        downtime_hours: form.downtime_hours ? parseFloat(form.downtime_hours) : 0,
        parts_used: form.parts_used.filter((p) => p.name.trim()).map((p) => ({
          name: p.name, quantity: parseFloat(p.quantity) || 0, cost: parseFloat(p.cost) || 0,
        })),
        ...(editItem ? { id: editItem.id } : {}),
      };
      const res = await fetch('/api/maintenance', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(
        editItem ? 'Record Updated' : 'Maintenance Logged',
        editItem ? 'Maintenance record updated successfully.' : 'Maintenance record created successfully.',
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
      const res = await fetch('/api/maintenance', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', 'Maintenance record deleted.');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const f = (k: keyof Omit<FormData, 'parts_used'>, v: string) => setForm((p) => ({ ...p, [k]: v }));

  /* ── parts_used helpers ── */
  const addPart = () => setForm((p) => ({ ...p, parts_used: [...p.parts_used, { name: '', quantity: '', cost: '' }] }));
  const removePart = (idx: number) => setForm((p) => ({ ...p, parts_used: p.parts_used.filter((_, i) => i !== idx) }));
  const updatePart = (idx: number, key: 'name' | 'quantity' | 'cost', val: string) =>
    setForm((p) => ({ ...p, parts_used: p.parts_used.map((part, i) => (i === idx ? { ...part, [key]: val } : part)) }));

  /* ── columns ── */
  const columns: Column[] = [
    {
      key: 'start_date', label: 'Date', width: '100px', sortable: true,
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{formatDate(r.start_date)}</span>,
    },
    {
      key: 'machine_name', label: 'Machine', width: '150px', sortable: true,
      render: (r) => (
        <div>
          <span className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{r.machine_name ?? '—'}</span>
          {r.machine_code && <span className="block text-[0.6rem] text-slate-400 font-mono">{r.machine_code}</span>}
        </div>
      ),
    },
    {
      key: 'title', label: 'Title', sortable: true,
      render: (r) => <span className="text-xs text-slate-600 dark:text-[var(--dark-text)] truncate block max-w-[200px]">{r.title}</span>,
    },
    {
      key: 'type', label: 'Type', width: '110px', sortable: true,
      render: (r) => typeBadge(r.type),
    },
    {
      key: 'priority', label: 'Priority', width: '100px', sortable: true,
      render: (r) => priorityBadge(r.priority ?? 'medium'),
    },
    {
      key: 'status', label: 'Status', width: '110px', sortable: true,
      render: (r) => statusBadge(r.status),
    },
    {
      key: 'cost', label: 'Cost', width: '100px', sortable: true, align: 'right',
      render: (r) => (
        <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-[var(--dark-text)]">
          {r.cost ? formatCurrency(r.cost) : '—'}
        </span>
      ),
    },
    {
      key: 'downtime_hours', label: 'Downtime', width: '90px', sortable: true, align: 'right',
      render: (r) => (
        <span className="text-xs tabular-nums text-slate-500 dark:text-[var(--dark-text-3)]">
          {r.downtime_hours ? `${r.downtime_hours} hrs` : '—'}
        </span>
      ),
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
    { label: 'Total Records',  value: summary.total,         icon: ClipboardList, color: 'text-blue-500',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Open',           value: summary.open,          icon: AlertTriangle, color: 'text-amber-500',  bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'In Progress',    value: summary.in_progress,   icon: Clock,         color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { label: 'Breakdowns',     value: summary.breakdowns,    icon: Wrench,        color: 'text-red-500',    bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Total Cost',     value: formatCurrency(parseFloat(summary.total_cost ?? 0)), icon: DollarSign, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30',
      sub: summary.total_downtime ? `${parseFloat(summary.total_downtime).toFixed(1)} hrs downtime` : undefined },
  ] : [];

  /* ── machine history stats ── */
  const mhStats = machineHistory?.stats;

  return (
    <div className="space-y-4">
      {/* ── KPIs ── */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
                  {k.sub && <p className="text-[0.6rem] text-slate-400 dark:text-[var(--dark-text-3)]">{k.sub}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Machine History View ── */}
      {machineFilter && (
        <div className="triumph-card p-4 anim-fade-up">
          <div className="flex items-center gap-2 mb-3">
            <History size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-[var(--dark-text)]">
              Machine History — {machines.find((m) => String(m.id) === machineFilter)?.name ?? 'Unknown'}
            </h3>
          </div>
          {historyLoading ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full" />
            </div>
          ) : mhStats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[var(--dark-surface)]">
                <p className="text-lg font-bold text-slate-800 dark:text-white">{mhStats.total}</p>
                <p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">Total Records</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[var(--dark-surface)]">
                <p className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(parseFloat(mhStats.total_cost ?? 0))}</p>
                <p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">Total Cost</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[var(--dark-surface)]">
                <p className="text-lg font-bold text-slate-800 dark:text-white">
                  {mhStats.total_downtime ? `${(parseFloat(mhStats.total_downtime) / Math.max(1, parseInt(mhStats.total))).toFixed(1)} hrs` : '—'}
                </p>
                <p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">Avg Downtime</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[var(--dark-surface)]">
                <p className="text-lg font-bold text-slate-800 dark:text-white">
                  {machineHistory?.history?.[0] ? formatDate(machineHistory.history[0].start_date) : '—'}
                </p>
                <p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)]">Last Maintenance</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">No history data available.</p>
          )}
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
        searchPlaceholder="Search by title or machine…"
        emptyIcon="🔧"
        emptyText="No maintenance records found."
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        toolbar={
          <>
            {/* Type filter */}
            <div className="flex gap-1 flex-wrap">
              {TYPE_TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleTypeChange(t.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    typeFilter === t.value
                      ? 'bg-amber-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {/* Status filter */}
            <div className="flex gap-1 flex-wrap">
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
            {/* Machine dropdown */}
            <select
              value={machineFilter}
              onChange={(e) => handleMachineChange(e.target.value)}
              className="triumph-input !py-1 !text-xs !w-40"
            >
              <option value="">All Machines</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>Log Maintenance</Button>
          </>
        }
      />

      {/* ── Form Modal ── */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Maintenance Record' : 'Log Maintenance'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">Machine *</label>
            <select className="triumph-input" value={form.machine_id} onChange={(e) => f('machine_id', e.target.value)}>
              <option value="">— Select Machine —</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.machine_code})</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Type *</label>
            <select className="triumph-input" value={form.type} onChange={(e) => f('type', e.target.value)}>
              <option value="preventive">Preventive</option>
              <option value="corrective">Corrective</option>
              <option value="breakdown">Breakdown</option>
              <option value="inspection">Inspection</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="triumph-label">Title *</label>
            <input className="triumph-input" value={form.title} onChange={(e) => f('title', e.target.value)} placeholder="e.g. Monthly belt replacement" />
          </div>
          <div className="sm:col-span-2">
            <label className="triumph-label">Description</label>
            <textarea className="triumph-input resize-none" rows={2} value={form.description} onChange={(e) => f('description', e.target.value)} placeholder="Detailed description…" />
          </div>
          <div>
            <label className="triumph-label">Reported By</label>
            <select className="triumph-input" value={form.reported_by} onChange={(e) => f('reported_by', e.target.value)}>
              <option value="">— Select —</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Assigned To</label>
            <input className="triumph-input" value={form.assigned_to} onChange={(e) => f('assigned_to', e.target.value)} placeholder="Technician name" />
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
            <label className="triumph-label">Cost (Rs)</label>
            <input type="number" min="0" step="0.01" className="triumph-input" value={form.cost} onChange={(e) => f('cost', e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="triumph-label">Downtime (hrs)</label>
            <input type="number" min="0" step="0.5" className="triumph-input" value={form.downtime_hours} onChange={(e) => f('downtime_hours', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="triumph-label">Priority</label>
            <select className="triumph-input" value={form.priority} onChange={(e) => f('priority', e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="triumph-label">Status</label>
            <select className="triumph-input" value={form.status} onChange={(e) => f('status', e.target.value)}>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="triumph-label">Notes</label>
            <textarea className="triumph-input resize-none" rows={2} value={form.notes} onChange={(e) => f('notes', e.target.value)} placeholder="Additional notes…" />
          </div>

          {/* ── Parts Used ── */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="triumph-label !mb-0">Parts Used</label>
              <button
                type="button"
                onClick={addPart}
                className="text-[0.7rem] font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                <Plus size={12} /> Add Part
              </button>
            </div>
            {form.parts_used.length > 0 && (
              <div className="space-y-2">
                {form.parts_used.map((part, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      className="triumph-input flex-1"
                      placeholder="Part name"
                      value={part.name}
                      onChange={(e) => updatePart(idx, 'name', e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      className="triumph-input !w-20"
                      placeholder="Qty"
                      value={part.quantity}
                      onChange={(e) => updatePart(idx, 'quantity', e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="triumph-input !w-24"
                      placeholder="Cost"
                      value={part.cost}
                      onChange={(e) => updatePart(idx, 'cost', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removePart(idx)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                      title="Remove part"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {form.parts_used.length === 0 && (
              <p className="text-[0.65rem] text-slate-400 italic">No parts added yet.</p>
            )}
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
            {editItem ? 'Save Changes' : 'Log Maintenance'}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        variant="danger"
        title="Delete Maintenance Record?"
        message={`This will permanently delete "${deleteTarget?.title ?? ''}". This action cannot be undone.`}
        confirmLabel="Delete Record"
        loading={deleting}
      />
    </div>
  );
}

'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, ClipboardCheck, CheckCircle2, XCircle, BarChart3,
  Pencil, Trash2, ListChecks, X,
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
  { value: '',        label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'passed',  label: 'Passed' },
  { value: 'failed',  label: 'Failed' },
  { value: 'rework',  label: 'Rework' },
];

/* ── form types ── */
type InspectionForm = {
  production_order_id: string; checklist_id: string; inspector_id: string;
  inspection_date: string; batch_number: string; sample_size: string;
  pass_count: string; fail_count: string; status: string; notes: string;
  results: { label: string; value: string; pass: boolean }[];
};

type ChecklistForm = {
  name: string; description: string;
  items: { label: string; type: string; target: string; tolerance: string }[];
};

const EMPTY_INSPECTION: InspectionForm = {
  production_order_id: '', checklist_id: '', inspector_id: '',
  inspection_date: '', batch_number: '', sample_size: '',
  pass_count: '', fail_count: '', status: 'pending', notes: '',
  results: [],
};

const EMPTY_CHECKLIST: ChecklistForm = {
  name: '', description: '',
  items: [{ label: '', type: 'boolean', target: '', tolerance: '' }],
};

export default function QualityControlPage() {
  /* ── tab ── */
  const [tab, setTab] = useState<'inspections' | 'checklists'>('inspections');

  /* ── inspections state ── */
  const [data, setData]               = useState<any[]>([]);
  const [total, setTotal]             = useState(0);
  const [summary, setSummary]         = useState<any>(null);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [page, setPage]               = useState(1);
  const [sortKey, setSortKey]         = useState('created_at');
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading]         = useState(true);

  /* ── checklists state ── */
  const [checklists, setChecklists]   = useState<any[]>([]);
  const [clLoading, setClLoading]     = useState(true);

  /* form / modal */
  const [formOpen, setFormOpen]       = useState(false);
  const [editItem, setEditItem]       = useState<any>(null);
  const [form, setForm]               = useState<InspectionForm>(EMPTY_INSPECTION);
  const [saving, setSaving]           = useState(false);

  /* checklist form */
  const [clFormOpen, setClFormOpen]   = useState(false);
  const [editCl, setEditCl]           = useState<any>(null);
  const [clForm, setClForm]           = useState<ChecklistForm>(EMPTY_CHECKLIST);
  const [clSaving, setClSaving]       = useState(false);

  /* delete */
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteType, setDeleteType]     = useState<'inspection' | 'checklist'>('inspection');
  const [deleting, setDeleting]         = useState(false);

  /* meta */
  const [metaChecklists, setMetaChecklists] = useState<any[]>([]);
  const [prodOrders, setProdOrders]         = useState<any[]>([]);
  const [employees, setEmployees]           = useState<any[]>([]);

  const toast = useToast();

  /* ── load meta ── */
  useEffect(() => {
    fetch('/api/qc?meta=1')
      .then((r) => r.json())
      .then((j) => {
        setMetaChecklists(j.checklists ?? []);
        setProdOrders(j.productionOrders ?? []);
        setEmployees(j.employees ?? []);
      });
  }, []);

  /* ── fetch inspections ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      status: statusFilter, search,
      sortKey, sortDir,
    });
    const res = await fetch(`/api/qc?${qs}`);
    const json = await res.json();
    setData(json.rows ?? []);
    setTotal(json.total ?? 0);
    setSummary(json.summary ?? null);
    setLoading(false);
  }, [page, statusFilter, search, sortKey, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── fetch checklists ── */
  const fetchChecklists = useCallback(async () => {
    setClLoading(true);
    const res = await fetch('/api/qc?checklists=1');
    const json = await res.json();
    setChecklists(json.rows ?? []);
    setClLoading(false);
  }, []);

  useEffect(() => { if (tab === 'checklists') fetchChecklists(); }, [tab, fetchChecklists]);

  /* ── handlers ── */
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleStatusChange = (v: string) => { setStatus(v); setPage(1); };
  const handleSortChange   = (key: string, dir: 'asc' | 'desc') => { setSortKey(key); setSortDir(dir); setPage(1); };

  /* inspection CRUD */
  const openAdd = () => { setEditItem(null); setForm(EMPTY_INSPECTION); setFormOpen(true); };
  const openEdit = (row: any) => {
    setEditItem(row);
    setForm({
      production_order_id: row.production_order_id ?? '',
      checklist_id:        row.checklist_id ?? '',
      inspector_id:        row.inspector_id ?? '',
      inspection_date:     row.inspection_date ? String(row.inspection_date).slice(0, 10) : '',
      batch_number:        row.batch_number ?? '',
      sample_size:         String(row.sample_size ?? ''),
      pass_count:          String(row.pass_count ?? ''),
      fail_count:          String(row.fail_count ?? ''),
      status:              row.status ?? 'pending',
      notes:               row.notes ?? '',
      results:             Array.isArray(row.results) ? row.results : [],
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.batch_number.trim()) { toast.warning('Validation', 'Batch number is required.'); return; }
    if (!form.sample_size || parseInt(form.sample_size) <= 0) { toast.warning('Validation', 'Sample size must be greater than 0.'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        sample_size: parseInt(form.sample_size) || 0,
        pass_count:  parseInt(form.pass_count) || 0,
        fail_count:  parseInt(form.fail_count) || 0,
        ...(editItem ? { id: editItem.id } : {}),
      };
      const res = await fetch('/api/qc', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');

      toast.success(
        editItem ? 'Inspection Updated' : 'Inspection Created',
        editItem ? 'QC inspection updated successfully.' : 'New QC inspection recorded.',
      );
      setFormOpen(false);
      fetchData();
      // refresh meta checklists in case they changed
      fetch('/api/qc?meta=1').then(r => r.json()).then(j => setMetaChecklists(j.checklists ?? []));
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  /* checklist CRUD */
  const openClAdd = () => { setEditCl(null); setClForm(EMPTY_CHECKLIST); setClFormOpen(true); };
  const openClEdit = (row: any) => {
    setEditCl(row);
    const items = Array.isArray(row.items) ? row.items : [];
    setClForm({
      name: row.name ?? '',
      description: row.description ?? '',
      items: items.length > 0 ? items : [{ label: '', type: 'boolean', target: '', tolerance: '' }],
    });
    setClFormOpen(true);
  };

  const handleClSave = async () => {
    if (!clForm.name.trim()) { toast.warning('Validation', 'Checklist name is required.'); return; }

    setClSaving(true);
    try {
      const payload = {
        type: 'checklist',
        name: clForm.name,
        description: clForm.description,
        items: clForm.items.filter(i => i.label.trim()),
        ...(editCl ? { id: editCl.id, is_active: editCl.is_active } : {}),
      };
      const res = await fetch('/api/qc', {
        method: editCl ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');

      toast.success(
        editCl ? 'Checklist Updated' : 'Checklist Created',
        editCl ? 'QC checklist updated successfully.' : 'New QC checklist created.',
      );
      setClFormOpen(false);
      fetchChecklists();
      fetch('/api/qc?meta=1').then(r => r.json()).then(j => setMetaChecklists(j.checklists ?? []));
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setClSaving(false);
    }
  };

  /* delete */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/qc', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id, type: deleteType === 'checklist' ? 'checklist' : undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', deleteType === 'checklist' ? 'Checklist deleted.' : 'Inspection deleted.');
      setDeleteTarget(null);
      if (deleteType === 'checklist') fetchChecklists(); else fetchData();
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setDeleting(false);
    }
  };

  /* ── form helpers ── */
  const f = (k: keyof InspectionForm, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const addResultRow = () => setForm((p) => ({ ...p, results: [...p.results, { label: '', value: '', pass: true }] }));
  const removeResultRow = (i: number) => setForm((p) => ({ ...p, results: p.results.filter((_, idx) => idx !== i) }));
  const updateResult = (i: number, key: string, val: any) =>
    setForm((p) => ({ ...p, results: p.results.map((r, idx) => idx === i ? { ...r, [key]: val } : r) }));

  const addClItem = () => setClForm((p) => ({ ...p, items: [...p.items, { label: '', type: 'boolean', target: '', tolerance: '' }] }));
  const removeClItem = (i: number) => setClForm((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  const updateClItem = (i: number, key: string, val: string) =>
    setClForm((p) => ({ ...p, items: p.items.map((r, idx) => idx === i ? { ...r, [key]: val } : r) }));

  /* ── inspection columns ── */
  const columns: Column[] = [
    {
      key: 'inspection_date', label: 'Date', width: '100px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.inspection_date ? formatDate(r.inspection_date) : '—'}</span>,
    },
    {
      key: 'batch_number', label: 'Batch #', width: '120px',
      render: (r) => <span className="font-mono text-[0.7rem] text-amber-700 dark:text-amber-400">{r.batch_number ?? '—'}</span>,
    },
    {
      key: 'checklist_name', label: 'Checklist', width: '150px',
      render: (r) => r.checklist_name
        ? <Badge label={r.checklist_name} color="purple" />
        : <span className="text-xs text-slate-400">—</span>,
    },
    {
      key: 'inspector_name', label: 'Inspector', width: '140px',
      render: (r) => <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">{r.inspector_name ?? '—'}</span>,
    },
    {
      key: 'sample_size', label: 'Sample', align: 'right', width: '80px',
      render: (r) => <span className="text-sm tabular-nums">{formatNumber(r.sample_size)}</span>,
    },
    {
      key: 'pass_count', label: 'Pass', align: 'right', width: '70px',
      render: (r) => <span className="text-sm tabular-nums text-green-600 dark:text-green-400">{formatNumber(r.pass_count)}</span>,
    },
    {
      key: 'fail_count', label: 'Fail', align: 'right', width: '70px',
      render: (r) => <span className="text-sm tabular-nums text-red-600 dark:text-red-400">{formatNumber(r.fail_count)}</span>,
    },
    {
      key: 'status', label: 'Status', width: '100px',
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
            onClick={(e) => { e.stopPropagation(); setDeleteType('inspection'); setDeleteTarget(r); }}
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
    { label: 'Total Inspections', value: formatNumber(summary.total), icon: ClipboardCheck, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Passed', value: formatNumber(summary.passed), icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Failed', value: formatNumber(summary.failed), icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Avg Pass Rate', value: `${summary.avg_pass_rate}%`, icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ] : [];

  return (
    <div className="space-y-4">
      {/* ── Tab Toggle ── */}
      <div className="flex items-center gap-1 triumph-card p-1 w-fit anim-fade-up">
        <button
          onClick={() => setTab('inspections')}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === 'inspections'
              ? 'bg-amber-500 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'
          }`}
        >
          Inspections
        </button>
        <button
          onClick={() => setTab('checklists')}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === 'checklists'
              ? 'bg-amber-500 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'
          }`}
        >
          Checklists
        </button>
      </div>

      {/* ══════════════════════════════════════ INSPECTIONS TAB ══════════════════════════════════════ */}
      {tab === 'inspections' && (
        <>
          {/* KPIs */}
          {kpis.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

          {/* Data Table */}
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
            searchPlaceholder="Search by batch # or order…"
            emptyIcon="🔍"
            emptyText="No QC inspections found."
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
                <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>New Inspection</Button>
              </>
            }
          />
        </>
      )}

      {/* ══════════════════════════════════════ CHECKLISTS TAB ══════════════════════════════════════ */}
      {tab === 'checklists' && (
        <div className="space-y-3 anim-fade-up">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-[var(--dark-text)]">QC Checklists</h2>
            <Button size="sm" icon={<Plus size={13} />} onClick={openClAdd}>New Checklist</Button>
          </div>

          {clLoading ? (
            <div className="triumph-card p-8 text-center text-sm text-slate-400">Loading checklists…</div>
          ) : checklists.length === 0 ? (
            <div className="triumph-card p-8 text-center">
              <ListChecks size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400">No checklists yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {checklists.map((cl) => {
                const items = Array.isArray(cl.items) ? cl.items : [];
                return (
                  <div key={cl.id} className="triumph-card p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{cl.name}</span>
                        <Badge
                          label={cl.is_active ? 'Active' : 'Inactive'}
                          color={cl.is_active ? 'green' : 'gray'}
                        />
                      </div>
                      {cl.description && (
                        <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5 truncate">{cl.description}</p>
                      )}
                      <p className="text-[0.65rem] text-slate-400 dark:text-[var(--dark-text-3)] mt-1">
                        {items.length} item{items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openClEdit(cl)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => { setDeleteType('checklist'); setDeleteTarget(cl); }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════ INSPECTION FORM MODAL ══════════════════════════════════════ */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Inspection' : 'New Inspection'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">Production Order</label>
            <select className="triumph-input" value={form.production_order_id} onChange={(e) => f('production_order_id', e.target.value)}>
              <option value="">— Select —</option>
              {prodOrders.map((po) => <option key={po.id} value={po.id}>{po.order_number} — {po.product_name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Checklist</label>
            <select className="triumph-input" value={form.checklist_id} onChange={(e) => f('checklist_id', e.target.value)}>
              <option value="">— None —</option>
              {metaChecklists.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Inspector</label>
            <select className="triumph-input" value={form.inspector_id} onChange={(e) => f('inspector_id', e.target.value)}>
              <option value="">— Select —</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Inspection Date</label>
            <input type="date" className="triumph-input" value={form.inspection_date} onChange={(e) => f('inspection_date', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Batch Number *</label>
            <input className="triumph-input" value={form.batch_number} onChange={(e) => f('batch_number', e.target.value)} placeholder="e.g. B-20260301" />
          </div>
          <div>
            <label className="triumph-label">Sample Size *</label>
            <input type="number" min="1" className="triumph-input" value={form.sample_size} onChange={(e) => f('sample_size', e.target.value)} placeholder="e.g. 100" />
          </div>
          <div>
            <label className="triumph-label">Pass Count</label>
            <input type="number" min="0" className="triumph-input" value={form.pass_count} onChange={(e) => f('pass_count', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Fail Count</label>
            <input type="number" min="0" className="triumph-input" value={form.fail_count} onChange={(e) => f('fail_count', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Status</label>
            <select className="triumph-input" value={form.status} onChange={(e) => f('status', e.target.value)}>
              <option value="pending">Pending</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="rework">Rework</option>
            </select>
          </div>
          <div>
            <label className="triumph-label">&nbsp;</label>
          </div>
          <div className="sm:col-span-2">
            <label className="triumph-label">Notes</label>
            <textarea className="triumph-input resize-none" rows={2} value={form.notes} onChange={(e) => f('notes', e.target.value)} placeholder="Optional notes…" />
          </div>
        </div>

        {/* Dynamic Results */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <div className="flex items-center justify-between mb-2">
            <label className="triumph-label !mb-0">Inspection Results</label>
            <button
              type="button"
              onClick={addResultRow}
              className="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1"
            >
              <Plus size={12} /> Add Row
            </button>
          </div>
          {form.results.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-[var(--dark-text-3)]">No result rows. Click &quot;Add Row&quot; to add inspection criteria.</p>
          )}
          {form.results.map((row, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <input
                className="triumph-input flex-1"
                placeholder="Label (e.g. Stitch count)"
                value={row.label}
                onChange={(e) => updateResult(i, 'label', e.target.value)}
              />
              <input
                className="triumph-input w-24"
                placeholder="Value"
                value={row.value}
                onChange={(e) => updateResult(i, 'value', e.target.value)}
              />
              <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-[var(--dark-text-2)] whitespace-nowrap cursor-pointer">
                <input
                  type="checkbox"
                  checked={row.pass}
                  onChange={(e) => updateResult(i, 'pass', e.target.checked)}
                  className="accent-green-500"
                />
                Pass
              </label>
              <button
                type="button"
                onClick={() => removeResultRow(i)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          {editItem && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => { setFormOpen(false); setDeleteType('inspection'); setDeleteTarget(editItem); }}
              icon={<Trash2 size={12} />}
            >
              Delete
            </Button>
          )}
          <Button size="sm" onClick={handleSave} loading={saving}>
            {editItem ? 'Save Changes' : 'Create Inspection'}
          </Button>
        </div>
      </Modal>

      {/* ══════════════════════════════════════ CHECKLIST FORM MODAL ══════════════════════════════════════ */}
      <Modal open={clFormOpen} onClose={() => setClFormOpen(false)} title={editCl ? 'Edit Checklist' : 'New Checklist'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="triumph-label">Name *</label>
            <input className="triumph-input" value={clForm.name} onChange={(e) => setClForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Final Sock Inspection" />
          </div>
          <div>
            <label className="triumph-label">Description</label>
            <textarea className="triumph-input resize-none" rows={2} value={clForm.description} onChange={(e) => setClForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional description…" />
          </div>

          {/* Dynamic Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="triumph-label !mb-0">Checklist Items</label>
              <button
                type="button"
                onClick={addClItem}
                className="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1"
              >
                <Plus size={12} /> Add Item
              </button>
            </div>
            {clForm.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  className="triumph-input flex-1"
                  placeholder="Label"
                  value={item.label}
                  onChange={(e) => updateClItem(i, 'label', e.target.value)}
                />
                <select
                  className="triumph-input w-28"
                  value={item.type}
                  onChange={(e) => updateClItem(i, 'type', e.target.value)}
                >
                  <option value="boolean">Boolean</option>
                  <option value="numeric">Numeric</option>
                </select>
                <input
                  className="triumph-input w-20"
                  placeholder="Target"
                  value={item.target}
                  onChange={(e) => updateClItem(i, 'target', e.target.value)}
                />
                <input
                  className="triumph-input w-20"
                  placeholder="Tolerance"
                  value={item.tolerance}
                  onChange={(e) => updateClItem(i, 'tolerance', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeClItem(i)}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setClFormOpen(false)}>Cancel</Button>
          {editCl && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => { setClFormOpen(false); setDeleteType('checklist'); setDeleteTarget(editCl); }}
              icon={<Trash2 size={12} />}
            >
              Delete
            </Button>
          )}
          <Button size="sm" onClick={handleClSave} loading={clSaving}>
            {editCl ? 'Save Changes' : 'Create Checklist'}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        variant="danger"
        title={deleteType === 'checklist' ? 'Delete Checklist?' : 'Delete Inspection?'}
        message={
          deleteType === 'checklist'
            ? `This will permanently delete checklist "${deleteTarget?.name ?? ''}". This action cannot be undone.`
            : `This will permanently delete inspection for batch ${deleteTarget?.batch_number ?? ''}. This action cannot be undone.`
        }
        confirmLabel={deleteType === 'checklist' ? 'Delete Checklist' : 'Delete Inspection'}
        loading={deleting}
      />
    </div>
  );
}

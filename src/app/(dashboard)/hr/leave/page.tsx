'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, CalendarDays, Clock, CheckCircle2, XCircle,
  Pencil, Trash2, Check, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';

const PAGE_SIZE = 15;

const STATUS_TABS = [
  { value: '',         label: 'All' },
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const EMPTY_FORM = {
  employee_id: '', leave_type_id: '', from_date: '', to_date: '', reason: '',
};
type FormData = typeof EMPTY_FORM;

export default function LeavePage() {
  const [data, setData]       = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]       = useState(1);
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm]         = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  const [employees, setEmployees]   = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/leave?meta=1').then((r) => r.json()).then((j) => {
      setEmployees(j.employees ?? []);
      setLeaveTypes(j.leave_types ?? []);
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, status: statusFilter, sortKey, sortDir,
    });
    const res = await fetch(`/api/leave?${qs}`);
    const json = await res.json();
    setData(json.data ?? []);
    setTotal(json.total ?? 0);
    setSummary(json.summary ?? null);
    setLoading(false);
  }, [page, statusFilter, search, sortKey, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleStatusChange = (v: string) => { setStatusFilter(v); setPage(1); };
  const handleSortChange   = (key: string, dir: 'asc' | 'desc') => { setSortKey(key); setSortDir(dir); setPage(1); };

  const openAdd = () => { setForm(EMPTY_FORM); setFormOpen(true); };

  const handleSave = async () => {
    if (!form.employee_id) { toast.warning('Validation', 'Employee is required.'); return; }
    if (!form.leave_type_id) { toast.warning('Validation', 'Leave type is required.'); return; }
    if (!form.from_date || !form.to_date) { toast.warning('Validation', 'Dates are required.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Leave Request Created', 'Leave request submitted successfully.');
      setFormOpen(false);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    try {
      const res = await fetch('/api/leave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: action }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(action === 'approved' ? 'Approved' : 'Rejected', `Leave request ${action}.`);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/leave?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', 'Leave request deleted.');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setDeleting(false); }
  };

  const f = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const columns: Column[] = [
    { key: 'emp_code', label: 'Code', width: '90px', sortable: true,
      render: (r) => <span className="font-mono text-[0.7rem] text-amber-700 dark:text-amber-400">{r.emp_code}</span> },
    { key: 'employee_name', label: 'Employee', width: '170px', sortable: true,
      render: (r) => <span className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{r.employee_name}</span> },
    { key: 'leave_type_name', label: 'Leave Type', width: '120px', sortable: true,
      render: (r) => <Badge label={r.leave_type_name} color="blue" /> },
    { key: 'from_date', label: 'From', width: '110px', sortable: true,
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{formatDate(r.from_date)}</span> },
    { key: 'to_date', label: 'To', width: '110px', sortable: true,
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{formatDate(r.to_date)}</span> },
    { key: 'days', label: 'Days', width: '70px', align: 'center',
      render: (r) => {
        const days = Math.ceil((new Date(r.to_date).getTime() - new Date(r.from_date).getTime()) / 86400000) + 1;
        return <span className="text-sm font-semibold">{days}</span>;
      } },
    { key: 'reason', label: 'Reason', width: '160px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)] truncate block max-w-[160px]">{r.reason ?? '—'}</span> },
    { key: 'status', label: 'Status', width: '100px', sortable: true,
      render: (r) => <Badge status={r.status} /> },
    { key: 'actions', label: '', width: '100px', sortable: false, align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          {r.status === 'pending' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); handleAction(r.id, 'approved'); }}
                className="w-6 h-6 flex items-center justify-center rounded-md text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Approve"><Check size={12} /></button>
              <button onClick={(e) => { e.stopPropagation(); handleAction(r.id, 'rejected'); }}
                className="w-6 h-6 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Reject"><X size={12} /></button>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete"><Trash2 size={11} /></button>
        </div>
      ) },
  ];

  const kpis = summary ? [
    { label: 'Total Requests', value: summary.total,    icon: CalendarDays, color: 'text-blue-500',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Pending',        value: summary.pending,  icon: Clock,        color: 'text-amber-500',  bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Approved',       value: summary.approved, icon: CheckCircle2, color: 'text-green-500',  bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Rejected',       value: summary.rejected, icon: XCircle,      color: 'text-red-500',    bg: 'bg-red-100 dark:bg-red-900/30' },
  ] : [];

  return (
    <div className="space-y-4">
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map((k, i) => { const Icon = k.icon; return (
            <div key={k.label} className={`triumph-card p-4 flex items-center gap-3 anim-fade-up anim-d${Math.min(i+1,6)}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.bg}`}><Icon size={18} className={k.color} /></div>
              <div><p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{k.value}</p><p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">{k.label}</p></div>
            </div>
          ); })}
        </div>
      )}

      <DataTable columns={columns} data={data} total={total} page={page} pageSize={PAGE_SIZE} loading={loading}
        search={search} onSearchChange={handleSearchChange} onPageChange={setPage}
        searchPlaceholder="Search by employee or leave type…" emptyIcon="🏖️" emptyText="No leave requests found."
        sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange}
        toolbar={<>
          <div className="flex gap-1">
            {STATUS_TABS.map((t) => (
              <button key={t.value} onClick={() => handleStatusChange(t.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${statusFilter===t.value ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'}`}>{t.label}</button>
            ))}
          </div>
          <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>New Request</Button>
        </>}
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="New Leave Request" size="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">Employee *</label>
            <select className="triumph-input" value={form.employee_id} onChange={(e) => f('employee_id', e.target.value)}>
              <option value="">— Select Employee —</option>
              {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.emp_code} — {emp.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Leave Type *</label>
            <select className="triumph-input" value={form.leave_type_id} onChange={(e) => f('leave_type_id', e.target.value)}>
              <option value="">— Select Type —</option>
              {leaveTypes.map((lt: any) => <option key={lt.id} value={lt.id}>{lt.name} ({lt.days_allowed} days)</option>)}
            </select>
          </div>
          <div><label className="triumph-label">From Date *</label><input type="date" className="triumph-input" value={form.from_date} onChange={(e) => f('from_date', e.target.value)} /></div>
          <div><label className="triumph-label">To Date *</label><input type="date" className="triumph-input" value={form.to_date} onChange={(e) => f('to_date', e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="triumph-label">Reason</label><textarea className="triumph-input resize-none" rows={2} value={form.reason} onChange={(e) => f('reason', e.target.value)} placeholder="Reason for leave…" /></div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} loading={saving}>Submit Request</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        variant="danger" title="Delete Leave Request?" message={`Delete leave request for "${deleteTarget?.employee_name ?? ''}"? This action cannot be undone.`}
        confirmLabel="Delete" loading={deleting} />
    </div>
  );
}

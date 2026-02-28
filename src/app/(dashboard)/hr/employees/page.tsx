'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Users, UserCheck, UserMinus, UserX, DollarSign,
  Pencil, Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatCurrency, getInitials } from '@/lib/utils';

const PAGE_SIZE = 15;

const STATUS_TABS = [
  { value: '',           label: 'All' },
  { value: 'active',     label: 'Active' },
  { value: 'on_leave',   label: 'On Leave' },
  { value: 'terminated', label: 'Terminated' },
];

const EMPTY_FORM = {
  emp_code: '', full_name: '', email: '', phone: '', position: '',
  department_id: '', employment_type: 'full_time', join_date: '',
  salary: '', address: '', status: 'active',
};
type FormData = typeof EMPTY_FORM;

export default function EmployeesPage() {
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
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm]         = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  const [departments, setDepartments] = useState<any[]>([]);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/employees?meta=1').then((r) => r.json()).then((j) => setDepartments(j.departments ?? []));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, status: statusFilter, sortKey, sortDir,
    });
    const res = await fetch(`/api/employees?${qs}`);
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

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (row: any) => {
    setEditItem(row);
    setForm({
      emp_code:        row.emp_code ?? '',
      full_name:       row.full_name ?? '',
      email:           row.email ?? '',
      phone:           row.phone ?? '',
      position:        row.position ?? '',
      department_id:   row.department_id ?? '',
      employment_type: row.employment_type ?? 'full_time',
      join_date:       row.join_date ? String(row.join_date).slice(0, 10) : '',
      salary:          row.salary ? String(row.salary) : '',
      address:         row.address ?? '',
      status:          row.status ?? 'active',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.emp_code.trim()) { toast.warning('Validation', 'Employee code is required.'); return; }
    if (!form.full_name.trim()) { toast.warning('Validation', 'Full name is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        salary: form.salary ? parseFloat(form.salary) : 0,
        ...(editItem ? { id: editItem.id } : {}),
      };
      const res = await fetch('/api/employees', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editItem ? 'Employee Updated' : 'Employee Added', `${form.full_name} saved successfully.`);
      setFormOpen(false);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/employees?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Terminated', `${deleteTarget.full_name} has been terminated.`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setDeleting(false); }
  };

  const f = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const columns: Column[] = [
    { key: 'emp_code', label: 'Code', width: '100px', sortable: true,
      render: (r) => <span className="font-mono text-[0.7rem] text-amber-700 dark:text-amber-400">{r.emp_code}</span> },
    { key: 'full_name', label: 'Name', width: '200px', sortable: true,
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[0.58rem] font-bold">{getInitials(r.full_name)}</span>
          </div>
          <span className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{r.full_name}</span>
        </div>
      ) },
    { key: 'position', label: 'Position', width: '140px',
      render: (r) => <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">{r.position ?? '—'}</span> },
    { key: 'department_name', label: 'Department', width: '130px', sortable: true,
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.department_name ?? '—'}</span> },
    { key: 'employment_type', label: 'Type', width: '100px', sortable: true,
      render: (r) => <span className="text-xs capitalize text-slate-500 dark:text-[var(--dark-text-3)]">{r.employment_type?.replace('_', ' ') ?? '—'}</span> },
    { key: 'join_date', label: 'Join Date', width: '110px', sortable: true,
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.join_date ? formatDate(r.join_date) : '—'}</span> },
    { key: 'salary', label: 'Salary', width: '120px', sortable: true, align: 'right',
      render: (r) => <span className="text-xs font-medium tabular-nums">{formatCurrency(r.salary)}</span> },
    { key: 'status', label: 'Status', width: '100px', sortable: true,
      render: (r) => <Badge status={r.status} label={r.status?.replace('_', ' ')} /> },
    { key: 'actions', label: '', width: '70px', sortable: false, align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Edit"><Pencil size={11} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Terminate"><Trash2 size={11} /></button>
        </div>
      ) },
  ];

  const kpis = summary ? [
    { label: 'Total Employees', value: summary.total,      icon: Users,      color: 'text-blue-500',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Active',          value: summary.active,     icon: UserCheck,  color: 'text-green-500',  bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'On Leave',        value: summary.on_leave,   icon: UserMinus,  color: 'text-amber-500',  bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Terminated',      value: summary.terminated, icon: UserX,      color: 'text-red-500',    bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Total Salary',    value: formatCurrency(summary.total_salary), icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  ] : [];

  return (
    <div className="space-y-4">
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpis.map((k, i) => { const Icon = k.icon; return (
            <div key={k.label} className={`triumph-card p-4 flex items-center gap-3 anim-fade-up anim-d${Math.min(i+1,6)}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.bg}`}><Icon size={18} className={k.color} /></div>
              <div><p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{k.value}</p><p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">{k.label}</p></div>
            </div>
          ); })}
        </div>
      )}

      <DataTable columns={columns} data={data} total={total} page={page} pageSize={PAGE_SIZE} loading={loading}
        search={search} onSearchChange={handleSearchChange} onPageChange={setPage} onRowDoubleClick={openEdit}
        searchPlaceholder="Search by name, code, or email…" emptyIcon="👥" emptyText="No employees found."
        sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange}
        toolbar={<>
          <div className="flex gap-1">
            {STATUS_TABS.map((t) => (
              <button key={t.value} onClick={() => handleStatusChange(t.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${statusFilter===t.value ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'}`}>{t.label}</button>
            ))}
          </div>
          <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>Add Employee</Button>
        </>}
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Employee' : 'Add Employee'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="triumph-label">Employee Code *</label><input className="triumph-input" value={form.emp_code} onChange={(e) => f('emp_code', e.target.value)} placeholder="EMP-001" disabled={!!editItem} /></div>
          <div><label className="triumph-label">Full Name *</label><input className="triumph-input" value={form.full_name} onChange={(e) => f('full_name', e.target.value)} /></div>
          <div><label className="triumph-label">Email</label><input type="email" className="triumph-input" value={form.email} onChange={(e) => f('email', e.target.value)} /></div>
          <div><label className="triumph-label">Phone</label><input className="triumph-input" value={form.phone} onChange={(e) => f('phone', e.target.value)} /></div>
          <div><label className="triumph-label">Position</label><input className="triumph-input" value={form.position} onChange={(e) => f('position', e.target.value)} placeholder="Machine Operator" /></div>
          <div>
            <label className="triumph-label">Department</label>
            <select className="triumph-input" value={form.department_id} onChange={(e) => f('department_id', e.target.value)}>
              <option value="">— Select —</option>
              {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Employment Type</label>
            <select className="triumph-input" value={form.employment_type} onChange={(e) => f('employment_type', e.target.value)}>
              <option value="full_time">Full Time</option><option value="part_time">Part Time</option><option value="contract">Contract</option>
            </select>
          </div>
          <div><label className="triumph-label">Join Date</label><input type="date" className="triumph-input" value={form.join_date} onChange={(e) => f('join_date', e.target.value)} /></div>
          <div><label className="triumph-label">Salary (Rs)</label><input type="number" min="0" className="triumph-input" value={form.salary} onChange={(e) => f('salary', e.target.value)} /></div>
          <div>
            <label className="triumph-label">Status</label>
            <select className="triumph-input" value={form.status} onChange={(e) => f('status', e.target.value)}>
              <option value="active">Active</option><option value="on_leave">On Leave</option><option value="terminated">Terminated</option>
            </select>
          </div>
          <div className="sm:col-span-2"><label className="triumph-label">Address</label><textarea className="triumph-input resize-none" rows={2} value={form.address} onChange={(e) => f('address', e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          {editItem && <Button variant="danger" size="sm" onClick={() => { setFormOpen(false); setDeleteTarget(editItem); }} icon={<Trash2 size={12} />}>Terminate</Button>}
          <Button size="sm" onClick={handleSave} loading={saving}>{editItem ? 'Save Changes' : 'Add Employee'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        variant="danger" title="Terminate Employee?" message={`This will mark "${deleteTarget?.full_name ?? ''}" as terminated. Continue?`}
        confirmLabel="Terminate" loading={deleting} />
    </div>
  );
}

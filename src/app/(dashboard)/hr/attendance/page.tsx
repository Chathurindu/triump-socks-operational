'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Users, UserCheck, UserX, Clock, AlertTriangle, Timer,
  Pencil, Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

const PAGE_SIZE = 15;

const STATUS_TABS = [
  { value: '',        label: 'All' },
  { value: 'present', label: 'Present' },
  { value: 'absent',  label: 'Absent' },
  { value: 'late',    label: 'Late' },
  { value: 'leave',   label: 'Leave' },
];

const EMPTY_FORM = {
  employee_id: '', date: new Date().toISOString().split('T')[0],
  check_in: '', check_out: '', status: 'present', overtime_hrs: '', notes: '',
};
type FormData = typeof EMPTY_FORM;

export default function AttendancePage() {
  const [data, setData]       = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [page, setPage]       = useState(1);
  const [sortKey, setSortKey] = useState('emp_code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm]         = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  const [employees, setEmployees] = useState<any[]>([]);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/attendance?meta=1').then((r) => r.json()).then((j) => setEmployees(j.employees ?? []));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, status: statusFilter, date, sortKey, sortDir,
    });
    const res = await fetch(`/api/attendance?${qs}`);
    const json = await res.json();
    setData(json.data ?? []);
    setTotal(json.total ?? 0);
    setSummary(json.summary ?? null);
    setLoading(false);
  }, [page, statusFilter, search, date, sortKey, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleStatusChange = (v: string) => { setStatusFilter(v); setPage(1); };
  const handleSortChange   = (key: string, dir: 'asc' | 'desc') => { setSortKey(key); setSortDir(dir); setPage(1); };

  const openAdd = () => { setEditItem(null); setForm({ ...EMPTY_FORM, date }); setFormOpen(true); };
  const openEdit = (row: any) => {
    setEditItem(row);
    setForm({
      employee_id:  row.employee_id ?? '',
      date:         row.date ? String(row.date).slice(0, 10) : date,
      check_in:     row.check_in ?? '',
      check_out:    row.check_out ?? '',
      status:       row.status ?? 'present',
      overtime_hrs: row.overtime_hrs ? String(row.overtime_hrs) : '',
      notes:        row.notes ?? '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.employee_id) { toast.warning('Validation', 'Employee is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        overtime_hrs: form.overtime_hrs ? parseFloat(form.overtime_hrs) : 0,
      };
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Saved', editItem ? 'Attendance record updated.' : 'Attendance marked.');
      setFormOpen(false);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/attendance?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', 'Attendance record deleted.');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setDeleting(false); }
  };

  const f = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const columns: Column[] = [
    { key: 'emp_code', label: 'Code', width: '100px', sortable: true,
      render: (r) => <span className="font-mono text-[0.7rem] text-amber-700 dark:text-amber-400">{r.emp_code}</span> },
    { key: 'full_name', label: 'Employee', width: '180px', sortable: true,
      render: (r) => <span className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{r.full_name}</span> },
    { key: 'department_name', label: 'Department', width: '130px', sortable: true,
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.department_name ?? '—'}</span> },
    { key: 'check_in', label: 'Check In', width: '100px', sortable: true,
      render: (r) => <span className="text-sm tabular-nums text-slate-600 dark:text-[var(--dark-text-2)]">{r.check_in ?? '—'}</span> },
    { key: 'check_out', label: 'Check Out', width: '100px', sortable: true,
      render: (r) => <span className="text-sm tabular-nums text-slate-600 dark:text-[var(--dark-text-2)]">{r.check_out ?? '—'}</span> },
    { key: 'overtime_hrs', label: 'OT (hrs)', width: '90px', sortable: true, align: 'right',
      render: (r) => <span className="text-sm tabular-nums">{parseFloat(r.overtime_hrs || 0).toFixed(1)}</span> },
    { key: 'status', label: 'Status', width: '100px', sortable: true,
      render: (r) => <Badge status={r.status} /> },
    { key: 'actions', label: '', width: '70px', sortable: false, align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Edit"><Pencil size={11} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete"><Trash2 size={11} /></button>
        </div>
      ) },
  ];

  const kpis = summary ? [
    { label: 'Total Records', value: summary.total,         icon: Users,         color: 'text-blue-500',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Present',       value: summary.present,       icon: UserCheck,     color: 'text-green-500',  bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Absent',        value: summary.absent,        icon: UserX,         color: 'text-red-500',    bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Late',          value: summary.late,          icon: AlertTriangle, color: 'text-amber-500',  bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'On Leave',      value: summary.on_leave,      icon: Clock,         color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { label: 'Total OT',      value: `${summary.total_overtime ?? 0} hrs`, icon: Timer, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  ] : [];

  return (
    <div className="space-y-4">
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
        searchPlaceholder="Search by name or code…" emptyIcon="📋" emptyText="No attendance records found."
        sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange}
        toolbar={<>
          <div className="flex items-center gap-2">
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} className="triumph-input w-36" />
            <div className="flex gap-1">
              {STATUS_TABS.map((t) => (
                <button key={t.value} onClick={() => handleStatusChange(t.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${statusFilter===t.value ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'}`}>{t.label}</button>
              ))}
            </div>
          </div>
          <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>Mark Attendance</Button>
        </>}
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Attendance' : 'Mark Attendance'} size="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">Employee *</label>
            <select className="triumph-input" value={form.employee_id} onChange={(e) => f('employee_id', e.target.value)} disabled={!!editItem}>
              <option value="">— Select Employee —</option>
              {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.emp_code} — {emp.full_name}</option>)}
            </select>
          </div>
          <div><label className="triumph-label">Date</label><input type="date" className="triumph-input" value={form.date} onChange={(e) => f('date', e.target.value)} /></div>
          <div><label className="triumph-label">Check In</label><input type="time" className="triumph-input" value={form.check_in} onChange={(e) => f('check_in', e.target.value)} /></div>
          <div><label className="triumph-label">Check Out</label><input type="time" className="triumph-input" value={form.check_out} onChange={(e) => f('check_out', e.target.value)} /></div>
          <div>
            <label className="triumph-label">Status</label>
            <select className="triumph-input" value={form.status} onChange={(e) => f('status', e.target.value)}>
              <option value="present">Present</option><option value="absent">Absent</option>
              <option value="late">Late</option><option value="leave">Leave</option>
            </select>
          </div>
          <div><label className="triumph-label">Overtime (hrs)</label><input type="number" min="0" step="0.5" className="triumph-input" value={form.overtime_hrs} onChange={(e) => f('overtime_hrs', e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="triumph-label">Notes</label><textarea className="triumph-input resize-none" rows={2} value={form.notes} onChange={(e) => f('notes', e.target.value)} placeholder="Optional notes…" /></div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          {editItem && <Button variant="danger" size="sm" onClick={() => { setFormOpen(false); setDeleteTarget(editItem); }} icon={<Trash2 size={12} />}>Delete</Button>}
          <Button size="sm" onClick={handleSave} loading={saving}>{editItem ? 'Save Changes' : 'Mark Attendance'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        variant="danger" title="Delete Attendance Record?" message="This will permanently delete this attendance record. Continue?"
        confirmLabel="Delete Record" loading={deleting} />
    </div>
  );
}

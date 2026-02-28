'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Pencil, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';

const PAGE_SIZE = 15;
const EMPTY_FORM = {
  emp_code: '', full_name: '', email: '', phone: '', position: '',
  department_id: '', employment_type: 'full_time', join_date: '', salary: '', address: '', status: 'active',
};
type FormData = typeof EMPTY_FORM;

export default function EmployeesPage() {
  const [employees, setEmployees]     = useState<any[]>([]);
  const [total, setTotal]             = useState(0);
  const [search, setSearch]           = useState('');
  const [status, setStatus]           = useState('');
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [formOpen, setFormOpen]       = useState(false);
  const [editItem, setEditItem]       = useState<any>(null);
  const [form, setForm]               = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/employees?meta=1').then((r) => r.json()).then((j) => setDepartments(j.departments ?? []));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/employees?search=${encodeURIComponent(search)}&status=${status}&page=${page}&limit=${PAGE_SIZE}`);
    const json = await res.json();
    setEmployees(json.data ?? []);
    setTotal(json.total ?? 0);
    setLoading(false);
  }, [search, status, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleStatusChange = (v: string) => { setStatus(v); setPage(1); };

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (emp: any) => {
    setEditItem(emp);
    setForm({
      emp_code: emp.emp_code ?? '', full_name: emp.full_name ?? '', email: emp.email ?? '',
      phone: emp.phone ?? '', position: emp.position ?? '', department_id: emp.department_id ?? '',
      employment_type: emp.employment_type ?? 'full_time',
      join_date: emp.join_date ? String(emp.join_date).slice(0, 10) : '',
      salary: String(emp.salary ?? ''), address: emp.address ?? '', status: emp.status ?? 'active',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, salary: parseFloat(form.salary) || 0, ...(editItem ? { id: editItem.id } : {}) };
    await fetch('/api/employees', {
      method: editItem ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false); setFormOpen(false); fetchData();
  };

  const handleTerminate = async (id: string) => {
    if (!confirm('Terminate this employee?')) return;
    await fetch(`/api/employees?id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  const f = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-800 dark:text-[var(--dark-text)]">Employees</h1>
          <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{total} total employees</p>
        </div>
        <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>Add Employee</Button>
      </div>

      <Card noPad>
        <div className="flex items-center flex-wrap gap-2 px-4 py-3 border-b border-slate-100 dark:border-[var(--dark-border)]">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search employeesâ€¦" className="triumph-input pl-8 w-52" />
          </div>
          <div className="flex gap-1 ml-auto">
            {(['', 'active', 'on-leave', 'terminated'] as const).map((s) => (
              <button key={s} onClick={() => handleStatusChange(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize ${status === s ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'}`}>
                {s === '' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full" /></div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="w-full triumph-table">
                <thead>
                  <tr><th>Code</th><th>Name</th><th>Position</th><th>Department</th><th>Type</th><th>Join Date</th><th className="text-right">Salary</th><th>Status</th><th className="text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr><td colSpan={9} className="text-center text-xs text-slate-400 py-8">No employees found.</td></tr>
                  ) : employees.map((emp) => (
                    <tr key={emp.id}>
                      <td className="font-mono text-[0.7rem] text-amber-700 dark:text-amber-400">{emp.emp_code}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[0.58rem] font-bold">{getInitials(emp.full_name)}</span>
                          </div>
                          <span className="font-medium text-[0.8125rem]">{emp.full_name}</span>
                        </div>
                      </td>
                      <td className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">{emp.position}</td>
                      <td className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{emp.department_name ?? 'â€”'}</td>
                      <td className="text-xs capitalize text-slate-500 dark:text-[var(--dark-text-3)]">{emp.employment_type?.replace('_', ' ')}</td>
                      <td className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{formatDate(emp.join_date)}</td>
                      <td className="text-right text-xs tabular-nums font-medium">{formatCurrency(emp.salary)}</td>
                      <td><Badge status={emp.status} label={emp.status?.replace('-', ' ')} /></td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(emp)} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Edit"><Pencil size={11} /></button>
                          <button onClick={() => handleTerminate(emp.id)} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Terminate"><UserX size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 dark:border-[var(--dark-border)]">
              <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
            </div>
          </>
        )}
      </Card>

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
              <option value="">â€” Select â€”</option>
              {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Employment Type</label>
            <select className="triumph-input" value={form.employment_type} onChange={(e) => f('employment_type', e.target.value)}>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
            </select>
          </div>
          <div><label className="triumph-label">Join Date</label><input type="date" className="triumph-input" value={form.join_date} onChange={(e) => f('join_date', e.target.value)} /></div>
          <div><label className="triumph-label">Salary (Rs)</label><input type="number" min="0" className="triumph-input" value={form.salary} onChange={(e) => f('salary', e.target.value)} /></div>
          <div>
            <label className="triumph-label">Status</label>
            <select className="triumph-input" value={form.status} onChange={(e) => f('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="on-leave">On Leave</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
          <div className="sm:col-span-2"><label className="triumph-label">Address</label><textarea className="triumph-input resize-none" rows={2} value={form.address} onChange={(e) => f('address', e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Savingâ€¦' : editItem ? 'Save Changes' : 'Add Employee'}</Button>
        </div>
      </Modal>
    </div>
  );
}

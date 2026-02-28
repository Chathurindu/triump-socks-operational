'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Users, DollarSign, CreditCard, Clock, Wallet,
  Pencil, Trash2, Calculator,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, getMonthName } from '@/lib/utils';

const PAGE_SIZE = 15;

const EMPTY_FORM = {
  employee_id: '', basic_salary: '', allowances: '', deductions: '',
  overtime_pay: '', bonus: '', tax: '', payment_date: '', payment_status: 'pending', notes: '',
};
type FormData = typeof EMPTY_FORM;

export default function PayrollPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear]   = useState(String(now.getFullYear()));

  const [data, setData]       = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [search, setSearch]   = useState('');
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
    fetch('/api/payroll?meta=1').then((r) => r.json()).then((j) => setEmployees(j.employees ?? []));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, month, year, sortKey, sortDir,
    });
    const res = await fetch(`/api/payroll?${qs}`);
    const json = await res.json();
    setData(json.data ?? []);
    setTotal(json.total ?? 0);
    setSummary(json.summary ?? null);
    setLoading(false);
  }, [page, search, month, year, sortKey, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleSortChange   = (key: string, dir: 'asc' | 'desc') => { setSortKey(key); setSortDir(dir); setPage(1); };

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (row: any) => {
    setEditItem(row);
    setForm({
      employee_id:    row.employee_id ?? '',
      basic_salary:   row.basic_salary ? String(row.basic_salary) : '',
      allowances:     row.allowances ? String(row.allowances) : '',
      deductions:     row.deductions ? String(row.deductions) : '',
      overtime_pay:   row.overtime_pay ? String(row.overtime_pay) : '',
      bonus:          row.bonus ? String(row.bonus) : '',
      tax:            row.tax ? String(row.tax) : '',
      payment_date:   row.payment_date ? String(row.payment_date).slice(0, 10) : '',
      payment_status: row.payment_status ?? 'pending',
      notes:          row.notes ?? '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!editItem && !form.employee_id) { toast.warning('Validation', 'Employee is required.'); return; }
    if (!form.basic_salary) { toast.warning('Validation', 'Basic salary is required.'); return; }
    setSaving(true);
    try {
      const toNum = (v: string) => v ? parseFloat(v) : 0;
      const payload = {
        employee_id: form.employee_id,
        period_month: parseInt(month), period_year: parseInt(year),
        basic_salary: toNum(form.basic_salary), allowances: toNum(form.allowances),
        deductions: toNum(form.deductions), overtime_pay: toNum(form.overtime_pay),
        bonus: toNum(form.bonus), tax: toNum(form.tax),
        payment_date: form.payment_date || null,
        payment_status: form.payment_status, notes: form.notes || null,
        ...(editItem ? { id: editItem.id } : {}),
      };
      const res = await fetch('/api/payroll', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editItem ? 'Updated' : 'Created', editItem ? 'Payroll record updated.' : 'Payroll record created.');
      setFormOpen(false);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/payroll?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', 'Payroll record deleted.');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setDeleting(false); }
  };

  const f = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const columns: Column[] = [
    { key: 'emp_code', label: 'Code', width: '90px', sortable: true,
      render: (r) => <span className="font-mono text-[0.7rem] text-amber-700 dark:text-amber-400">{r.emp_code}</span> },
    { key: 'full_name', label: 'Employee', width: '170px', sortable: true,
      render: (r) => <span className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{r.full_name}</span> },
    { key: 'department_name', label: 'Dept', width: '120px', sortable: true,
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.department_name ?? '—'}</span> },
    { key: 'basic_salary', label: 'Basic', width: '100px', sortable: true, align: 'right',
      render: (r) => <span className="text-xs tabular-nums">{formatCurrency(r.basic_salary)}</span> },
    { key: 'allowances', label: 'Allow.', width: '90px', align: 'right',
      render: (r) => <span className="text-xs tabular-nums text-green-600 dark:text-green-400">{formatCurrency(r.allowances)}</span> },
    { key: 'deductions', label: 'Deduct.', width: '90px', align: 'right',
      render: (r) => <span className="text-xs tabular-nums text-red-600 dark:text-red-400">{formatCurrency(r.deductions)}</span> },
    { key: 'net_salary', label: 'Net Salary', width: '120px', sortable: true, align: 'right',
      render: (r) => <span className="text-sm font-semibold tabular-nums">{formatCurrency(r.net_salary)}</span> },
    { key: 'payment_status', label: 'Status', width: '100px', sortable: true,
      render: (r) => <Badge status={r.payment_status} /> },
    { key: 'actions', label: '', width: '70px', sortable: false, align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Edit"><Pencil size={11} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete"><Trash2 size={11} /></button>
        </div>
      ) },
  ];

  const kpis = summary ? [
    { label: 'Employees',       value: summary.total_records ?? 0, icon: Users,      color: 'text-blue-500',    bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Total Basic',     value: formatCurrency(summary.total_basic),    icon: Wallet,     color: 'text-slate-500',   bg: 'bg-slate-100 dark:bg-slate-700/30' },
    { label: 'Total Net',       value: formatCurrency(summary.total_net),      icon: DollarSign,  color: 'text-green-500',   bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Paid',            value: summary.paid ?? 0,                      icon: CreditCard,  color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Pending',         value: summary.pending ?? 0,                   icon: Clock,       color: 'text-amber-500',   bg: 'bg-amber-100 dark:bg-amber-900/30' },
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
        searchPlaceholder="Search by name or code…" emptyIcon="💰" emptyText={`No payroll records for ${getMonthName(parseInt(month))} ${year}.`}
        sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange}
        toolbar={<>
          <div className="flex items-center gap-2">
            <select value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }} className="triumph-input w-30">
              {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={String(i+1)}>{getMonthName(i+1)}</option>)}
            </select>
            <select value={year} onChange={(e) => { setYear(e.target.value); setPage(1); }} className="triumph-input w-20">
              {[2024, 2025, 2026].map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
          <Link href="/hr/payroll-calculator">
            <Button variant="secondary" size="sm" icon={<Calculator size={13} />}>Calculator</Button>
          </Link>
          <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>Process Payroll</Button>
        </>}
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Payroll' : 'Process Payroll'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="triumph-label">Employee *</label>
            <select className="triumph-input" value={form.employee_id} onChange={(e) => {
              f('employee_id', e.target.value);
              const emp = employees.find((x: any) => x.id === e.target.value);
              if (emp && !form.basic_salary) f('basic_salary', String(emp.salary ?? ''));
            }} disabled={!!editItem}>
              <option value="">— Select Employee —</option>
              {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.emp_code} — {emp.full_name}</option>)}
            </select>
          </div>
          <div><label className="triumph-label">Basic Salary (Rs) *</label><input type="number" min="0" step="0.01" className="triumph-input" value={form.basic_salary} onChange={(e) => f('basic_salary', e.target.value)} /></div>
          <div><label className="triumph-label">Allowances (Rs)</label><input type="number" min="0" step="0.01" className="triumph-input" value={form.allowances} onChange={(e) => f('allowances', e.target.value)} /></div>
          <div><label className="triumph-label">Deductions (Rs)</label><input type="number" min="0" step="0.01" className="triumph-input" value={form.deductions} onChange={(e) => f('deductions', e.target.value)} /></div>
          <div><label className="triumph-label">Overtime Pay (Rs)</label><input type="number" min="0" step="0.01" className="triumph-input" value={form.overtime_pay} onChange={(e) => f('overtime_pay', e.target.value)} /></div>
          <div><label className="triumph-label">Bonus (Rs)</label><input type="number" min="0" step="0.01" className="triumph-input" value={form.bonus} onChange={(e) => f('bonus', e.target.value)} /></div>
          <div><label className="triumph-label">Tax (Rs)</label><input type="number" min="0" step="0.01" className="triumph-input" value={form.tax} onChange={(e) => f('tax', e.target.value)} /></div>
          <div><label className="triumph-label">Payment Date</label><input type="date" className="triumph-input" value={form.payment_date} onChange={(e) => f('payment_date', e.target.value)} /></div>
          <div>
            <label className="triumph-label">Payment Status</label>
            <select className="triumph-input" value={form.payment_status} onChange={(e) => f('payment_status', e.target.value)}>
              <option value="pending">Pending</option><option value="paid">Paid</option>
            </select>
          </div>
          <div className="sm:col-span-2"><label className="triumph-label">Notes</label><textarea className="triumph-input resize-none" rows={2} value={form.notes} onChange={(e) => f('notes', e.target.value)} placeholder="Optional notes…" /></div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          {editItem && <Button variant="danger" size="sm" onClick={() => { setFormOpen(false); setDeleteTarget(editItem); }} icon={<Trash2 size={12} />}>Delete</Button>}
          <Button size="sm" onClick={handleSave} loading={saving}>{editItem ? 'Save Changes' : 'Process'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        variant="danger" title="Delete Payroll Record?" message={`This will permanently delete the payroll record for "${deleteTarget?.full_name ?? ''}". Continue?`}
        confirmLabel="Delete Record" loading={deleting} />
    </div>
  );
}

'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Receipt, TrendingDown, Wallet, Calendar,
  Pencil, Trash2, BarChart3, PieChart as PieIcon,
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

const PIE_COLORS = ['#d4730a', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#6366f1', '#ec4899', '#64748b'];

const PAYMENT_METHODS = [
  { value: 'cash',            label: 'Cash' },
  { value: 'bank_transfer',   label: 'Bank Transfer' },
  { value: 'cheque',          label: 'Cheque' },
  { value: 'mobile_payment',  label: 'Mobile Payment' },
  { value: 'card',            label: 'Card' },
];

type FormData = {
  expense_date: string; category_id: string; description: string;
  amount: string; payment_method: string; notes: string;
};

const EMPTY: FormData = {
  expense_date: new Date().toISOString().slice(0, 10),
  category_id: '', description: '', amount: '', payment_method: 'cash', notes: '',
};

export default function ExpensesPage() {
  const [data, setData]             = useState<any[]>([]);
  const [total, setTotal]           = useState(0);
  const [summary, setSummary]       = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [fromDate, setFromDate]     = useState('');
  const [toDate, setToDate]         = useState('');
  const [page, setPage]             = useState(1);
  const [sortKey, setSortKey]       = useState('expense_date');
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading]       = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState<FormData>({ ...EMPTY });
  const [saving, setSaving]     = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  // Report
  const [showReport, setShowReport]     = useState(false);
  const [reportYear, setReportYear]     = useState(new Date().getFullYear());
  const [report, setReport]             = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const toast = useToast();

  useEffect(() => {
    fetch('/api/expenses?meta=1').then(r => r.json()).then(j => setCategories(j.categories ?? []));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, category: catFilter, from: fromDate, to: toDate, sortKey, sortDir,
    });
    const res = await fetch(`/api/expenses?${qs}`);
    const json = await res.json();
    setData(json.data ?? []);
    setTotal(json.total ?? 0);
    setSummary(json.summary ?? null);
    setLoading(false);
  }, [page, catFilter, fromDate, toDate, search, sortKey, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    const res = await fetch(`/api/expenses?report=1&year=${reportYear}`);
    const json = await res.json();
    setReport(json);
    setReportLoading(false);
  }, [reportYear]);

  useEffect(() => { if (showReport) fetchReport(); }, [showReport, fetchReport]);

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleSortChange   = (key: string, dir: 'asc' | 'desc') => { setSortKey(key); setSortDir(dir); setPage(1); };

  const openAdd = () => { setEditId(null); setForm({ ...EMPTY }); setFormOpen(true); };
  const openEdit = (row: any) => {
    setEditId(row.id);
    setForm({
      expense_date: row.expense_date?.slice(0, 10) ?? '', category_id: row.category_id ? String(row.category_id) : '',
      description: row.description ?? '', amount: String(row.amount ?? ''),
      payment_method: row.payment_method ?? 'cash', notes: row.notes ?? '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.amount || isNaN(+form.amount)) { toast.warning('Validation', 'Valid amount is required.'); return; }
    setSaving(true);
    try {
      const method = editId ? 'PATCH' : 'POST';
      const body = editId ? { id: editId, ...form, amount: Number(form.amount), category_id: form.category_id ? Number(form.category_id) : null }
                          : { ...form, amount: Number(form.amount), category_id: form.category_id ? Number(form.category_id) : null };
      const res = await fetch('/api/expenses', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editId ? 'Updated' : 'Created', `Expense ${editId ? 'updated' : 'logged'} successfully.`);
      setFormOpen(false);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', 'Expense deleted.');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setDeleting(false); }
  };

  const f = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }));

  const columns: Column[] = [
    { key: 'expense_date', label: 'Date', width: '100px', sortable: true,
      render: r => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{formatDate(r.expense_date)}</span> },
    { key: 'category', label: 'Category', width: '130px', sortable: true,
      render: r => <Badge label={r.category_name ?? 'Uncategorized'} color={r.category_color ?? 'gray'} /> },
    { key: 'description', label: 'Description', sortable: true,
      render: r => <span className="text-xs text-slate-600 dark:text-[var(--dark-text)] truncate block max-w-[200px]">{r.description ?? '—'}</span> },
    { key: 'payment_method', label: 'Method', width: '110px',
      render: r => <span className="text-xs text-slate-400 capitalize">{(r.payment_method ?? '').replace('_', ' ')}</span> },
    { key: 'amount', label: 'Amount', width: '120px', sortable: true, align: 'right',
      render: r => <span className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">-{formatCurrency(r.amount)}</span> },
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
    { label: 'Total Expenses',    value: formatCurrency(parseFloat(summary.total_amount)),  icon: TrendingDown, color: 'text-red-500',    bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'This Month',        value: formatCurrency(parseFloat(summary.this_month)),    icon: Calendar,     color: 'text-blue-500',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Avg Expense',       value: formatCurrency(parseFloat(summary.avg_expense)),   icon: Wallet,       color: 'text-amber-500',  bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Total Entries',     value: summary.total_count,                               icon: Receipt,      color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  ] : [];

  // Build monthly chart data (12 months)
  const monthlyChartData = Array.from({ length: 12 }, (_, i) => ({
    month: getMonthName(i + 1).slice(0, 3),
    total: parseFloat(report?.monthly?.find((m: any) => m.month === i + 1)?.total ?? 0),
  }));

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

      {/* Report Toggle */}
      <div className="flex justify-end">
        <Button variant={showReport ? 'primary' : 'outline'} size="sm" icon={<BarChart3 size={13} />}
          onClick={() => setShowReport(p => !p)}>
          {showReport ? 'Hide Report' : 'Monthly Report'}
        </Button>
      </div>

      {/* Monthly Report */}
      {showReport && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 anim-fade-up">
          <Card title={`Monthly Expenses — ${reportYear}`} className="lg:col-span-2"
            action={
              <div className="flex items-center gap-1">
                <button onClick={() => setReportYear(y => y - 1)} className="text-xs px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-[var(--dark-surface)] transition-colors">&larr;</button>
                <span className="text-xs font-semibold text-slate-600 dark:text-white">{reportYear}</span>
                <button onClick={() => setReportYear(y => y + 1)} className="text-xs px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-[var(--dark-surface)] transition-colors">&rarr;</button>
              </div>
            }>
            {reportLoading ? (
              <div className="flex items-center justify-center h-40"><div className="animate-spin w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="total" fill="#ef4444" radius={[3, 3, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="By Category">
            {reportLoading ? (
              <div className="flex items-center justify-center h-40"><div className="animate-spin w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full" /></div>
            ) : report?.byCategory?.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={report.byCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={70}
                    label={({ name, percent }: any) => `${(name ?? '').split(' ')[0]} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false} style={{ fontSize: 9 }}>
                    {report.byCategory.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-slate-400 text-center py-8">No data for this year.</p>}
          </Card>
        </div>
      )}

      <DataTable columns={columns} data={data} total={total} page={page} pageSize={PAGE_SIZE} loading={loading}
        search={search} onSearchChange={handleSearchChange} onPageChange={setPage}
        searchPlaceholder="Search expenses…" emptyIcon="💸" emptyText="No expenses found."
        sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange}
        onRowDoubleClick={openEdit}
        toolbar={<>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => { setCatFilter(''); setPage(1); }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${!catFilter ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'}`}>All</button>
            {categories.map(c => (
              <button key={c.id} onClick={() => { setCatFilter(String(c.id)); setPage(1); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${catFilter === String(c.id) ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'}`}>{c.name}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} className="triumph-input !py-1 !text-xs !w-32" />
            <span className="text-[0.6rem] text-slate-400">to</span>
            <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} className="triumph-input !py-1 !text-xs !w-32" />
          </div>
          <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>Log Expense</Button>
        </>}
      />

      {/* Form Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? 'Edit Expense' : 'Log Expense'} size="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="triumph-label">Date *</label><input type="date" className="triumph-input" value={form.expense_date} onChange={e => f('expense_date', e.target.value)} /></div>
          <div>
            <label className="triumph-label">Category</label>
            <select className="triumph-input" value={form.category_id} onChange={e => f('category_id', e.target.value)}>
              <option value="">— Select —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="triumph-label">Amount *</label><input type="number" step="0.01" className="triumph-input" value={form.amount} onChange={e => f('amount', e.target.value)} placeholder="0.00" /></div>
          <div>
            <label className="triumph-label">Payment Method</label>
            <select className="triumph-input" value={form.payment_method} onChange={e => f('payment_method', e.target.value)}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className="triumph-label">Description</label><input className="triumph-input" value={form.description} onChange={e => f('description', e.target.value)} placeholder="What was this expense for?" /></div>
          <div className="sm:col-span-2"><label className="triumph-label">Notes</label><textarea className="triumph-input resize-none" rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} loading={saving}>{editId ? 'Update' : 'Log Expense'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        variant="danger" title="Delete Expense?" message={`Delete this expense of ${formatCurrency(parseFloat(deleteTarget?.amount ?? 0))}? This action cannot be undone.`}
        confirmLabel="Delete" loading={deleting} />
    </div>
  );
}

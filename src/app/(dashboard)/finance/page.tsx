'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, TrendingUp, TrendingDown, DollarSign, Receipt,
  Pencil, Trash2, Wallet, Building2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';

const PAGE_SIZE = 15;

const TYPE_TABS = [
  { value: '',        label: 'All' },
  { value: 'income',  label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

const EMPTY: Record<string, string> = {
  txn_date: new Date().toISOString().substring(0, 10),
  txn_type: 'expense', category: '', description: '', amount: '', account_id: '',
};

export default function FinancePage() {
  const [data, setData]       = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [search, setSearch]   = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate]     = useState('');
  const [toDate, setToDate]         = useState('');
  const [page, setPage]             = useState(1);
  const [sortKey, setSortKey]       = useState('txn_date');
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading]       = useState(true);

  const [formOpen, setFormOpen]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState({ ...EMPTY });
  const [saving, setSaving]         = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  const [accountsMeta, setAccountsMeta] = useState<any[]>([]);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/finance?meta=1').then((r) => r.json()).then((j) => setAccountsMeta(j.accounts ?? []));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, type: typeFilter, from: fromDate, to: toDate, sortKey, sortDir,
    });
    const res = await fetch(`/api/finance?${qs}`);
    const json = await res.json();
    setData(json.data ?? []);
    setTotal(json.total ?? 0);
    setSummary(json.summary ?? null);
    setAccounts(json.accounts ?? []);
    setLoading(false);
  }, [page, typeFilter, fromDate, toDate, search, sortKey, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleTypeChange   = (v: string) => { setTypeFilter(v); setPage(1); };
  const handleSortChange   = (key: string, dir: 'asc' | 'desc') => { setSortKey(key); setSortDir(dir); setPage(1); };

  const openAdd = () => { setEditId(null); setForm({ ...EMPTY }); setFormOpen(true); };
  const openEdit = (row: any) => {
    setEditId(row.id);
    setForm({
      txn_date: row.txn_date?.substring(0, 10) ?? '', txn_type: row.txn_type ?? 'expense',
      category: row.category ?? '', description: row.description ?? '',
      amount: String(row.amount ?? ''), account_id: row.account_id ?? '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.txn_date) { toast.warning('Validation', 'Date is required.'); return; }
    if (!form.amount || isNaN(+form.amount)) { toast.warning('Validation', 'Valid amount is required.'); return; }
    setSaving(true);
    try {
      const method = editId ? 'PATCH' : 'POST';
      const body = editId ? { id: editId, ...form, amount: Number(form.amount) } : { ...form, amount: Number(form.amount) };
      const res = await fetch('/api/finance', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editId ? 'Updated' : 'Created', `Transaction ${editId ? 'updated' : 'created'} successfully.`);
      setFormOpen(false);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/finance?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', 'Transaction deleted.');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setDeleting(false); }
  };

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const netProfit = (summary?.total_income ?? 0) - (summary?.total_expense ?? 0);

  const columns: Column[] = [
    { key: 'txn_date', label: 'Date', width: '110px', sortable: true,
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{formatDate(r.txn_date)}</span> },
    { key: 'txn_type', label: 'Type', width: '90px', sortable: true,
      render: (r) => <Badge label={r.txn_type} color={r.txn_type === 'income' ? 'green' : 'red'} /> },
    { key: 'category', label: 'Category', width: '120px', sortable: true,
      render: (r) => <span className="text-xs font-medium text-slate-600 dark:text-[var(--dark-text-2)]">{r.category ?? '—'}</span> },
    { key: 'description', label: 'Description', sortable: true,
      render: (r) => <span className="text-xs text-slate-600 dark:text-[var(--dark-text)] truncate block max-w-[200px]">{r.description ?? '—'}</span> },
    { key: 'account_name', label: 'Account', width: '130px', sortable: true,
      render: (r) => <span className="text-xs text-slate-400 dark:text-[var(--dark-text-3)]">{r.account_name ?? '—'}</span> },
    { key: 'amount', label: 'Amount', width: '120px', sortable: true, align: 'right',
      render: (r) => (
        <span className={`text-sm font-semibold tabular-nums ${r.txn_type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {r.txn_type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
        </span>
      ) },
    { key: 'actions', label: '', width: '70px', sortable: false, align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Edit"><Pencil size={11} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete"><Trash2 size={11} /></button>
        </div>
      ) },
  ];

  const kpis = summary ? [
    { label: 'Total Income',  value: formatCurrency(summary.total_income),  icon: TrendingUp,   color: 'text-green-500',  bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Total Expense', value: formatCurrency(summary.total_expense), icon: TrendingDown,  color: 'text-red-500',    bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Net Profit',    value: formatCurrency(netProfit),             icon: DollarSign,    color: netProfit >= 0 ? 'text-emerald-500' : 'text-red-500', bg: netProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Transactions',  value: summary.total_txns,                    icon: Receipt,       color: 'text-blue-500',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
  ] : [];

  /* --- Accounts sidebar data --- */
  const acctsByType: Record<string, any[]> = {};
  for (const a of accounts) { const t = a.type ?? 'other'; (acctsByType[t] ??= []).push(a); }

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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Accounts Sidebar */}
        <div className="triumph-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-[var(--dark-border)] flex items-center gap-2">
            <Building2 size={14} className="text-amber-500" />
            <h3 className="text-xs font-semibold text-slate-800 dark:text-white">Chart of Accounts</h3>
          </div>
          <div className="p-2 space-y-3 max-h-[26rem] overflow-y-auto">
            {Object.entries(acctsByType).map(([type, list]) => (
              <div key={type}>
                <p className="text-[0.6rem] uppercase font-bold text-slate-400 dark:text-[var(--dark-text-3)] mb-1 px-2">{type}</p>
                {list.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors">
                    <p className="text-xs font-medium text-slate-700 dark:text-[var(--dark-text)]">{a.name}</p>
                    <span className={`text-xs font-semibold tabular-nums ${['expense','liability'].includes(a.type) ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {formatCurrency(parseFloat(a.balance || 0))}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Transactions DataTable */}
        <div className="lg:col-span-3">
          <DataTable columns={columns} data={data} total={total} page={page} pageSize={PAGE_SIZE} loading={loading}
            search={search} onSearchChange={handleSearchChange} onPageChange={setPage}
            searchPlaceholder="Search transactions…" emptyIcon="💰" emptyText="No transactions found."
            sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange}
            onRowDoubleClick={openEdit}
            toolbar={<>
              <div className="flex gap-1">
                {TYPE_TABS.map((t) => (
                  <button key={t.value} onClick={() => handleTypeChange(t.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${typeFilter===t.value ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'}`}>{t.label}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="triumph-input !py-1 !text-xs !w-32" />
                <span className="text-[0.6rem] text-slate-400">to</span>
                <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="triumph-input !py-1 !text-xs !w-32" />
              </div>
              <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>Add Transaction</Button>
            </>}
          />
        </div>
      </div>

      {/* Form Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? 'Edit Transaction' : 'New Transaction'} size="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="triumph-label">Date *</label><input type="date" className="triumph-input" value={form.txn_date} onChange={(e) => f('txn_date', e.target.value)} /></div>
          <div>
            <label className="triumph-label">Type *</label>
            <select className="triumph-input" value={form.txn_type} onChange={(e) => f('txn_type', e.target.value)}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div><label className="triumph-label">Category</label><input className="triumph-input" value={form.category} onChange={(e) => f('category', e.target.value)} placeholder="e.g. Salary, Utilities" /></div>
          <div>
            <label className="triumph-label">Account</label>
            <select className="triumph-input" value={form.account_id} onChange={(e) => f('account_id', e.target.value)}>
              <option value="">— Select Account —</option>
              {accountsMeta.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
          </div>
          <div><label className="triumph-label">Amount *</label><input type="number" step="0.01" className="triumph-input" value={form.amount} onChange={(e) => f('amount', e.target.value)} placeholder="0.00" /></div>
          <div className="sm:col-span-2"><label className="triumph-label">Description</label><textarea className="triumph-input resize-none" rows={2} value={form.description} onChange={(e) => f('description', e.target.value)} placeholder="Transaction description…" /></div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} loading={saving}>{editId ? 'Update' : 'Create'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        variant="danger" title="Delete Transaction?" message={`Delete this ${deleteTarget?.txn_type ?? ''} transaction of ${formatCurrency(deleteTarget?.amount ?? 0)}? This action cannot be undone.`}
        confirmLabel="Delete" loading={deleting} />
    </div>
  );
}

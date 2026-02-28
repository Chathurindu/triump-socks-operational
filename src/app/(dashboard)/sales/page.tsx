'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, ShoppingBag, Clock, CheckCircle2, Truck, DollarSign,
  CreditCard, Pencil, Trash2,
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
  { value: '',          label: 'All' },
  { value: 'pending',   label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped',   label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const EMPTY_FORM = {
  customer_id: '', order_date: '', delivery_date: '',
  status: 'pending', total_amount: '', discount: '', tax_amount: '',
  payment_status: 'unpaid', notes: '',
};
type FormData = typeof EMPTY_FORM;

export default function SalesPage() {
  const [data, setData]                 = useState<any[]>([]);
  const [total, setTotal]               = useState(0);
  const [summary, setSummary]           = useState<any>(null);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]                 = useState(1);
  const [sortKey, setSortKey]           = useState('created_at');
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading]           = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm]         = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  const [customers, setCustomers] = useState<any[]>([]);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/sales?meta=1').then((r) => r.json()).then((j) => setCustomers(j.customers ?? []));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, status: statusFilter, sortKey, sortDir,
    });
    const res = await fetch(`/api/sales?${qs}`);
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
      customer_id:    row.customer_id ?? '',
      order_date:     row.order_date ? String(row.order_date).slice(0, 10) : '',
      delivery_date:  row.delivery_date ? String(row.delivery_date).slice(0, 10) : '',
      status:         row.status ?? 'pending',
      total_amount:   row.total_amount ? String(row.total_amount) : '',
      discount:       row.discount ? String(row.discount) : '',
      tax_amount:     row.tax_amount ? String(row.tax_amount) : '',
      payment_status: row.payment_status ?? 'unpaid',
      notes:          row.notes ?? '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        total_amount: form.total_amount ? parseFloat(form.total_amount) : 0,
        discount: form.discount ? parseFloat(form.discount) : 0,
        tax_amount: form.tax_amount ? parseFloat(form.tax_amount) : 0,
        ...(editItem ? { id: editItem.id } : {}),
      };
      const res = await fetch('/api/sales', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editItem ? 'Order Updated' : 'Order Created', editItem ? 'Sales order updated.' : 'New sales order created.');
      setFormOpen(false);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/sales?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', `${deleteTarget.order_number} deleted.`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setDeleting(false); }
  };

  const f = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const columns: Column[] = [
    { key: 'order_number', label: 'Order #', width: '130px', sortable: true,
      render: (r) => <span className="font-mono text-[0.7rem] text-amber-700 dark:text-amber-400">{r.order_number}</span> },
    { key: 'customer_name', label: 'Customer', width: '180px', sortable: true,
      render: (r) => <span className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{r.customer_name ?? '—'}</span> },
    { key: 'order_date', label: 'Order Date', width: '110px', sortable: true,
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{formatDate(r.order_date)}</span> },
    { key: 'delivery_date', label: 'Delivery', width: '110px', sortable: true,
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.delivery_date ? formatDate(r.delivery_date) : '—'}</span> },
    { key: 'grand_total', label: 'Grand Total', width: '130px', sortable: true, align: 'right',
      render: (r) => <span className="text-sm font-semibold tabular-nums">{formatCurrency(r.grand_total)}</span> },
    { key: 'payment_status', label: 'Payment', width: '100px', sortable: true,
      render: (r) => <Badge status={r.payment_status} /> },
    { key: 'status', label: 'Status', width: '110px', sortable: true,
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
    { label: 'Total Orders',  value: summary.total,     icon: ShoppingBag,  color: 'text-blue-500',    bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Pending',       value: summary.pending,   icon: Clock,        color: 'text-amber-500',   bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Delivered',     value: summary.delivered,  icon: Truck,        color: 'text-green-500',   bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Paid',          value: summary.paid,       icon: CreditCard,   color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Total Revenue', value: formatCurrency(summary.total_revenue), icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
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
        searchPlaceholder="Search order # or customer…" emptyIcon="🛒" emptyText="No sales orders found."
        sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange}
        toolbar={<>
          <div className="flex gap-1">
            {STATUS_TABS.map((t) => (
              <button key={t.value} onClick={() => handleStatusChange(t.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${statusFilter===t.value ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'}`}>{t.label}</button>
            ))}
          </div>
          <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>New Order</Button>
        </>}
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Sales Order' : 'New Sales Order'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">Customer</label>
            <select className="triumph-input" value={form.customer_id} onChange={(e) => f('customer_id', e.target.value)}>
              <option value="">— Select Customer —</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Status</label>
            <select className="triumph-input" value={form.status} onChange={(e) => f('status', e.target.value)}>
              <option value="pending">Pending</option><option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option><option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="triumph-label">Order Date</label>
            <input type="date" className="triumph-input" value={form.order_date} onChange={(e) => f('order_date', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Delivery Date</label>
            <input type="date" className="triumph-input" value={form.delivery_date} onChange={(e) => f('delivery_date', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Total Amount (Rs)</label>
            <input type="number" min="0" step="0.01" className="triumph-input" value={form.total_amount} onChange={(e) => f('total_amount', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Discount (Rs)</label>
            <input type="number" min="0" step="0.01" className="triumph-input" value={form.discount} onChange={(e) => f('discount', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Tax Amount (Rs)</label>
            <input type="number" min="0" step="0.01" className="triumph-input" value={form.tax_amount} onChange={(e) => f('tax_amount', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Payment Status</label>
            <select className="triumph-input" value={form.payment_status} onChange={(e) => f('payment_status', e.target.value)}>
              <option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="triumph-label">Notes</label>
            <textarea className="triumph-input resize-none" rows={2} value={form.notes} onChange={(e) => f('notes', e.target.value)} placeholder="Optional notes…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          {editItem && <Button variant="danger" size="sm" onClick={() => { setFormOpen(false); setDeleteTarget(editItem); }} icon={<Trash2 size={12} />}>Delete</Button>}
          <Button size="sm" onClick={handleSave} loading={saving}>{editItem ? 'Save Changes' : 'Create Order'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        variant="danger" title="Delete Sales Order?" message={`This will permanently delete "${deleteTarget?.order_number ?? ''}". This action cannot be undone.`}
        confirmLabel="Delete Order" loading={deleting} />
    </div>
  );
}

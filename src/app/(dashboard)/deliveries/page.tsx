'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Truck, Clock, Navigation, CheckCircle, RotateCcw,
  Pencil, Trash2,
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
  { value: '',           label: 'All' },
  { value: 'pending',    label: 'Pending' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered',  label: 'Delivered' },
  { value: 'returned',   label: 'Returned' },
];

type BadgeColor = 'amber' | 'blue' | 'green' | 'red' | 'gray';
const statusColorMap: Record<string, BadgeColor> = {
  pending: 'amber', dispatched: 'blue', in_transit: 'blue', delivered: 'green', returned: 'red',
};

type FormData = {
  delivery_number: string; customer_id: string; invoice_id: string;
  dispatch_date: string; expected_date: string; delivered_date: string;
  status: string; driver_name: string; vehicle_number: string;
  tracking_ref: string; delivery_address: string; notes: string;
  items: { product_name: string; quantity: string }[];
};

const EMPTY_ITEM = { product_name: '', quantity: '' };

const EMPTY_FORM: FormData = {
  delivery_number: '', customer_id: '', invoice_id: '',
  dispatch_date: new Date().toISOString().slice(0, 10), expected_date: '', delivered_date: '',
  status: 'pending', driver_name: '', vehicle_number: '',
  tracking_ref: '', delivery_address: '', notes: '',
  items: [{ ...EMPTY_ITEM }],
};

export default function DeliveriesPage() {
  /* ── state ── */
  const [data, setData]                 = useState<any[]>([]);
  const [total, setTotal]               = useState(0);
  const [summary, setSummary]           = useState<any>(null);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]                 = useState(1);
  const [sortKey, setSortKey]           = useState('created_at');
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading]           = useState(true);

  /* form / modal */
  const [formOpen, setFormOpen]   = useState(false);
  const [editItem, setEditItem]   = useState<any>(null);
  const [form, setForm]           = useState<FormData>({ ...EMPTY_FORM });
  const [saving, setSaving]       = useState(false);

  /* delete */
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  /* meta */
  const [meta, setMeta] = useState<{ customers: any[]; invoices: any[]; nextNumber: string }>({ customers: [], invoices: [], nextNumber: '' });

  const toast = useToast();

  /* ── load meta ── */
  useEffect(() => {
    fetch('/api/deliveries?meta=1').then(r => r.json()).then(j => setMeta(j));
  }, []);

  /* ── fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, status: statusFilter, sortKey, sortDir,
    });
    const res = await fetch(`/api/deliveries?${qs}`);
    const json = await res.json();
    setData(json.data ?? []);
    setTotal(json.total ?? 0);
    setSummary(json.summary ?? null);
    setLoading(false);
  }, [page, statusFilter, search, sortKey, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── handlers ── */
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleStatusChange = (v: string) => { setStatusFilter(v); setPage(1); };
  const handleSortChange   = (key: string, dir: 'asc' | 'desc') => { setSortKey(key); setSortDir(dir); setPage(1); };

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, delivery_number: meta.nextNumber, items: [{ ...EMPTY_ITEM }] });
    setFormOpen(true);
  };

  const openEdit = (row: any) => {
    setEditItem(row);
    setForm({
      delivery_number: row.delivery_number ?? '',
      customer_id: row.customer_id ? String(row.customer_id) : '',
      invoice_id: row.invoice_id ? String(row.invoice_id) : '',
      dispatch_date: row.dispatch_date?.slice(0, 10) ?? '',
      expected_date: row.expected_date?.slice(0, 10) ?? '',
      delivered_date: row.delivered_date?.slice(0, 10) ?? '',
      status: row.status ?? 'pending',
      driver_name: row.driver_name ?? '',
      vehicle_number: row.vehicle_number ?? '',
      tracking_ref: row.tracking_ref ?? '',
      delivery_address: row.delivery_address ?? '',
      notes: row.notes ?? '',
      items: row.items?.length
        ? row.items.map((it: any) => ({ product_name: it.product_name ?? '', quantity: String(it.quantity ?? '') }))
        : [{ ...EMPTY_ITEM }],
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.delivery_number.trim()) { toast.warning('Validation', 'Delivery number is required.'); return; }
    setSaving(true);
    try {
      const method = editItem ? 'PATCH' : 'POST';
      const body = editItem ? { id: editItem.id, ...form } : form;
      const res = await fetch('/api/deliveries', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editItem ? 'Updated' : 'Created', `Delivery ${editItem ? 'updated' : 'created'} successfully.`);
      setFormOpen(false);
      fetchData();
      fetch('/api/deliveries?meta=1').then(r => r.json()).then(j => setMeta(j));
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/deliveries?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', 'Delivery deleted.');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setDeleting(false); }
  };

  const f = (k: keyof FormData, v: any) => setForm(p => ({ ...p, [k]: v }));
  const updateItem = (idx: number, field: 'product_name' | 'quantity', v: string) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: v };
    f('items', items);
  };
  const addItem = () => f('items', [...form.items, { ...EMPTY_ITEM }]);
  const removeItem = (idx: number) => f('items', form.items.filter((_, i) => i !== idx));

  /* ── columns ── */
  const columns: Column[] = [
    { key: 'delivery_number', label: 'Delivery #', width: '120px', sortable: true,
      render: r => <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{r.delivery_number}</span> },
    { key: 'customer_name', label: 'Customer', sortable: true,
      render: r => <span className="text-xs font-medium text-slate-700 dark:text-[var(--dark-text)]">{r.customer_name ?? '—'}</span> },
    { key: 'invoice_number', label: 'Invoice #', width: '110px', sortable: true,
      render: r => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.invoice_number ?? '—'}</span> },
    { key: 'status', label: 'Status', width: '100px', sortable: true,
      render: r => <Badge label={r.status?.replace('_', ' ')} color={statusColorMap[r.status] ?? 'gray'} /> },
    { key: 'dispatch_date', label: 'Dispatch Date', width: '110px', sortable: true,
      render: r => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.dispatch_date ? formatDate(r.dispatch_date) : '—'}</span> },
    { key: 'expected_date', label: 'Expected Date', width: '110px', sortable: true,
      render: r => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.expected_date ? formatDate(r.expected_date) : '—'}</span> },
    { key: 'driver_name', label: 'Driver', width: '110px',
      render: r => <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">{r.driver_name ?? '—'}</span> },
    { key: 'vehicle_number', label: 'Vehicle', width: '100px',
      render: r => <span className="text-xs font-mono text-slate-500 dark:text-[var(--dark-text-3)]">{r.vehicle_number ?? '—'}</span> },
    { key: 'actions', label: '', width: '70px', sortable: false, align: 'right',
      render: r => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={e => { e.stopPropagation(); openEdit(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Edit">
            <Pencil size={11} />
          </button>
          <button onClick={e => { e.stopPropagation(); setDeleteTarget(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
            <Trash2 size={11} />
          </button>
        </div>
      ) },
  ];

  /* ── KPI cards ── */
  const kpis = summary ? [
    { label: 'Total Deliveries', value: summary.total,      icon: Truck,       color: 'text-blue-500',  bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Pending',          value: summary.pending,    icon: Clock,       color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'In Transit',       value: summary.in_transit, icon: Navigation,  color: 'text-blue-500',  bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Delivered',        value: summary.delivered,  icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Returned',         value: summary.returned,   icon: RotateCcw,   color: 'text-red-500',   bg: 'bg-red-100 dark:bg-red-900/30' },
  ] : [];

  return (
    <div className="space-y-4">
      {/* ── KPIs ── */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {kpis.map((k, i) => { const Icon = k.icon; return (
            <div key={k.label} className={`triumph-card p-4 flex items-center gap-3 anim-fade-up anim-d${Math.min(i + 1, 6)}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.bg}`}><Icon size={18} className={k.color} /></div>
              <div><p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{k.value}</p><p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">{k.label}</p></div>
            </div>
          ); })}
        </div>
      )}

      {/* ── Table ── */}
      <DataTable columns={columns} data={data} total={total} page={page} pageSize={PAGE_SIZE} loading={loading}
        search={search} onSearchChange={handleSearchChange} onPageChange={setPage}
        searchPlaceholder="Search deliveries…" emptyIcon="🚚" emptyText="No deliveries found."
        sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange}
        onRowDoubleClick={openEdit}
        toolbar={<>
          <div className="flex gap-1">
            {STATUS_TABS.map(t => (
              <button key={t.value} onClick={() => handleStatusChange(t.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${statusFilter === t.value ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'}`}>{t.label}</button>
            ))}
          </div>
          <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>New Delivery</Button>
        </>}
      />

      {/* ── Form Modal ── */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Delivery' : 'New Delivery'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="triumph-label">Delivery # *</label><input className="triumph-input" value={form.delivery_number} onChange={e => f('delivery_number', e.target.value)} readOnly /></div>
            <div>
              <label className="triumph-label">Customer</label>
              <select className="triumph-input" value={form.customer_id} onChange={e => f('customer_id', e.target.value)}>
                <option value="">— Select —</option>
                {meta.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="triumph-label">Invoice</label>
              <select className="triumph-input" value={form.invoice_id} onChange={e => f('invoice_id', e.target.value)}>
                <option value="">— Select —</option>
                {meta.invoices.map(inv => <option key={inv.id} value={inv.id}>{inv.invoice_number}</option>)}
              </select>
            </div>
            <div><label className="triumph-label">Dispatch Date</label><input type="date" className="triumph-input" value={form.dispatch_date} onChange={e => f('dispatch_date', e.target.value)} /></div>
            <div><label className="triumph-label">Expected Date</label><input type="date" className="triumph-input" value={form.expected_date} onChange={e => f('expected_date', e.target.value)} /></div>
            <div><label className="triumph-label">Delivered Date</label><input type="date" className="triumph-input" value={form.delivered_date} onChange={e => f('delivered_date', e.target.value)} /></div>
            <div>
              <label className="triumph-label">Status</label>
              <select className="triumph-input" value={form.status} onChange={e => f('status', e.target.value)}>
                <option value="pending">Pending</option>
                <option value="dispatched">Dispatched</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="returned">Returned</option>
              </select>
            </div>
            <div><label className="triumph-label">Driver Name</label><input className="triumph-input" value={form.driver_name} onChange={e => f('driver_name', e.target.value)} placeholder="Driver name" /></div>
            <div><label className="triumph-label">Vehicle Number</label><input className="triumph-input" value={form.vehicle_number} onChange={e => f('vehicle_number', e.target.value)} placeholder="Vehicle #" /></div>
            <div className="sm:col-span-3"><label className="triumph-label">Tracking Reference</label><input className="triumph-input" value={form.tracking_ref} onChange={e => f('tracking_ref', e.target.value)} placeholder="Tracking ref / waybill #" /></div>
            <div className="sm:col-span-3"><label className="triumph-label">Delivery Address</label><textarea className="triumph-input resize-none" rows={2} value={form.delivery_address} onChange={e => f('delivery_address', e.target.value)} placeholder="Full delivery address" /></div>
            <div className="sm:col-span-3"><label className="triumph-label">Notes</label><textarea className="triumph-input resize-none" rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} /></div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="triumph-label !mb-0">Delivery Items</label>
              <button type="button" onClick={addItem} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"><Plus size={12} /> Add Item</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-7">
                    {idx === 0 && <label className="text-[0.6rem] text-slate-400 mb-0.5 block">Product Name</label>}
                    <input className="triumph-input !text-xs" value={item.product_name} onChange={e => updateItem(idx, 'product_name', e.target.value)} placeholder="Product name" />
                  </div>
                  <div className="col-span-4">
                    {idx === 0 && <label className="text-[0.6rem] text-slate-400 mb-0.5 block">Quantity</label>}
                    <input type="number" min="1" className="triumph-input !text-xs" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} placeholder="Qty" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} loading={saving}>{editItem ? 'Update' : 'Create'}</Button>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        variant="danger" title="Delete Delivery?" message={`Delete delivery ${deleteTarget?.delivery_number}? This action cannot be undone.`}
        confirmLabel="Delete" loading={deleting} />
    </div>
  );
}

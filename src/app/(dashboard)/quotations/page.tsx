'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, FileText, Send, CheckCircle2, XCircle, ArrowRightCircle,
  Pencil, Trash2, Eye, Files, Download,
} from 'lucide-react';
import { generateQuotationPDF } from '@/lib/pdf';
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
  { value: 'draft',     label: 'Draft' },
  { value: 'sent',      label: 'Sent' },
  { value: 'accepted',  label: 'Accepted' },
  { value: 'rejected',  label: 'Rejected' },
  { value: 'converted', label: 'Converted' },
];

type BadgeColor = 'amber' | 'blue' | 'green' | 'red' | 'gray' | 'purple';
const statusColorMap: Record<string, BadgeColor> = {
  draft: 'gray', sent: 'blue', accepted: 'green', rejected: 'red', converted: 'purple',
};

type LineItem = { product_id: string; description: string; quantity: number; unit_price: number };
type FormData = {
  quote_number: string; customer_id: string; quote_date: string; valid_until: string;
  status: string; discount: string; tax_rate: string; notes: string; terms: string;
  items: LineItem[];
};

const EMPTY_ITEM: LineItem = { product_id: '', description: '', quantity: 1, unit_price: 0 };

export default function QuotationsPage() {
  const [data, setData]                 = useState<any[]>([]);
  const [total, setTotal]               = useState(0);
  const [summary, setSummary]           = useState<any>(null);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]                 = useState(1);
  const [sortKey, setSortKey]           = useState('created_at');
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading]           = useState(true);

  const [formOpen, setFormOpen]   = useState(false);
  const [editItem, setEditItem]   = useState<any>(null);
  const [form, setForm]           = useState<FormData>({
    quote_number: '', customer_id: '', quote_date: new Date().toISOString().slice(0, 10),
    valid_until: '', status: 'draft', discount: '0', tax_rate: '0', notes: '', terms: '',
    items: [{ ...EMPTY_ITEM }],
  });
  const [saving, setSaving] = useState(false);

  const [viewItem, setViewItem]         = useState<any>(null);
  const [viewItems, setViewItems]       = useState<any[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);
  const [converting, setConverting]     = useState<string | null>(null);

  const [meta, setMeta] = useState<{ customers: any[]; products: any[]; nextNumber: string }>({ customers: [], products: [], nextNumber: '' });
  const toast = useToast();

  useEffect(() => {
    fetch('/api/quotations?meta=1').then(r => r.json()).then(j => setMeta(j));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, status: statusFilter, sortKey, sortDir,
    });
    const res = await fetch(`/api/quotations?${qs}`);
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

  const openAdd = () => {
    setEditItem(null);
    setForm({
      quote_number: meta.nextNumber, customer_id: '', quote_date: new Date().toISOString().slice(0, 10),
      valid_until: '', status: 'draft', discount: '0', tax_rate: '0', notes: '', terms: '',
      items: [{ ...EMPTY_ITEM }],
    });
    setFormOpen(true);
  };

  const openEdit = async (row: any) => {
    setEditItem(row);
    // Load items
    const res = await fetch(`/api/quotations/items?quoteId=${row.id}`);
    const json = await res.json();
    const items = (json.items ?? []).map((it: any) => ({
      product_id: it.product_id ?? '', description: it.description ?? '',
      quantity: it.quantity, unit_price: parseFloat(it.unit_price),
    }));
    setForm({
      quote_number: row.quote_number, customer_id: row.customer_id ?? '',
      quote_date: row.quote_date?.slice(0, 10) ?? '', valid_until: row.valid_until?.slice(0, 10) ?? '',
      status: row.status, discount: String(row.discount ?? 0), tax_rate: String(row.tax_rate ?? 0),
      notes: row.notes ?? '', terms: row.terms ?? '',
      items: items.length ? items : [{ ...EMPTY_ITEM }],
    });
    setFormOpen(true);
  };

  const openView = async (row: any) => {
    setViewItem(row);
    const res = await fetch(`/api/quotations/items?quoteId=${row.id}`);
    const json = await res.json();
    setViewItems(json.items ?? []);
  };

  const handleSave = async () => {
    if (!form.quote_number) { toast.warning('Validation', 'Quote number is required.'); return; }
    if (!form.items.length || form.items.every(i => !i.unit_price)) { toast.warning('Validation', 'Add at least one item.'); return; }
    setSaving(true);
    try {
      const method = editItem ? 'PATCH' : 'POST';
      const body = editItem ? { id: editItem.id, ...form } : form;
      const res = await fetch('/api/quotations', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editItem ? 'Updated' : 'Created', `Quotation ${editItem ? 'updated' : 'created'} successfully.`);
      setFormOpen(false);
      fetchData();
      // Refresh meta for next number
      fetch('/api/quotations?meta=1').then(r => r.json()).then(j => setMeta(j));
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotations?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', 'Quotation deleted.');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setDeleting(false); }
  };

  const handleConvert = async (id: string) => {
    setConverting(id);
    try {
      const res = await fetch('/api/quotations/convert', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const inv = await res.json();
      toast.success('Converted', `Invoice ${inv.invoice_number} created successfully!`);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setConverting(null); }
  };

  const f = (k: keyof FormData, v: any) => setForm(p => ({ ...p, [k]: v }));
  const updateItem = (idx: number, field: keyof LineItem, v: any) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: v };
    // Auto-fill price from product
    if (field === 'product_id' && v) {
      const prod = meta.products.find(p => p.id === v);
      if (prod) {
        items[idx].unit_price = parseFloat(prod.unit_price);
        items[idx].description = prod.name;
      }
    }
    f('items', items);
  };
  const addItem = () => f('items', [...form.items, { ...EMPTY_ITEM }]);
  const removeItem = (idx: number) => f('items', form.items.filter((_, i) => i !== idx));

  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const taxAmt = subtotal * (parseFloat(form.tax_rate) || 0) / 100;
  const grandTotal = subtotal - (parseFloat(form.discount) || 0) + taxAmt;

  const columns: Column[] = [
    { key: 'quote_number', label: 'Quote #', width: '110px', sortable: true,
      render: r => <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{r.quote_number}</span> },
    { key: 'customer_name', label: 'Customer', sortable: true,
      render: r => <span className="text-xs font-medium text-slate-700 dark:text-[var(--dark-text)]">{r.customer_name ?? '—'}</span> },
    { key: 'quote_date', label: 'Date', width: '100px', sortable: true,
      render: r => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{formatDate(r.quote_date)}</span> },
    { key: 'valid_until', label: 'Valid Until', width: '100px',
      render: r => <span className="text-xs text-slate-400">{r.valid_until ? formatDate(r.valid_until) : '—'}</span> },
    { key: 'grand_total', label: 'Total', width: '110px', sortable: true, align: 'right',
      render: r => <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-white">{formatCurrency(parseFloat(r.grand_total))}</span> },
    { key: 'status', label: 'Status', width: '100px', sortable: true,
      render: r => <Badge label={r.status} color={statusColorMap[r.status] ?? 'gray'} /> },
    { key: 'actions', label: '', width: '130px', sortable: false, align: 'right',
      render: r => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={e => { e.stopPropagation(); openView(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="View">
            <Eye size={11} />
          </button>
          <button onClick={async (e) => { e.stopPropagation(); const res = await fetch(`/api/quotations/items?quoteId=${r.id}`); const json = await res.json(); generateQuotationPDF(r, json.items ?? []); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors" title="Download PDF">
            <Download size={11} />
          </button>
          {r.status !== 'converted' && (
            <button onClick={e => { e.stopPropagation(); openEdit(r); }}
              className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Edit">
              <Pencil size={11} />
            </button>
          )}
          {(r.status === 'accepted' || r.status === 'sent') && (
            <button onClick={e => { e.stopPropagation(); handleConvert(r.id); }}
              disabled={converting === r.id}
              className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Convert to Invoice">
              <ArrowRightCircle size={11} />
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); setDeleteTarget(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
            <Trash2 size={11} />
          </button>
        </div>
      ) },
  ];

  const kpis = summary ? [
    { label: 'Total Quotes', value: summary.total,      icon: FileText,         color: 'text-blue-500',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Draft',        value: summary.draft,       icon: Files,            color: 'text-gray-500',   bg: 'bg-gray-100 dark:bg-gray-800' },
    { label: 'Sent',         value: summary.sent,        icon: Send,             color: 'text-sky-500',    bg: 'bg-sky-100 dark:bg-sky-900/30' },
    { label: 'Accepted',     value: summary.accepted,    icon: CheckCircle2,     color: 'text-green-500',  bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Total Value',  value: formatCurrency(parseFloat(summary.total_value)), icon: FileText, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ] : [];

  return (
    <div className="space-y-4">
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
        searchPlaceholder="Search quotations…" emptyIcon="📋" emptyText="No quotations found."
        sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange}
        onRowDoubleClick={openEdit}
        toolbar={<>
          <div className="flex gap-1">
            {STATUS_TABS.map(t => (
              <button key={t.value} onClick={() => handleStatusChange(t.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${statusFilter===t.value ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'}`}>{t.label}</button>
            ))}
          </div>
          <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>New Quotation</Button>
        </>}
      />

      {/* Form Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Quotation' : 'New Quotation'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="triumph-label">Quote # *</label><input className="triumph-input" value={form.quote_number} onChange={e => f('quote_number', e.target.value)} readOnly={!!editItem} /></div>
            <div>
              <label className="triumph-label">Customer</label>
              <select className="triumph-input" value={form.customer_id} onChange={e => f('customer_id', e.target.value)}>
                <option value="">— Select —</option>
                {meta.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="triumph-label">Status</label>
              <select className="triumph-input" value={form.status} onChange={e => f('status', e.target.value)}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div><label className="triumph-label">Quote Date</label><input type="date" className="triumph-input" value={form.quote_date} onChange={e => f('quote_date', e.target.value)} /></div>
            <div><label className="triumph-label">Valid Until</label><input type="date" className="triumph-input" value={form.valid_until} onChange={e => f('valid_until', e.target.value)} /></div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="triumph-label !mb-0">Line Items</label>
              <button type="button" onClick={addItem} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
                <Plus size={12} /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    {idx === 0 && <label className="text-[0.6rem] text-slate-400 mb-0.5 block">Product</label>}
                    <select className="triumph-input !text-xs" value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)}>
                      <option value="">— Select product —</option>
                      {meta.products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    {idx === 0 && <label className="text-[0.6rem] text-slate-400 mb-0.5 block">Description</label>}
                    <input className="triumph-input !text-xs" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Description" />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="text-[0.6rem] text-slate-400 mb-0.5 block">Qty</label>}
                    <input type="number" min="1" className="triumph-input !text-xs" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="text-[0.6rem] text-slate-400 mb-0.5 block">Price</label>}
                    <input type="number" step="0.01" className="triumph-input !text-xs" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} />
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

          {/* Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="triumph-label">Discount (Rs)</label><input type="number" step="0.01" className="triumph-input" value={form.discount} onChange={e => f('discount', e.target.value)} /></div>
            <div><label className="triumph-label">Tax Rate (%)</label><input type="number" step="0.01" className="triumph-input" value={form.tax_rate} onChange={e => f('tax_rate', e.target.value)} /></div>
            <div className="flex flex-col justify-end">
              <div className="triumph-card !bg-amber-50 dark:!bg-amber-900/20 p-3 text-center">
                <p className="text-[0.6rem] text-slate-500 dark:text-amber-300/60">Grand Total</p>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{formatCurrency(grandTotal)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="triumph-label">Notes</label><textarea className="triumph-input resize-none" rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} /></div>
            <div><label className="triumph-label">Terms & Conditions</label><textarea className="triumph-input resize-none" rows={2} value={form.terms} onChange={e => f('terms', e.target.value)} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} loading={saving}>{editItem ? 'Update' : 'Create'}</Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title={`Quotation ${viewItem?.quote_number ?? ''}`} size="lg">
        {viewItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div><p className="text-slate-400">Customer</p><p className="font-semibold text-slate-800 dark:text-white">{viewItem.customer_name ?? '—'}</p></div>
              <div><p className="text-slate-400">Date</p><p className="font-semibold text-slate-800 dark:text-white">{formatDate(viewItem.quote_date)}</p></div>
              <div><p className="text-slate-400">Valid Until</p><p className="font-semibold text-slate-800 dark:text-white">{viewItem.valid_until ? formatDate(viewItem.valid_until) : '—'}</p></div>
              <div><p className="text-slate-400">Status</p><Badge label={viewItem.status} color={statusColorMap[viewItem.status] ?? 'gray'} /></div>
            </div>
            <div className="border rounded-lg overflow-hidden dark:border-[var(--dark-border)]">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-[var(--dark-surface)]">
                  <tr>
                    <th className="text-left p-2 font-medium text-slate-500">Product</th>
                    <th className="text-left p-2 font-medium text-slate-500">Description</th>
                    <th className="text-right p-2 font-medium text-slate-500">Qty</th>
                    <th className="text-right p-2 font-medium text-slate-500">Price</th>
                    <th className="text-right p-2 font-medium text-slate-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewItems.map((it, i) => (
                    <tr key={i} className="border-t dark:border-[var(--dark-border)]">
                      <td className="p-2 text-slate-700 dark:text-[var(--dark-text)]">{it.product_name ?? '—'}</td>
                      <td className="p-2 text-slate-500">{it.description ?? '—'}</td>
                      <td className="p-2 text-right tabular-nums">{it.quantity}</td>
                      <td className="p-2 text-right tabular-nums">{formatCurrency(parseFloat(it.unit_price))}</td>
                      <td className="p-2 text-right font-semibold tabular-nums">{formatCurrency(parseFloat(it.line_total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <div className="text-right text-xs space-y-1">
                <p className="text-slate-500">Subtotal: <span className="font-semibold text-slate-800 dark:text-white">{formatCurrency(parseFloat(viewItem.subtotal))}</span></p>
                {parseFloat(viewItem.discount) > 0 && <p className="text-slate-500">Discount: <span className="font-semibold text-red-500">-{formatCurrency(parseFloat(viewItem.discount))}</span></p>}
                {parseFloat(viewItem.tax_amount) > 0 && <p className="text-slate-500">Tax ({viewItem.tax_rate}%): <span className="font-semibold text-slate-800 dark:text-white">{formatCurrency(parseFloat(viewItem.tax_amount))}</span></p>}
                <p className="text-base font-bold text-amber-600 dark:text-amber-400 pt-1 border-t dark:border-[var(--dark-border)]">Total: {formatCurrency(parseFloat(viewItem.grand_total))}</p>
              </div>
            </div>
            {viewItem.notes && <div className="text-xs"><p className="text-slate-400 mb-1">Notes</p><p className="text-slate-600 dark:text-[var(--dark-text-2)]">{viewItem.notes}</p></div>}
            {viewItem.terms && <div className="text-xs"><p className="text-slate-400 mb-1">Terms</p><p className="text-slate-600 dark:text-[var(--dark-text-2)]">{viewItem.terms}</p></div>}
            <div className="flex justify-end pt-3 border-t dark:border-[var(--dark-border)]">
              <Button size="sm" variant="secondary" onClick={() => generateQuotationPDF(viewItem, viewItems)}>
                <Download size={14} className="mr-1.5" /> Download PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        variant="danger" title="Delete Quotation?" message={`Delete quotation ${deleteTarget?.quote_number}? This action cannot be undone.`}
        confirmLabel="Delete" loading={deleting} />
    </div>
  );
}

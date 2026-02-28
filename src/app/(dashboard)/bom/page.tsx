'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Layers, CheckCircle, Package, Pencil, Trash2, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import { Card } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';

const PAGE_SIZE = 15;

type FormItem = {
  item_id: string; quantity: string; unit: string; waste_percent: string; notes: string;
};

type FormData = {
  name: string; product_id: string; version: string; notes: string; is_active: boolean;
  items: FormItem[];
};

const EMPTY_ITEM: FormItem = { item_id: '', quantity: '1', unit: 'pcs', waste_percent: '0', notes: '' };

const EMPTY: FormData = {
  name: '', product_id: '', version: '1.0', notes: '', is_active: true,
  items: [{ ...EMPTY_ITEM }],
};

export default function BomPage() {
  const [data, setData]           = useState<any[]>([]);
  const [total, setTotal]         = useState(0);
  const [summary, setSummary]     = useState<any>(null);
  const [products, setProducts]   = useState<any[]>([]);
  const [invItems, setInvItems]   = useState<any[]>([]);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [sortKey, setSortKey]     = useState('created_at');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading]     = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState<FormData>({ ...EMPTY, items: [{ ...EMPTY_ITEM }] });
  const [saving, setSaving]     = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  const toast = useToast();

  /* ── Meta (products + inventory items) ── */
  useEffect(() => {
    fetch('/api/bom?meta=1').then(r => r.json()).then(j => {
      setProducts(j.products ?? []);
      setInvItems(j.items ?? []);
    });
  }, []);

  /* ── List fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE), search,
    });
    const res = await fetch(`/api/bom?${qs}`);
    const json = await res.json();
    setData(json.rows ?? []);
    setTotal(json.total ?? 0);
    setSummary(json.summary ?? null);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleSortChange   = (key: string, dir: 'asc' | 'desc') => { setSortKey(key); setSortDir(dir); setPage(1); };

  /* ── Form helpers ── */
  const openAdd = () => {
    setEditId(null);
    setForm({ ...EMPTY, items: [{ ...EMPTY_ITEM }] });
    setFormOpen(true);
  };

  const openEdit = async (row: any) => {
    try {
      const res = await fetch(`/api/bom?id=${row.id}`);
      const json = await res.json();
      const bom = json.bom;
      if (!bom) { toast.error('Error', 'BOM not found.'); return; }
      setEditId(String(bom.id));
      setForm({
        name: bom.name ?? '',
        product_id: bom.product_id ? String(bom.product_id) : '',
        version: bom.version ?? '1.0',
        notes: bom.notes ?? '',
        is_active: bom.is_active ?? true,
        items: json.items?.length
          ? json.items.map((it: any) => ({
              item_id: it.item_id ? String(it.item_id) : '',
              quantity: String(it.quantity ?? 1),
              unit: it.unit ?? 'pcs',
              waste_percent: String(it.waste_percent ?? 0),
              notes: it.notes ?? '',
            }))
          : [{ ...EMPTY_ITEM }],
      });
      setFormOpen(true);
    } catch { toast.error('Error', 'Failed to load BOM.'); }
  };

  const f = (k: keyof Omit<FormData, 'items'>, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  const updateItem = (idx: number, k: keyof FormItem, v: string) => {
    setForm(p => {
      const items = [...p.items];
      items[idx] = { ...items[idx], [k]: v };
      return { ...p, items };
    });
  };

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { ...EMPTY_ITEM }] }));

  const removeItem = (idx: number) => {
    setForm(p => {
      const items = p.items.filter((_, i) => i !== idx);
      return { ...p, items: items.length ? items : [{ ...EMPTY_ITEM }] };
    });
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!form.name.trim()) { toast.warning('Validation', 'BOM name is required.'); return; }
    const validItems = form.items.filter(it => it.item_id);
    if (!validItems.length) { toast.warning('Validation', 'At least one item is required.'); return; }
    setSaving(true);
    try {
      const method = editId ? 'PATCH' : 'POST';
      const body: any = {
        name: form.name,
        product_id: form.product_id ? Number(form.product_id) : null,
        version: form.version || '1.0',
        notes: form.notes || null,
        is_active: form.is_active,
        items: validItems.map(it => ({
          item_id: Number(it.item_id),
          quantity: Number(it.quantity) || 1,
          unit: it.unit || 'pcs',
          waste_percent: Number(it.waste_percent) || 0,
          notes: it.notes || null,
        })),
      };
      if (editId) body.id = editId;
      const res = await fetch('/api/bom', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editId ? 'Updated' : 'Created', `BOM ${editId ? 'updated' : 'created'} successfully.`);
      setFormOpen(false);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/bom', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', 'BOM deleted.');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setDeleting(false); }
  };

  /* ── Columns ── */
  const columns: Column[] = [
    { key: 'name', label: 'Name', sortable: true,
      render: r => <span className="text-xs font-semibold text-slate-700 dark:text-white">{r.name}</span> },
    { key: 'product_name', label: 'Product', sortable: true,
      render: r => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.product_name ?? '—'}</span> },
    { key: 'version', label: 'Version', width: '80px',
      render: r => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.version ?? '—'}</span> },
    { key: 'item_count', label: 'Items', width: '80px', align: 'center',
      render: r => <span className="text-xs font-medium tabular-nums text-slate-600 dark:text-[var(--dark-text-2)]">{r.item_count ?? 0}</span> },
    { key: 'is_active', label: 'Status', width: '90px',
      render: r => <Badge label={r.is_active ? 'Active' : 'Inactive'} color={r.is_active ? 'green' : 'gray'} /> },
    { key: 'created_at', label: 'Created', width: '100px', sortable: true,
      render: r => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{formatDate(r.created_at)}</span> },
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

  /* ── KPI ── */
  const totalItems = data.reduce((s, r) => s + (parseInt(r.item_count) || 0), 0);
  const kpis = summary ? [
    { label: 'Total BOMs',  value: summary.total ?? 0,  icon: Layers,      color: 'text-blue-500',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Active BOMs', value: summary.active ?? 0, icon: CheckCircle,  color: 'text-green-500',  bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Total Items', value: totalItems,          icon: Package,      color: 'text-amber-500',  bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ] : [];

  /* ── Render ── */
  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {kpis.map((k, i) => { const Icon = k.icon; return (
            <div key={k.label} className={`triumph-card p-4 flex items-center gap-3 anim-fade-up anim-d${Math.min(i + 1, 6)}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.bg}`}><Icon size={18} className={k.color} /></div>
              <div><p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{k.value}</p><p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">{k.label}</p></div>
            </div>
          ); })}
        </div>
      )}

      {/* DataTable */}
      <DataTable columns={columns} data={data} total={total} page={page} pageSize={PAGE_SIZE} loading={loading}
        search={search} onSearchChange={handleSearchChange} onPageChange={setPage}
        searchPlaceholder="Search BOMs…" emptyIcon="📋" emptyText="No bill of materials found."
        sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange}
        onRowDoubleClick={openEdit}
        toolbar={
          <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>New BOM</Button>
        }
      />

      {/* Form Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? 'Edit BOM' : 'New BOM'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">Name *</label>
            <input className="triumph-input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="BOM name" />
          </div>
          <div>
            <label className="triumph-label">Product</label>
            <select className="triumph-input" value={form.product_id} onChange={e => f('product_id', e.target.value)}>
              <option value="">— Select Product —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Version</label>
            <input className="triumph-input" value={form.version} onChange={e => f('version', e.target.value)} placeholder="1.0" />
          </div>
          <div className="flex items-end gap-3 pb-1">
            <label className="triumph-label mb-0 flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_active} onChange={e => f('is_active', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
              Active
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="triumph-label">Notes</label>
            <textarea className="triumph-input resize-none" rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} />
          </div>
        </div>

        {/* Items section */}
        <Card title="BOM Items" className="mt-4">
          <div className="space-y-3">
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-4">
                  {idx === 0 && <label className="triumph-label">Item *</label>}
                  <select className="triumph-input" value={item.item_id} onChange={e => updateItem(idx, 'item_id', e.target.value)}>
                    <option value="">— Select Item —</option>
                    {invItems.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                  </select>
                </div>
                <div className="col-span-4 sm:col-span-2">
                  {idx === 0 && <label className="triumph-label">Qty</label>}
                  <input type="number" step="0.01" className="triumph-input" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} placeholder="1" />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  {idx === 0 && <label className="triumph-label">Unit</label>}
                  <input className="triumph-input" value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} placeholder="pcs" />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  {idx === 0 && <label className="triumph-label">Waste %</label>}
                  <input type="number" step="0.1" className="triumph-input" value={item.waste_percent} onChange={e => updateItem(idx, 'waste_percent', e.target.value)} placeholder="0" />
                </div>
                <div className="col-span-12 sm:col-span-2 flex items-end gap-1">
                  {idx === 0 && <label className="triumph-label sm:invisible">Action</label>}
                  <button onClick={() => removeItem(idx)}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Remove item">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" icon={<Plus size={13} />} onClick={addItem} className="mt-3">Add Item</Button>
        </Card>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} loading={saving}>{editId ? 'Update BOM' : 'Create BOM'}</Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        variant="danger" title="Delete BOM?" message={`Delete "${deleteTarget?.name ?? ''}"? This will also remove all associated items. This action cannot be undone.`}
        confirmLabel="Delete" loading={deleting} />
    </div>
  );
}

'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Download, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { formatCurrency, formatNumber } from '@/lib/utils';

const PAGE_SIZE = 15;
const CAT_TYPES = ['all', 'raw_material', 'finished_good', 'machine', 'consumable'] as const;
const EMPTY_FORM = {
  sku: '', name: '', category_id: '', unit: '', current_stock: '',
  reorder_level: '', unit_cost: '', supplier_id: '', location: '', description: '',
};
type FormData = typeof EMPTY_FORM;

export default function InventoryPage() {
  const [items, setItems]           = useState<any[]>([]);
  const [total, setTotal]           = useState(0);
  const [search, setSearch]         = useState('');
  const [catType, setCatType]       = useState<string>('all');
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [formOpen, setFormOpen]     = useState(false);
  const [editItem, setEditItem]     = useState<any>(null);
  const [form, setForm]             = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers]   = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/inventory?meta=1').then((r) => r.json()).then((j) => {
      setCategories(j.categories ?? []);
      setSuppliers(j.suppliers ?? []);
    });
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const ct = catType === 'all' ? '' : catType;
    const res = await fetch(`/api/inventory?search=${encodeURIComponent(search)}&catType=${ct}&page=${page}&limit=${PAGE_SIZE}`);
    const json = await res.json();
    setItems(json.data ?? []);
    setTotal(json.total ?? 0);
    setLoading(false);
  }, [search, catType, page]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleCatChange    = (v: string) => { setCatType(v); setPage(1); };

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      sku: item.sku ?? '', name: item.name ?? '', category_id: item.category_id ?? '',
      unit: item.unit ?? '', current_stock: String(item.current_stock ?? ''),
      reorder_level: String(item.reorder_level ?? ''), unit_cost: String(item.unit_cost ?? ''),
      supplier_id: item.supplier_id ?? '', location: item.location ?? '', description: item.description ?? '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...form,
      current_stock: parseFloat(form.current_stock) || 0,
      reorder_level: parseFloat(form.reorder_level) || 0,
      unit_cost: parseFloat(form.unit_cost) || 0,
      ...(editItem ? { id: editItem.id } : {}),
    };
    await fetch('/api/inventory', {
      method: editItem ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setFormOpen(false);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this item?')) return;
    await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
    fetchItems();
  };

  const f = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const lowStock = items.filter((i) => i.low_stock).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-800 dark:text-[var(--dark-text)]">Inventory</h1>
          <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{total} items · {lowStock} low stock alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<Download size={13} />}>Export</Button>
          <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>Add Item</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {CAT_TYPES.map((cat) => (
          <button key={cat} onClick={() => handleCatChange(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${catType === cat ? 'bg-amber-500 text-white' : 'bg-white dark:bg-[var(--dark-card)] border border-slate-200 dark:border-[var(--dark-border)] text-slate-600 dark:text-[var(--dark-text-2)] hover:border-amber-400'}`}
          >
            {cat === 'all' ? 'All' : cat.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      <Card noPad>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-[var(--dark-border)]">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search by name or SKU…" className="triumph-input pl-8" />
          </div>
          <span className="text-xs text-slate-400 dark:text-[var(--dark-text-3)] ml-auto">{total} results</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="w-full triumph-table">
                <thead>
                  <tr>
                    <th>SKU</th><th>Name</th><th>Category</th><th>Unit</th>
                    <th className="text-right">Stock</th><th className="text-right">Reorder</th>
                    <th className="text-right">Unit Cost</th><th>Location</th><th>Supplier</th>
                    <th>Status</th><th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={11} className="text-center text-slate-400 py-8 text-xs">No items found.</td></tr>
                  ) : items.map((item) => (
                    <tr key={item.id}>
                      <td className="font-mono text-[0.7rem] text-slate-400">{item.sku}</td>
                      <td className="font-medium text-sm cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors" onClick={() => openEdit(item)}>{item.name}</td>
                      <td className="text-xs capitalize text-slate-500 dark:text-[var(--dark-text-2)]">{item.category_name}</td>
                      <td className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{item.unit}</td>
                      <td className="text-right">
                        <span className={`text-sm font-semibold tabular-nums ${item.low_stock ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-[var(--dark-text)]'}`}>{formatNumber(item.current_stock)}</span>
                      </td>
                      <td className="text-right text-xs text-slate-400">{formatNumber(item.reorder_level)}</td>
                      <td className="text-right text-xs tabular-nums">{formatCurrency(item.unit_cost)}</td>
                      <td className="text-xs text-slate-400">{item.location ?? '—'}</td>
                      <td className="text-xs text-slate-400">{item.supplier_name ?? '—'}</td>
                      <td>
                        {item.low_stock
                          ? <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-red-600 dark:text-red-400"><AlertCircle size={10} />Low Stock</span>
                          : <Badge status="active" label="In Stock" />}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(item)} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Edit"><Pencil size={11} /></button>
                          <button onClick={() => handleDelete(item.id)} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Archive"><Trash2 size={11} /></button>
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

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Inventory Item' : 'Add Inventory Item'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="triumph-label">SKU *</label><input className="triumph-input" value={form.sku} onChange={(e) => f('sku', e.target.value)} placeholder="e.g. RM-001" /></div>
          <div><label className="triumph-label">Name *</label><input className="triumph-input" value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="Item name" /></div>
          <div>
            <label className="triumph-label">Category</label>
            <select className="triumph-input" value={form.category_id} onChange={(e) => f('category_id', e.target.value)}>
              <option value="">— Select —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type?.replace('_', ' ')})</option>)}
            </select>
          </div>
          <div><label className="triumph-label">Unit</label><input className="triumph-input" value={form.unit} onChange={(e) => f('unit', e.target.value)} placeholder="kg / pcs / rolls…" /></div>
          <div><label className="triumph-label">Current Stock</label><input type="number" min="0" step="0.01" className="triumph-input" value={form.current_stock} onChange={(e) => f('current_stock', e.target.value)} /></div>
          <div><label className="triumph-label">Reorder Level</label><input type="number" min="0" step="0.01" className="triumph-input" value={form.reorder_level} onChange={(e) => f('reorder_level', e.target.value)} /></div>
          <div><label className="triumph-label">Unit Cost (Rs)</label><input type="number" min="0" step="0.01" className="triumph-input" value={form.unit_cost} onChange={(e) => f('unit_cost', e.target.value)} /></div>
          <div>
            <label className="triumph-label">Supplier</label>
            <select className="triumph-input" value={form.supplier_id} onChange={(e) => f('supplier_id', e.target.value)}>
              <option value="">— None —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label className="triumph-label">Storage Location</label><input className="triumph-input" value={form.location} onChange={(e) => f('location', e.target.value)} placeholder="Shelf A, Row 3…" /></div>
          <div className="sm:col-span-2"><label className="triumph-label">Description</label><textarea className="triumph-input resize-none" rows={2} value={form.description} onChange={(e) => f('description', e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editItem ? 'Save Changes' : 'Add Item'}</Button>
        </div>
      </Modal>
    </div>
  );
}

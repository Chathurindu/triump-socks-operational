'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Package, AlertTriangle, CheckCircle2, DollarSign, Layers,
  Pencil, Trash2, Download,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatNumber } from '@/lib/utils';

const PAGE_SIZE = 15;
const CAT_TYPES = ['all', 'raw_material', 'finished_good', 'machine', 'consumable'] as const;

const EMPTY_FORM = {
  sku: '', name: '', category_id: '', unit: '', current_stock: '',
  reorder_level: '', unit_cost: '', supplier_id: '', location: '', description: '',
};
type FormData = typeof EMPTY_FORM;

export default function InventoryPage() {
  /* ── state ── */
  const [items, setItems]           = useState<any[]>([]);
  const [total, setTotal]           = useState(0);
  const [summary, setSummary]       = useState<any>(null);
  const [search, setSearch]         = useState('');
  const [catType, setCatType]       = useState<string>('all');
  const [page, setPage]             = useState(1);
  const [sortKey, setSortKey]       = useState('created_at');
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading]       = useState(true);

  /* form / modal */
  const [formOpen, setFormOpen]     = useState(false);
  const [editItem, setEditItem]     = useState<any>(null);
  const [form, setForm]             = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);

  /* delete */
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  /* meta */
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers]   = useState<any[]>([]);

  const toast = useToast();

  /* ── load meta ── */
  useEffect(() => {
    fetch('/api/inventory?meta=1')
      .then((r) => r.json())
      .then((j) => {
        setCategories(j.categories ?? []);
        setSuppliers(j.suppliers ?? []);
      });
  }, []);

  /* ── fetch ── */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    const ct = catType === 'all' ? '' : catType;
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, catType: ct,
      sortKey, sortDir,
    });
    const res = await fetch(`/api/inventory?${qs}`);
    const json = await res.json();
    setItems(json.data ?? []);
    setTotal(json.total ?? 0);
    setSummary(json.summary ?? null);
    setLoading(false);
  }, [search, catType, page, sortKey, sortDir]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  /* ── handlers ── */
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleCatChange    = (v: string) => { setCatType(v); setPage(1); };
  const handleSortChange   = (key: string, dir: 'asc' | 'desc') => { setSortKey(key); setSortDir(dir); setPage(1); };

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
    if (!form.sku.trim()) { toast.warning('Validation', 'SKU is required.'); return; }
    if (!form.name.trim()) { toast.warning('Validation', 'Item name is required.'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        current_stock: parseFloat(form.current_stock) || 0,
        reorder_level: parseFloat(form.reorder_level) || 0,
        unit_cost: parseFloat(form.unit_cost) || 0,
        ...(editItem ? { id: editItem.id } : {}),
      };
      const res = await fetch('/api/inventory', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');

      toast.success(
        editItem ? 'Item Updated' : 'Item Added',
        editItem ? `${form.name} updated successfully.` : `${form.name} added to inventory.`,
      );
      setFormOpen(false);
      fetchItems();
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/inventory?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Archived', `${deleteTarget.name} has been archived.`);
      setDeleteTarget(null);
      fetchItems();
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const f = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  /* ── columns ── */
  const columns: Column[] = [
    {
      key: 'sku', label: 'SKU', width: '110px',
      render: (r) => <span className="font-mono text-[0.7rem] text-slate-400 dark:text-[var(--dark-text-3)]">{r.sku}</span>,
    },
    {
      key: 'name', label: 'Name', width: '200px',
      render: (r) => <span className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{r.name}</span>,
    },
    {
      key: 'category_name', label: 'Category', width: '150px',
      render: (r) => <span className="text-xs capitalize text-slate-500 dark:text-[var(--dark-text-2)]">{r.category_name ?? '—'}</span>,
    },
    {
      key: 'unit', label: 'Unit', width: '70px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.unit ?? '—'}</span>,
    },
    {
      key: 'current_stock', label: 'Stock', align: 'right', width: '100px',
      render: (r) => (
        <span className={`text-sm font-semibold tabular-nums ${r.low_stock ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-[var(--dark-text)]'}`}>
          {formatNumber(r.current_stock)}
        </span>
      ),
    },
    {
      key: 'reorder_level', label: 'Reorder', align: 'right', width: '90px',
      render: (r) => <span className="text-xs text-slate-400 tabular-nums">{formatNumber(r.reorder_level)}</span>,
    },
    {
      key: 'unit_cost', label: 'Unit Cost', align: 'right', width: '110px',
      render: (r) => <span className="text-xs tabular-nums text-slate-600 dark:text-[var(--dark-text-2)]">{formatCurrency(r.unit_cost)}</span>,
    },
    {
      key: 'location', label: 'Location', width: '120px',
      render: (r) => <span className="text-xs text-slate-400 dark:text-[var(--dark-text-3)]">{r.location ?? '—'}</span>,
    },
    {
      key: 'supplier_name', label: 'Supplier', width: '150px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-2)]">{r.supplier_name ?? '—'}</span>,
    },
    {
      key: 'status', label: 'Status', width: '100px', sortable: false,
      render: (r) =>
        r.low_stock
          ? <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-red-600 dark:text-red-400"><AlertTriangle size={10} />Low Stock</span>
          : <Badge status="active" label="In Stock" />,
    },
    {
      key: 'actions', label: '', width: '70px', sortable: false, align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            title="Edit"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Archive"
          >
            <Trash2 size={11} />
          </button>
        </div>
      ),
    },
  ];

  /* ── KPI cards ── */
  const kpis = summary ? [
    { label: 'Total Items', value: formatNumber(summary.total_items), icon: Package, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'In Stock', value: formatNumber(summary.in_stock), icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Low Stock', value: formatNumber(summary.low_stock), icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Total Value', value: formatCurrency(parseFloat(summary.total_value) || 0), icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Categories', value: summary.category_types, icon: Layers, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  ] : [];

  return (
    <div className="space-y-4">
      {/* ── KPIs ── */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpis.map((k, i) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className={`triumph-card p-4 flex items-center gap-3 anim-fade-up anim-d${Math.min(i + 1, 6)}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.bg}`}>
                  <Icon size={18} className={k.color} />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{k.value}</p>
                  <p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">{k.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Table ── */}
      <DataTable
        columns={columns}
        data={items}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        loading={loading}
        search={search}
        onSearchChange={handleSearchChange}
        onPageChange={setPage}
        onRowDoubleClick={openEdit}
        searchPlaceholder="Search by name or SKU…"
        emptyIcon="📦"
        emptyText="No inventory items found."
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        toolbar={
          <>
            <div className="flex gap-1">
              {CAT_TYPES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCatChange(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    catType === cat
                      ? 'bg-amber-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" icon={<Download size={13} />}>Export</Button>
            <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>Add Item</Button>
          </>
        }
      />

      {/* ── Form Modal ── */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Inventory Item' : 'Add Inventory Item'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">SKU *</label>
            <input className="triumph-input" value={form.sku} onChange={(e) => f('sku', e.target.value)} placeholder="e.g. RM-001" />
          </div>
          <div>
            <label className="triumph-label">Name *</label>
            <input className="triumph-input" value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="Item name" />
          </div>
          <div>
            <label className="triumph-label">Category</label>
            <select className="triumph-input" value={form.category_id} onChange={(e) => f('category_id', e.target.value)}>
              <option value="">— Select —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type?.replace('_', ' ')})</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Unit</label>
            <input className="triumph-input" value={form.unit} onChange={(e) => f('unit', e.target.value)} placeholder="kg / pcs / rolls…" />
          </div>
          <div>
            <label className="triumph-label">Current Stock</label>
            <input type="number" min="0" step="0.01" className="triumph-input" value={form.current_stock} onChange={(e) => f('current_stock', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Reorder Level</label>
            <input type="number" min="0" step="0.01" className="triumph-input" value={form.reorder_level} onChange={(e) => f('reorder_level', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Unit Cost (Rs)</label>
            <input type="number" min="0" step="0.01" className="triumph-input" value={form.unit_cost} onChange={(e) => f('unit_cost', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Supplier</label>
            <select className="triumph-input" value={form.supplier_id} onChange={(e) => f('supplier_id', e.target.value)}>
              <option value="">— None —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Storage Location</label>
            <input className="triumph-input" value={form.location} onChange={(e) => f('location', e.target.value)} placeholder="Shelf A, Row 3…" />
          </div>
          <div className="sm:col-span-2">
            <label className="triumph-label">Description</label>
            <textarea className="triumph-input resize-none" rows={2} value={form.description} onChange={(e) => f('description', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          {editItem && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => { setFormOpen(false); setDeleteTarget(editItem); }}
              icon={<Trash2 size={12} />}
            >
              Archive
            </Button>
          )}
          <Button size="sm" onClick={handleSave} loading={saving}>
            {editItem ? 'Save Changes' : 'Add Item'}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        variant="warning"
        title="Archive Inventory Item?"
        message={`This will archive "${deleteTarget?.name ?? ''}". The item won't appear in active inventory but data will be preserved.`}
        confirmLabel="Archive Item"
        loading={deleting}
      />
    </div>
  );
}

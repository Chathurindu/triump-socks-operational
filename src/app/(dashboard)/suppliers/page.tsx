'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Users, UserCheck, UserX, Star,
  Pencil, Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

const PAGE_SIZE = 15;

const EMPTY_FORM = {
  name: '', contact: '', phone: '', email: '',
  address: '', category: '', rating: '5', is_active: 'true',
};
type FormData = typeof EMPTY_FORM;

export default function SuppliersPage() {
  const [data, setData]       = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm]         = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/suppliers?meta=1').then((r) => r.json()).then((j) => setCategories(j.categories ?? []));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, sortKey, sortDir,
    });
    const res = await fetch(`/api/suppliers?${qs}`);
    const json = await res.json();
    setData(json.data ?? []);
    setTotal(json.total ?? 0);
    setSummary(json.summary ?? null);
    setLoading(false);
  }, [page, search, sortKey, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleSortChange   = (key: string, dir: 'asc' | 'desc') => { setSortKey(key); setSortDir(dir); setPage(1); };

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (row: any) => {
    setEditItem(row);
    setForm({
      name:      row.name ?? '',
      contact:   row.contact ?? '',
      phone:     row.phone ?? '',
      email:     row.email ?? '',
      address:   row.address ?? '',
      category:  row.category ?? '',
      rating:    row.rating != null ? String(row.rating) : '5',
      is_active: String(row.is_active ?? true),
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.warning('Validation', 'Supplier name is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        rating: form.rating ? parseInt(form.rating) : 5,
        is_active: form.is_active === 'true',
        ...(editItem ? { id: editItem.id } : {}),
      };
      const res = await fetch('/api/suppliers', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editItem ? 'Supplier Updated' : 'Supplier Added', `${form.name} saved successfully.`);
      setFormOpen(false);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/suppliers?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', `${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setDeleting(false); }
  };

  const f = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const columns: Column[] = [
    { key: 'name', label: 'Name', width: '180px', sortable: true,
      render: (r) => <span className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{r.name}</span> },
    { key: 'contact', label: 'Contact Person', width: '140px', sortable: true,
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-2)]">{r.contact ?? '—'}</span> },
    { key: 'phone', label: 'Phone', width: '120px',
      render: (r) => <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">{r.phone ?? '—'}</span> },
    { key: 'email', label: 'Email', width: '180px', sortable: true,
      render: (r) => <span className="text-xs text-blue-600 dark:text-blue-400">{r.email ?? '—'}</span> },
    { key: 'category', label: 'Category', width: '120px', sortable: true,
      render: (r) => r.category ? <Badge label={r.category} color="amber" /> : <span className="text-xs text-slate-400">—</span> },
    { key: 'rating', label: 'Rating', width: '100px', sortable: true, align: 'center',
      render: (r) => <span className="text-xs font-medium">{'⭐'.repeat(Math.round(r.rating || 0))}</span> },
    { key: 'is_active', label: 'Status', width: '90px', sortable: true,
      render: (r) => <Badge status={r.is_active ? 'active' : 'inactive'} label={r.is_active ? 'Active' : 'Inactive'} /> },
    { key: 'actions', label: '', width: '70px', sortable: false, align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Edit"><Pencil size={11} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete"><Trash2 size={11} /></button>
        </div>
      ) },
  ];

  const kpis = summary ? [
    { label: 'Total Suppliers', value: summary.total,      icon: Users,     color: 'text-blue-500',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Active',          value: summary.active,     icon: UserCheck, color: 'text-green-500',  bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Inactive',        value: summary.inactive,   icon: UserX,     color: 'text-red-500',    bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Avg. Rating',     value: summary.avg_rating ?? '—', icon: Star, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ] : [];

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

      <DataTable columns={columns} data={data} total={total} page={page} pageSize={PAGE_SIZE} loading={loading}
        search={search} onSearchChange={handleSearchChange} onPageChange={setPage} onRowDoubleClick={openEdit}
        searchPlaceholder="Search by name, contact, email, phone…" emptyIcon="🏭" emptyText="No suppliers found."
        sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange}
        toolbar={<Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>Add Supplier</Button>}
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Supplier' : 'Add Supplier'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">Supplier Name *</label>
            <input className="triumph-input" value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="Company name" />
          </div>
          <div>
            <label className="triumph-label">Contact Person</label>
            <input className="triumph-input" value={form.contact} onChange={(e) => f('contact', e.target.value)} placeholder="Contact name" />
          </div>
          <div>
            <label className="triumph-label">Phone</label>
            <input className="triumph-input" value={form.phone} onChange={(e) => f('phone', e.target.value)} placeholder="+94 77 123 4567" />
          </div>
          <div>
            <label className="triumph-label">Email</label>
            <input type="email" className="triumph-input" value={form.email} onChange={(e) => f('email', e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <label className="triumph-label">Category</label>
            <select className="triumph-input" value={form.category} onChange={(e) => f('category', e.target.value)}>
              <option value="">— Select —</option>
              {categories.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="triumph-label">Rating (1-5)</label>
            <select className="triumph-input" value={form.rating} onChange={(e) => f('rating', e.target.value)}>
              {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} ⭐</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Status</label>
            <select className="triumph-input" value={form.is_active} onChange={(e) => f('is_active', e.target.value)}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="triumph-label">Address</label>
            <textarea className="triumph-input resize-none" rows={2} value={form.address} onChange={(e) => f('address', e.target.value)} placeholder="Full address…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          {editItem && <Button variant="danger" size="sm" onClick={() => { setFormOpen(false); setDeleteTarget(editItem); }} icon={<Trash2 size={12} />}>Delete</Button>}
          <Button size="sm" onClick={handleSave} loading={saving}>{editItem ? 'Save Changes' : 'Add Supplier'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        variant="danger" title="Delete Supplier?" message={`This will permanently delete "${deleteTarget?.name ?? ''}". This action cannot be undone.`}
        confirmLabel="Delete Supplier" loading={deleting} />
    </div>
  );
}

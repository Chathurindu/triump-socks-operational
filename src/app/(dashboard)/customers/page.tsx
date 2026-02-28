'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Users, UserCheck, UserX, Layers,
  Pencil, Trash2, Mail, Phone,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

const PAGE_SIZE = 15;

const STATUS_TABS = [
  { value: '',         label: 'All' },
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const CUSTOMER_TYPES = ['retail', 'wholesale', 'distributor'];

const EMPTY_FORM = {
  name: '', contact: '', phone: '', email: '', address: '',
  customer_type: 'retail', is_active: true,
};
type FormData = typeof EMPTY_FORM;

export default function CustomersPage() {
  const [data, setData]       = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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

  const toast = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, status: statusFilter, sortKey, sortDir,
    });
    const res = await fetch(`/api/customers?${qs}`);
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
      name: row.name ?? '', contact: row.contact ?? '', phone: row.phone ?? '',
      email: row.email ?? '', address: row.address ?? '',
      customer_type: row.customer_type ?? 'retail', is_active: row.is_active ?? true,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.warning('Validation', 'Customer name is required.'); return; }
    setSaving(true);
    try {
      const method = editItem ? 'PATCH' : 'POST';
      const body = editItem ? { id: editItem.id, ...form } : { ...form };
      const res = await fetch('/api/customers', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editItem ? 'Updated' : 'Created', `Customer ${editItem ? 'updated' : 'created'} successfully.`);
      setFormOpen(false);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', 'Customer deleted.');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setDeleting(false); }
  };

  const f = (k: keyof FormData, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const columns: Column[] = [
    { key: 'name', label: 'Customer Name', width: '180px', sortable: true,
      render: (r) => (
        <div>
          <span className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{r.name}</span>
          {r.contact && <p className="text-[0.6rem] text-slate-400 dark:text-[var(--dark-text-3)]">{r.contact}</p>}
        </div>
      ) },
    { key: 'phone', label: 'Phone', width: '120px', sortable: true,
      render: (r) => r.phone ? (
        <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-[var(--dark-text-2)]"><Phone size={10} className="text-slate-400" />{r.phone}</span>
      ) : <span className="text-xs text-slate-300">—</span> },
    { key: 'email', label: 'Email', width: '170px', sortable: true,
      render: (r) => r.email ? (
        <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400"><Mail size={10} />{r.email}</span>
      ) : <span className="text-xs text-slate-300">—</span> },
    { key: 'customer_type', label: 'Type', width: '110px', sortable: true,
      render: (r) => <Badge label={r.customer_type} color={r.customer_type === 'wholesale' ? 'blue' : r.customer_type === 'distributor' ? 'purple' : 'amber'} /> },
    { key: 'address', label: 'Address', width: '180px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)] truncate block max-w-[180px]">{r.address ?? '—'}</span> },
    { key: 'is_active', label: 'Status', width: '90px', sortable: true,
      render: (r) => <Badge status={r.is_active ? 'active' : 'inactive'} label={r.is_active ? 'Active' : 'Inactive'} /> },
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
    { label: 'Total Customers', value: summary.total,        icon: Users,     color: 'text-blue-500',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Active',          value: summary.active,       icon: UserCheck, color: 'text-green-500',  bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Inactive',        value: summary.inactive,     icon: UserX,     color: 'text-red-500',    bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Customer Types',  value: summary.types_count,  icon: Layers,    color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
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
        searchPlaceholder="Search by name, contact, email, or phone…" emptyIcon="👥" emptyText="No customers found."
        sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange}
        toolbar={<>
          <div className="flex gap-1">
            {STATUS_TABS.map((t) => (
              <button key={t.value} onClick={() => handleStatusChange(t.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${statusFilter===t.value ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'}`}>{t.label}</button>
            ))}
          </div>
          <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>Add Customer</Button>
        </>}
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Customer' : 'New Customer'} size="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="triumph-label">Customer Name *</label><input className="triumph-input" value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="Enter customer name" /></div>
          <div><label className="triumph-label">Contact Person</label><input className="triumph-input" value={form.contact} onChange={(e) => f('contact', e.target.value)} placeholder="Contact person name" /></div>
          <div><label className="triumph-label">Phone</label><input className="triumph-input" value={form.phone} onChange={(e) => f('phone', e.target.value)} placeholder="+92 300 1234567" /></div>
          <div><label className="triumph-label">Email</label><input type="email" className="triumph-input" value={form.email} onChange={(e) => f('email', e.target.value)} placeholder="email@example.com" /></div>
          <div>
            <label className="triumph-label">Customer Type</label>
            <select className="triumph-input capitalize" value={form.customer_type} onChange={(e) => f('customer_type', e.target.value)}>
              {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className="triumph-label">Address</label><textarea className="triumph-input resize-none" rows={2} value={form.address} onChange={(e) => f('address', e.target.value)} placeholder="Full address…" /></div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input id="is_active" type="checkbox" checked={form.is_active as boolean} onChange={(e) => f('is_active', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
            <label htmlFor="is_active" className="text-sm text-slate-700 dark:text-[var(--dark-text)]">Active Customer</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} loading={saving}>{editItem ? 'Save Changes' : 'Create Customer'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        variant="danger" title="Delete Customer?" message={`Delete "${deleteTarget?.name ?? ''}"? This action cannot be undone.`}
        confirmLabel="Delete" loading={deleting} />
    </div>
  );
}

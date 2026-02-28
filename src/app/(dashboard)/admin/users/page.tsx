'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Users, UserCheck, UserX, Shield, Key, IdCard, Clock,
  Pencil, Trash2, ToggleLeft, ToggleRight, Download,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate, getInitials, timeAgo } from '@/lib/utils';
import jsPDF from 'jspdf';

const PAGE_SIZE = 15;

const STATUS_TABS = [
  { value: '',         label: 'All' },
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const EMPTY_FORM = {
  full_name: '', email: '', password: '', phone: '',
  role_id: '', department: '', designation: '', employee_id: '',
  avatar_url: '', is_active: true, group_ids: [] as number[],
};
type FormData = typeof EMPTY_FORM;

/* ─── Employee ID Card PDF ───────────────────────── */
function generateIdCardPDF(user: any) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [86, 54] });

  // Card background
  doc.setFillColor(30, 30, 40);
  doc.rect(0, 0, 86, 54, 'F');

  // Amber header stripe
  doc.setFillColor(217, 119, 6);
  doc.rect(0, 0, 86, 16, 'F');

  // Company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('TRIUMPH SOCKS', 43, 7, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('EMPLOYEE IDENTITY CARD', 43, 12, { align: 'center' });

  // Avatar circle
  doc.setFillColor(217, 119, 6);
  doc.circle(16, 28, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(getInitials(user.full_name || 'U'), 16, 31, { align: 'center' });

  // Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(user.full_name || 'N/A', 30, 24);

  // Details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(180, 180, 190);
  doc.text(`Designation: ${user.designation || 'N/A'}`, 30, 29);
  doc.text(`Department: ${user.department || 'N/A'}`, 30, 33);
  doc.text(`Employee ID: ${user.employee_id || 'N/A'}`, 30, 37);
  doc.text(`Email: ${user.email || 'N/A'}`, 30, 41);

  // Footer
  doc.setFillColor(40, 40, 55);
  doc.rect(0, 46, 86, 8, 'F');
  doc.setFontSize(4.5);
  doc.setTextColor(120, 120, 140);
  doc.text('Issued: ' + new Date().toLocaleDateString(), 4, 51);
  doc.text(`Role: ${user.role_name || 'N/A'}`, 50, 51);

  doc.save(`ID-Card-${user.full_name?.replace(/\s+/g, '-') || 'user'}.pdf`);
}

export default function UserManagementPage() {
  const [data, setData]       = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter]     = useState('');
  const [groupFilter, setGroupFilter]   = useState('');
  const [page, setPage]       = useState(1);
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen]   = useState(false);
  const [editItem, setEditItem]   = useState<any>(null);
  const [form, setForm]           = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  const [pwOpen, setPwOpen]         = useState(false);
  const [pwUser, setPwUser]         = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving]     = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  const [roles, setRoles]       = useState<any[]>([]);
  const [groups, setGroups]     = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/users?meta=1').then(r => r.json()).then(j => {
      setRoles(j.roles ?? []);
      setGroups(j.groups ?? []);
      setEmployees(j.employees ?? []);
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, status: statusFilter, roleId: roleFilter,
      groupId: groupFilter, sortKey, sortDir,
    });
    const res = await fetch(`/api/users?${qs}`);
    const json = await res.json();
    setData(json.data ?? []);
    setTotal(json.total ?? 0);
    setSummary(json.summary ?? null);
    setLoading(false);
  }, [page, statusFilter, roleFilter, groupFilter, search, sortKey, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleSortChange   = (key: string, dir: 'asc' | 'desc') => { setSortKey(key); setSortDir(dir); setPage(1); };

  const openAdd = () => { setEditItem(null); setForm({ ...EMPTY_FORM, group_ids: [] }); setFormOpen(true); };
  const openEdit = (row: any) => {
    setEditItem(row);
    setForm({
      full_name:   row.full_name ?? '',
      email:       row.email ?? '',
      password:    '',
      phone:       row.phone ?? '',
      role_id:     row.role_id ? String(row.role_id) : '',
      department:  row.department ?? '',
      designation: row.designation ?? '',
      employee_id: row.employee_id ?? '',
      avatar_url:  row.avatar_url ?? '',
      is_active:   row.is_active !== false,
      group_ids:   (row.groups || []).map((g: any) => g.id),
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.warning('Validation', 'Full name is required.'); return; }
    if (!form.email.trim())     { toast.warning('Validation', 'Email is required.'); return; }
    if (!editItem && !form.password.trim()) { toast.warning('Validation', 'Password is required for new users.'); return; }
    setSaving(true);
    try {
      const payload: any = {
        full_name: form.full_name, email: form.email, phone: form.phone,
        role_id: form.role_id ? parseInt(form.role_id) : null,
        department: form.department, designation: form.designation,
        employee_id: form.employee_id, avatar_url: form.avatar_url,
        is_active: form.is_active, group_ids: form.group_ids,
      };
      if (editItem) payload.id = editItem.id;
      if (form.password) payload.password = form.password;

      const res = await fetch('/api/users', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editItem ? 'User Updated' : 'User Created', `${form.full_name} saved.`);
      setFormOpen(false);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (row: any) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, action: 'toggle_active' }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const j = await res.json();
      toast.success('Status Changed', `${j.user.full_name} is now ${j.user.is_active ? 'active' : 'inactive'}.`);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
  };

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword.length < 6) { toast.warning('Validation', 'Min 6 characters.'); return; }
    setPwSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pwUser.id, action: 'reset_password', new_password: newPassword }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Password Reset', `Password updated for ${pwUser.full_name}.`);
      setPwOpen(false);
      setNewPassword('');
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setPwSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('User Deleted', `${deleteTarget.full_name} removed.`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setDeleting(false); }
  };

  const toggleGroup = (gid: number) => {
    setForm(prev => ({
      ...prev,
      group_ids: prev.group_ids.includes(gid)
        ? prev.group_ids.filter(id => id !== gid)
        : [...prev.group_ids, gid],
    }));
  };

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const columns: Column[] = [
    { key: 'full_name', label: 'User', width: '220px', sortable: true,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
            {r.avatar_url
              ? <img src={r.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
              : <span className="text-white text-[0.58rem] font-bold">{getInitials(r.full_name)}</span>}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)] leading-tight truncate">{r.full_name}</p>
            <p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] truncate">{r.email}</p>
          </div>
        </div>
      ) },
    { key: 'role_name', label: 'Role', width: '100px', sortable: true,
      render: (r) => (
        <Badge color={r.role_name === 'admin' ? 'red' : r.role_name === 'manager' ? 'purple' : r.role_name === 'staff' ? 'blue' : 'gray'}
               label={r.role_name || '—'} />
      ) },
    { key: 'designation', label: 'Designation', width: '130px',
      render: (r) => <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">{r.designation || '—'}</span> },
    { key: 'groups', label: 'Groups', width: '180px', sortable: false,
      render: (r) => {
        const grps = r.groups || [];
        if (grps.length === 0) return <span className="text-xs text-slate-400">—</span>;
        return (
          <div className="flex flex-wrap gap-0.5">
            {grps.slice(0, 2).map((g: any) => (
              <span key={g.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[0.6rem] font-medium" style={{ background: g.color + '22', color: g.color }}>{g.name}</span>
            ))}
            {grps.length > 2 && <span className="text-[0.6rem] text-slate-400">+{grps.length - 2}</span>}
          </div>
        );
      } },
    { key: 'is_active', label: 'Status', width: '80px', sortable: true,
      render: (r) => <Badge color={r.is_active ? 'green' : 'red'} label={r.is_active ? 'Active' : 'Inactive'} /> },
    { key: 'last_login', label: 'Last Login', width: '120px', sortable: true,
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.last_login ? timeAgo(r.last_login) : 'Never'}</span> },
    { key: 'actions', label: '', width: '120px', sortable: false, align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-0.5">
          <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Edit"><Pencil size={11} /></button>
          <button onClick={(e) => { e.stopPropagation(); setPwUser(r); setPwOpen(true); setNewPassword(''); }} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Reset Password"><Key size={11} /></button>
          <button onClick={(e) => { e.stopPropagation(); handleToggleActive(r); }} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Toggle Active">
            {r.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); generateIdCardPDF(r); }} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors" title="ID Card"><IdCard size={12} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete"><Trash2 size={11} /></button>
        </div>
      ) },
  ];

  const kpis = summary ? [
    { label: 'Total Users', value: summary.total, icon: Users, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Active',      value: summary.active, icon: UserCheck, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Inactive',    value: summary.inactive, icon: UserX, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Active Last 7d', value: summary.active_last_week, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
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
        searchPlaceholder="Search users by name, email, or role…" emptyIcon="👤" emptyText="No users found."
        sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange}
        toolbar={<>
          <div className="flex gap-1">
            {STATUS_TABS.map(t => (
              <button key={t.value} onClick={() => { setStatusFilter(t.value); setPage(1); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${statusFilter===t.value ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'}`}>{t.label}</button>
            ))}
          </div>
          {roles.length > 0 && (
            <select className="triumph-input py-1 text-xs w-28" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
              <option value="">All Roles</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          {groups.length > 0 && (
            <select className="triumph-input py-1 text-xs w-32" value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setPage(1); }}>
              <option value="">All Groups</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
          <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>Add User</Button>
        </>}
      />

      {/* ─── User Form Modal ─── */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit User' : 'New User'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="triumph-label">Full Name *</label><input className="triumph-input" value={form.full_name} onChange={e => f('full_name', e.target.value)} /></div>
          <div><label className="triumph-label">Email *</label><input type="email" className="triumph-input" value={form.email} onChange={e => f('email', e.target.value)} /></div>
          {!editItem && <div><label className="triumph-label">Password *</label><input type="password" className="triumph-input" value={form.password} onChange={e => f('password', e.target.value)} placeholder="Min 6 characters" /></div>}
          <div><label className="triumph-label">Phone</label><input className="triumph-input" value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
          <div>
            <label className="triumph-label">Role</label>
            <select className="triumph-input" value={form.role_id} onChange={e => f('role_id', e.target.value)}>
              <option value="">— Select —</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div><label className="triumph-label">Department</label><input className="triumph-input" value={form.department} onChange={e => f('department', e.target.value)} /></div>
          <div><label className="triumph-label">Designation</label><input className="triumph-input" value={form.designation} onChange={e => f('designation', e.target.value)} /></div>
          <div><label className="triumph-label">Employee ID</label><input className="triumph-input" value={form.employee_id} onChange={e => f('employee_id', e.target.value)} placeholder="EMP-001" /></div>
          <div><label className="triumph-label">Avatar URL</label><input className="triumph-input" value={form.avatar_url} onChange={e => f('avatar_url', e.target.value)} placeholder="https://…" /></div>
          <div className="flex items-center gap-2 pt-6">
            <button type="button" onClick={() => f('is_active', !form.is_active)} className={`relative w-9 h-5 rounded-full transition-colors ${form.is_active ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${form.is_active ? 'translate-x-4' : ''}`} />
            </button>
            <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">{form.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>

        {/* Group assignment */}
        {groups.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
            <label className="triumph-label mb-2 block">User Groups</label>
            <div className="flex flex-wrap gap-1.5">
              {groups.map(g => {
                const active = form.group_ids.includes(g.id);
                return (
                  <button key={g.id} type="button" onClick={() => toggleGroup(g.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${active ? 'border-transparent text-white shadow-sm' : 'border-slate-200 dark:border-[var(--dark-border)] text-slate-500 dark:text-[var(--dark-text-3)] hover:border-slate-400'}`}
                    style={active ? { background: g.color } : {}}
                  >{g.name}</button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          {editItem && <Button variant="danger" size="sm" onClick={() => { setFormOpen(false); setDeleteTarget(editItem); }} icon={<Trash2 size={12} />}>Delete</Button>}
          <Button size="sm" onClick={handleSave} loading={saving}>{editItem ? 'Save Changes' : 'Create User'}</Button>
        </div>
      </Modal>

      {/* ─── Password Reset Modal ─── */}
      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Reset Password" size="sm">
        <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)] mb-3">
          Reset password for <span className="font-semibold text-slate-800 dark:text-[var(--dark-text)]">{pwUser?.full_name}</span>
        </p>
        <div>
          <label className="triumph-label">New Password *</label>
          <input type="password" className="triumph-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setPwOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handlePasswordReset} loading={pwSaving} icon={<Key size={12} />}>Reset Password</Button>
        </div>
      </Modal>

      {/* ─── Delete Confirm ─── */}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        variant="danger" title="Delete User?" message={`This will permanently remove "${deleteTarget?.full_name ?? ''}". Continue?`}
        confirmLabel="Delete" loading={deleting} />
    </div>
  );
}

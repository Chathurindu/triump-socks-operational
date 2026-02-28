'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Activity, Users, FileText, Database, Clock, Shield,
  Trash2, Download, Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { timeAgo } from '@/lib/utils';
import * as XLSX from 'xlsx';

const PAGE_SIZE = 20;

const ACTION_COLORS: Record<string, 'green' | 'blue' | 'red' | 'amber' | 'purple' | 'gray'> = {
  create: 'green', update: 'blue', delete: 'red', login: 'amber',
  password_reset: 'purple', status_change: 'amber', logout: 'gray', view: 'gray',
};

export default function ActivityLogsPage() {
  const [data, setData]       = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);

  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [modules, setModules]           = useState<string[]>([]);
  const [actions, setActions]           = useState<string[]>([]);

  const [clearOpen, setClearOpen]   = useState(false);
  const [clearDate, setClearDate]   = useState('');
  const [clearing, setClearing]     = useState(false);

  const toast = useToast();

  /* ── Meta: distinct modules & actions ── */
  useEffect(() => {
    fetch('/api/activity-logs?meta=1').then(r => r.json()).then(j => {
      setModules(j.modules ?? []);
      setActions(j.actions ?? []);
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, sortKey, sortDir,
      ...(moduleFilter ? { module: moduleFilter } : {}),
      ...(actionFilter ? { action: actionFilter } : {}),
      ...(dateFrom ? { from: dateFrom } : {}),
      ...(dateTo ? { to: dateTo } : {}),
    });
    const res = await fetch(`/api/activity-logs?${qs}`);
    const json = await res.json();
    setData(json.data ?? []);
    setTotal(json.total ?? 0);
    setSummary(json.summary ?? null);
    setLoading(false);
  }, [page, search, moduleFilter, actionFilter, dateFrom, dateTo, sortKey, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleSortChange   = (key: string, dir: 'asc' | 'desc') => { setSortKey(key); setSortDir(dir); setPage(1); };

  const handleClear = async () => {
    if (!clearDate) { toast.warning('Validation', 'Select a date.'); return; }
    setClearing(true);
    try {
      const res = await fetch(`/api/activity-logs?before=${clearDate}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const j = await res.json();
      toast.success('Logs Cleared', `${j.deleted} logs removed before ${clearDate}.`);
      setClearOpen(false);
      setClearDate('');
      fetchData();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setClearing(false); }
  };

  const exportExcel = () => {
    const rows = data.map(r => ({
      'Date': new Date(r.created_at).toLocaleString(),
      'User': r.user_name || r.user_email || '—',
      'Action': r.action,
      'Module': r.module,
      'Entity': r.entity_type || '—',
      'Description': r.description || '—',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Activity Logs');
    XLSX.writeFile(wb, `activity-logs-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const columns: Column[] = [
    { key: 'created_at', label: 'Time', width: '140px', sortable: true,
      render: (r) => (
        <div>
          <p className="text-xs text-slate-700 dark:text-[var(--dark-text)]">{timeAgo(r.created_at)}</p>
          <p className="text-[0.6rem] text-slate-400 dark:text-[var(--dark-text-3)]">{new Date(r.created_at).toLocaleString()}</p>
        </div>
      ) },
    { key: 'user_name', label: 'User', width: '150px', sortable: true,
      render: (r) => (
        <div>
          <p className="text-xs font-medium text-slate-800 dark:text-[var(--dark-text)]">{r.user_name || '—'}</p>
          <p className="text-[0.6rem] text-slate-400 dark:text-[var(--dark-text-3)]">{r.user_email || ''}</p>
        </div>
      ) },
    { key: 'action', label: 'Action', width: '110px', sortable: true,
      render: (r) => <Badge color={ACTION_COLORS[r.action] || 'gray'} label={r.action} /> },
    { key: 'module', label: 'Module', width: '100px', sortable: true,
      render: (r) => <span className="text-xs font-medium text-slate-600 dark:text-[var(--dark-text-2)] capitalize">{r.module || '—'}</span> },
    { key: 'entity_type', label: 'Entity', width: '100px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.entity_type || '—'}</span> },
    { key: 'description', label: 'Description', width: '260px', sortable: true,
      render: (r) => <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)] line-clamp-2">{r.description || '—'}</span> },
  ];

  const kpis = summary ? [
    { label: 'Total Logs',   value: summary.total,        icon: Activity,  color: 'text-blue-500',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Unique Users', value: summary.unique_users,  icon: Users,     color: 'text-green-500',  bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Creates',      value: summary.creates,       icon: FileText,  color: 'text-amber-500',  bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Updates',      value: summary.updates,       icon: Database,  color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Deletes',      value: summary.deletes,       icon: Trash2,    color: 'text-red-500',    bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Logins',       value: summary.logins,        icon: Shield,    color: 'text-cyan-500',   bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  ] : [];

  return (
    <div className="space-y-4">
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
        searchPlaceholder="Search by user, description, module…" emptyIcon="📋" emptyText="No activity logs found."
        sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange}
        toolbar={<>
          <select className="triumph-input py-1 text-xs w-28" value={moduleFilter} onChange={e => { setModuleFilter(e.target.value); setPage(1); }}>
            <option value="">All Modules</option>
            {modules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="triumph-input py-1 text-xs w-24" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
            <option value="">All Actions</option>
            {actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <input type="date" className="triumph-input py-1 text-xs w-32" value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }} title="From date" />
          <input type="date" className="triumph-input py-1 text-xs w-32" value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }} title="To date" />
          <Button variant="outline" size="sm" icon={<Download size={12} />} onClick={exportExcel}>Excel</Button>
          <Button variant="danger" size="sm" icon={<Trash2 size={12} />} onClick={() => setClearOpen(true)}>Clear</Button>
        </>}
      />

      {/* ─── Clear Logs Dialog ─── */}
      {clearOpen && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setClearOpen(false); }}>
          <div className="modal-panel max-w-sm w-full">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-[var(--dark-border)]">
              <h2 className="text-base font-semibold text-slate-800 dark:text-[var(--dark-text)]">Clear Old Logs</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)] mb-3">Delete all logs created before this date:</p>
              <input type="date" className="triumph-input" value={clearDate} onChange={e => setClearDate(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 px-5 pb-4">
              <Button variant="secondary" size="sm" onClick={() => setClearOpen(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleClear} loading={clearing} icon={<Trash2 size={12} />}>Clear Logs</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

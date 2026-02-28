'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, MapPin, Package, Box, Boxes, Pencil, Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatNumber } from '@/lib/utils';

const PAGE_SIZE = 15;

type FormData = {
  code: string; zone: string; aisle: string; rack: string; shelf: string; bin: string;
  capacity: string; item_id: string; current_qty: string; notes: string;
};

const EMPTY_FORM: FormData = {
  code: '', zone: '', aisle: '', rack: '', shelf: '', bin: '',
  capacity: '', item_id: '', current_qty: '', notes: '',
};

export default function WarehousePage() {
  /* ── state ── */
  const [rows, setRows]             = useState<any[]>([]);
  const [total, setTotal]           = useState(0);
  const [summary, setSummary]       = useState<any>(null);
  const [zones, setZones]           = useState<string[]>([]);
  const [zoneFilter, setZoneFilter] = useState('');
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [sortKey, setSortKey]       = useState('code');
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('asc');
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
  const [items, setItems] = useState<any[]>([]);

  const toast = useToast();

  /* ── load meta ── */
  useEffect(() => {
    fetch('/api/warehouse?meta=1')
      .then((r) => r.json())
      .then((j) => {
        setItems(j.items ?? []);
      });
  }, []);

  /* ── fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, zone: zoneFilter,
    });
    const res = await fetch(`/api/warehouse?${qs}`);
    const json = await res.json();
    setRows(json.rows ?? []);
    setTotal((json.rows ?? []).length);
    setSummary(json.summary ?? null);
    setZones(json.zones ?? []);
    setLoading(false);
  }, [search, zoneFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── handlers ── */
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleZoneChange   = (v: string) => { setZoneFilter(v); setPage(1); };
  const handleSortChange   = (key: string, dir: 'asc' | 'desc') => { setSortKey(key); setSortDir(dir); setPage(1); };

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (row: any) => {
    setEditItem(row);
    setForm({
      code: row.code ?? '',
      zone: row.zone ?? '',
      aisle: row.aisle ?? '',
      rack: row.rack ?? '',
      shelf: row.shelf ?? '',
      bin: row.bin ?? '',
      capacity: String(row.capacity ?? ''),
      item_id: row.item_id ? String(row.item_id) : '',
      current_qty: String(row.current_qty ?? ''),
      notes: row.notes ?? '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast.warning('Validation', 'Location code is required.'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        capacity: parseFloat(form.capacity) || 0,
        item_id: form.item_id || null,
        current_qty: parseFloat(form.current_qty) || 0,
        ...(editItem ? { id: editItem.id } : {}),
      };
      const res = await fetch('/api/warehouse', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');

      toast.success(
        editItem ? 'Location Updated' : 'Location Added',
        editItem ? `${form.code} updated successfully.` : `${form.code} added to warehouse.`,
      );
      setFormOpen(false);
      fetchData();
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
      const res = await fetch('/api/warehouse', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', `Location ${deleteTarget.code} has been removed.`);
      setDeleteTarget(null);
      fetchData();
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
      key: 'code', label: 'Code', width: '110px',
      render: (r) => <span className="font-mono text-[0.7rem] font-semibold text-slate-700 dark:text-[var(--dark-text)]">{r.code}</span>,
    },
    {
      key: 'zone', label: 'Zone', width: '80px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-2)]">{r.zone ?? '—'}</span>,
    },
    {
      key: 'aisle', label: 'Aisle', width: '70px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.aisle ?? '—'}</span>,
    },
    {
      key: 'rack', label: 'Rack', width: '70px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.rack ?? '—'}</span>,
    },
    {
      key: 'shelf', label: 'Shelf', width: '70px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.shelf ?? '—'}</span>,
    },
    {
      key: 'bin', label: 'Bin', width: '70px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.bin ?? '—'}</span>,
    },
    {
      key: 'item_name', label: 'Item', width: '160px',
      render: (r) => <span className="text-sm text-slate-700 dark:text-[var(--dark-text)]">{r.item_name ?? '—'}</span>,
    },
    {
      key: 'current_qty', label: 'Current Qty', align: 'right', width: '100px',
      render: (r) => (
        <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-[var(--dark-text)]">
          {formatNumber(r.current_qty ?? 0)}
        </span>
      ),
    },
    {
      key: 'capacity', label: 'Capacity', align: 'right', width: '90px',
      render: (r) => <span className="text-xs tabular-nums text-slate-400">{formatNumber(r.capacity ?? 0)}</span>,
    },
    {
      key: 'utilization', label: 'Utilization', width: '120px', sortable: false,
      render: (r) => {
        const pct = r.capacity > 0 ? Math.min(100, Math.round((r.current_qty / r.capacity) * 100)) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[0.65rem] tabular-nums text-slate-500 dark:text-[var(--dark-text-3)] w-8 text-right">{pct}%</span>
          </div>
        );
      },
    },
    {
      key: 'status', label: 'Status', width: '90px', sortable: false,
      render: (r) =>
        r.current_qty > 0
          ? <Badge status="active" label="Occupied" />
          : <Badge status="inactive" label="Empty" />,
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
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
        </div>
      ),
    },
  ];

  /* ── KPI cards ── */
  const kpis = summary ? [
    { label: 'Total Locations', value: formatNumber(parseInt(summary.total) || 0), icon: MapPin, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Occupied', value: formatNumber(parseInt(summary.occupied) || 0), icon: Package, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Empty', value: formatNumber(parseInt(summary.empty) || 0), icon: Box, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Total Qty', value: formatNumber(parseInt(summary.total_qty) || 0), icon: Boxes, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  ] : [];

  return (
    <div className="space-y-4">
      {/* ── KPIs ── */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
        data={rows}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        loading={loading}
        search={search}
        onSearchChange={handleSearchChange}
        onPageChange={setPage}
        onRowDoubleClick={openEdit}
        searchPlaceholder="Search by code or item…"
        emptyIcon="📦"
        emptyText="No warehouse locations found."
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        toolbar={
          <>
            <select
              className="triumph-input text-xs !w-auto !py-1.5 !px-2.5"
              value={zoneFilter}
              onChange={(e) => handleZoneChange(e.target.value)}
            >
              <option value="">All Zones</option>
              {zones.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
            <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>Add Location</Button>
          </>
        }
      />

      {/* ── Form Modal ── */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Bin Location' : 'Add Bin Location'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">Code *</label>
            <input className="triumph-input" value={form.code} onChange={(e) => f('code', e.target.value)} placeholder="e.g. A-01-01-01" />
          </div>
          <div>
            <label className="triumph-label">Zone</label>
            <input className="triumph-input" value={form.zone} onChange={(e) => f('zone', e.target.value)} placeholder="e.g. Zone A" />
          </div>
          <div>
            <label className="triumph-label">Aisle</label>
            <input className="triumph-input" value={form.aisle} onChange={(e) => f('aisle', e.target.value)} placeholder="e.g. A1" />
          </div>
          <div>
            <label className="triumph-label">Rack</label>
            <input className="triumph-input" value={form.rack} onChange={(e) => f('rack', e.target.value)} placeholder="e.g. R1" />
          </div>
          <div>
            <label className="triumph-label">Shelf</label>
            <input className="triumph-input" value={form.shelf} onChange={(e) => f('shelf', e.target.value)} placeholder="e.g. S1" />
          </div>
          <div>
            <label className="triumph-label">Bin</label>
            <input className="triumph-input" value={form.bin} onChange={(e) => f('bin', e.target.value)} placeholder="e.g. B1" />
          </div>
          <div>
            <label className="triumph-label">Capacity</label>
            <input type="number" min="0" step="1" className="triumph-input" value={form.capacity} onChange={(e) => f('capacity', e.target.value)} placeholder="Max quantity" />
          </div>
          <div>
            <label className="triumph-label">Item</label>
            <select className="triumph-input" value={form.item_id} onChange={(e) => f('item_id', e.target.value)}>
              <option value="">— None —</option>
              {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Current Qty</label>
            <input type="number" min="0" step="1" className="triumph-input" value={form.current_qty} onChange={(e) => f('current_qty', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="triumph-label">Notes</label>
            <textarea className="triumph-input resize-none" rows={2} value={form.notes} onChange={(e) => f('notes', e.target.value)} />
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
              Delete
            </Button>
          )}
          <Button size="sm" onClick={handleSave} loading={saving}>
            {editItem ? 'Save Changes' : 'Add Location'}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        variant="warning"
        title="Delete Bin Location?"
        message={`This will permanently delete location "${deleteTarget?.code ?? ''}". This action cannot be undone.`}
        confirmLabel="Delete Location"
        loading={deleting}
      />
    </div>
  );
}

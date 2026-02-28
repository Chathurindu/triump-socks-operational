'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, ClipboardList, CheckCircle2, XCircle, FileCheck,
  Pencil, Trash2, Eye, X,
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
  { value: '',          label: 'All' },
  { value: 'draft',     label: 'Draft' },
  { value: 'verified',  label: 'Verified' },
  { value: 'accepted',  label: 'Accepted' },
  { value: 'rejected',  label: 'Rejected' },
];

type BadgeColor = 'amber' | 'blue' | 'green' | 'red' | 'gray' | 'purple';
const statusColorMap: Record<string, BadgeColor> = {
  draft: 'gray', verified: 'blue', accepted: 'green', rejected: 'red',
};

type GrnItem = {
  item_id: string; ordered_qty: string; received_qty: string;
  accepted_qty: string; rejected_qty: string; rejection_reason: string;
  bin_location_id: string;
};

type FormData = {
  grn_number: string; po_id: string; supplier_id: string; received_by: string;
  received_date: string; status: string; notes: string;
  items: GrnItem[];
};

const EMPTY_ITEM: GrnItem = {
  item_id: '', ordered_qty: '', received_qty: '',
  accepted_qty: '', rejected_qty: '', rejection_reason: '',
  bin_location_id: '',
};

const EMPTY_FORM: FormData = {
  grn_number: '', po_id: '', supplier_id: '', received_by: '',
  received_date: new Date().toISOString().slice(0, 10),
  status: 'draft', notes: '',
  items: [{ ...EMPTY_ITEM }],
};

export default function GoodsReceiptNotesPage() {
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
  const [form, setForm]           = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  /* view modal */
  const [viewItem, setViewItem]   = useState<any>(null);
  const [viewItems, setViewItems] = useState<any[]>([]);

  /* delete */
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  /* meta */
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers]           = useState<any[]>([]);
  const [employees, setEmployees]           = useState<any[]>([]);
  const [items, setItems]                   = useState<any[]>([]);
  const [bins, setBins]                     = useState<any[]>([]);
  const [nextNumber, setNextNumber]         = useState('');

  const toast = useToast();

  /* ── load meta ── */
  useEffect(() => {
    fetch('/api/grn?meta=1')
      .then((r) => r.json())
      .then((j) => {
        setPurchaseOrders(j.purchaseOrders ?? []);
        setSuppliers(j.suppliers ?? []);
        setEmployees(j.employees ?? []);
        setItems(j.items ?? []);
        setBins(j.bins ?? []);
        setNextNumber(j.nextNumber ?? '');
      });
  }, []);

  /* ── fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      search, status: statusFilter,
      sortKey, sortDir,
    });
    const res = await fetch(`/api/grn?${qs}`);
    const json = await res.json();
    setData(json.rows ?? []);
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
    setForm({ ...EMPTY_FORM, grn_number: nextNumber, items: [{ ...EMPTY_ITEM }] });
    setFormOpen(true);
  };

  const openEdit = async (row: any) => {
    try {
      const res = await fetch(`/api/grn?id=${row.id}`);
      const json = await res.json();
      const grn = json.grn;
      const grnItems: any[] = json.items ?? [];
      setEditItem(grn);
      setForm({
        grn_number:    grn.grn_number ?? '',
        po_id:         grn.po_id ? String(grn.po_id) : '',
        supplier_id:   grn.supplier_id ? String(grn.supplier_id) : '',
        received_by:   grn.received_by ? String(grn.received_by) : '',
        received_date: grn.received_date ? String(grn.received_date).slice(0, 10) : '',
        status:        grn.status ?? 'draft',
        notes:         grn.notes ?? '',
        items: grnItems.length
          ? grnItems.map((it) => ({
              item_id:          it.item_id ? String(it.item_id) : '',
              ordered_qty:      String(it.ordered_qty ?? ''),
              received_qty:     String(it.received_qty ?? ''),
              accepted_qty:     String(it.accepted_qty ?? ''),
              rejected_qty:     String(it.rejected_qty ?? ''),
              rejection_reason: it.rejection_reason ?? '',
              bin_location_id:  it.bin_location_id ? String(it.bin_location_id) : '',
            }))
          : [{ ...EMPTY_ITEM }],
      });
      setFormOpen(true);
    } catch {
      toast.error('Error', 'Failed to load GRN details.');
    }
  };

  const openView = async (row: any) => {
    try {
      const res = await fetch(`/api/grn?id=${row.id}`);
      const json = await res.json();
      setViewItem(json.grn);
      setViewItems(json.items ?? []);
    } catch {
      toast.error('Error', 'Failed to load GRN details.');
    }
  };

  const handleSave = async () => {
    if (!form.grn_number.trim()) { toast.warning('Validation', 'GRN number is required.'); return; }
    if (!form.supplier_id) { toast.warning('Validation', 'Supplier is required.'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        items: form.items
          .filter((it) => it.item_id)
          .map((it) => ({
            item_id:          it.item_id,
            ordered_qty:      parseFloat(it.ordered_qty) || 0,
            received_qty:     parseFloat(it.received_qty) || 0,
            accepted_qty:     parseFloat(it.accepted_qty) || 0,
            rejected_qty:     parseFloat(it.rejected_qty) || 0,
            rejection_reason: it.rejection_reason || null,
            bin_location_id:  it.bin_location_id || null,
          })),
        ...(editItem ? { id: editItem.id } : {}),
      };
      const res = await fetch('/api/grn', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');

      toast.success(
        editItem ? 'GRN Updated' : 'GRN Created',
        editItem ? 'Goods receipt note updated successfully.' : 'Goods receipt note created successfully.',
      );
      setFormOpen(false);
      fetchData();
      // Refresh meta for next number
      fetch('/api/grn?meta=1').then((r) => r.json()).then((j) => setNextNumber(j.nextNumber ?? ''));
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
      const res = await fetch('/api/grn', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', `GRN ${deleteTarget.grn_number ?? ''} has been deleted.`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setDeleting(false);
    }
  };

  /* ── form helpers ── */
  const f = (k: keyof FormData, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const updateItem = (idx: number, key: keyof GrnItem, val: string) => {
    setForm((p) => ({
      ...p,
      items: p.items.map((it, i) => (i === idx ? { ...it, [key]: val } : it)),
    }));
  };
  const addItem = () => setForm((p) => ({ ...p, items: [...p.items, { ...EMPTY_ITEM }] }));
  const removeItem = (idx: number) => setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  /* ── columns ── */
  const columns: Column[] = [
    {
      key: 'grn_number', label: 'GRN Number', width: '130px', sortable: true,
      render: (r) => <span className="font-mono text-[0.7rem] text-amber-700 dark:text-amber-400">{r.grn_number}</span>,
    },
    {
      key: 'po_number', label: 'PO Reference', width: '130px',
      render: (r) => r.po_number
        ? <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">{r.po_number}</span>
        : <span className="text-xs text-slate-400">—</span>,
    },
    {
      key: 'supplier_name', label: 'Supplier', sortable: true,
      render: (r) => <span className="text-xs font-medium text-slate-700 dark:text-[var(--dark-text)]">{r.supplier_name ?? '—'}</span>,
    },
    {
      key: 'received_date', label: 'Date', width: '110px', sortable: true,
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.received_date ? formatDate(r.received_date) : '—'}</span>,
    },
    {
      key: 'status', label: 'Status', width: '100px', sortable: true,
      render: (r) => <Badge label={r.status} color={statusColorMap[r.status] ?? 'gray'} />,
    },
    {
      key: 'item_count', label: 'Items', width: '70px', align: 'right',
      render: (r) => <span className="text-sm tabular-nums text-slate-600 dark:text-[var(--dark-text-2)]">{r.item_count ?? 0}</span>,
    },
    {
      key: 'actions', label: '', width: '100px', sortable: false, align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openView(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="View"
          >
            <Eye size={11} />
          </button>
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
    { label: 'Total GRNs',  value: summary.total,    icon: ClipboardList, color: 'text-blue-500',  bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Verified',    value: summary.total - (summary.accepted ?? 0) - (summary.rejected ?? 0), icon: FileCheck, color: 'text-sky-500', bg: 'bg-sky-100 dark:bg-sky-900/30' },
    { label: 'Accepted',    value: summary.accepted,  icon: CheckCircle2,  color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Rejected',    value: summary.rejected,  icon: XCircle,       color: 'text-red-500',   bg: 'bg-red-100 dark:bg-red-900/30' },
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
        data={data}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        loading={loading}
        search={search}
        onSearchChange={handleSearchChange}
        onPageChange={setPage}
        onRowDoubleClick={openEdit}
        searchPlaceholder="Search by GRN number, supplier…"
        emptyIcon="📦"
        emptyText="No goods receipt notes found."
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        toolbar={
          <>
            <div className="flex gap-1">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleStatusChange(t.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    statusFilter === t.value
                      ? 'bg-amber-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Button size="sm" icon={<Plus size={13} />} onClick={openAdd}>New GRN</Button>
          </>
        }
      />

      {/* ══════════════════════════════ VIEW MODAL ══════════════════════════════ */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title={`GRN ${viewItem?.grn_number ?? ''}`} size="xl">
        {viewItem && (
          <div className="space-y-4">
            {/* Header details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
              <div>
                <p className="text-slate-400">GRN Number</p>
                <p className="font-semibold text-slate-800 dark:text-white">{viewItem.grn_number}</p>
              </div>
              <div>
                <p className="text-slate-400">Date</p>
                <p className="font-semibold text-slate-800 dark:text-white">{viewItem.received_date ? formatDate(viewItem.received_date) : '—'}</p>
              </div>
              <div>
                <p className="text-slate-400">Supplier</p>
                <p className="font-semibold text-slate-800 dark:text-white">{viewItem.supplier_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-slate-400">PO Reference</p>
                <p className="font-semibold text-slate-800 dark:text-white">{viewItem.po_number ?? '—'}</p>
              </div>
              <div>
                <p className="text-slate-400">Received By</p>
                <p className="font-semibold text-slate-800 dark:text-white">{viewItem.received_by_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-slate-400">Status</p>
                <Badge label={viewItem.status} color={statusColorMap[viewItem.status] ?? 'gray'} />
              </div>
            </div>

            {/* Items table */}
            <div className="border rounded-lg overflow-hidden dark:border-[var(--dark-border)]">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-[var(--dark-surface)]">
                  <tr>
                    <th className="text-left p-2 font-medium text-slate-500">Item Name</th>
                    <th className="text-right p-2 font-medium text-slate-500">Ordered</th>
                    <th className="text-right p-2 font-medium text-slate-500">Received</th>
                    <th className="text-right p-2 font-medium text-slate-500">Accepted</th>
                    <th className="text-right p-2 font-medium text-slate-500">Rejected</th>
                    <th className="text-left p-2 font-medium text-slate-500">Rejection Reason</th>
                    <th className="text-left p-2 font-medium text-slate-500">Bin Location</th>
                  </tr>
                </thead>
                <tbody>
                  {viewItems.map((it, i) => (
                    <tr key={i} className="border-t dark:border-[var(--dark-border)]">
                      <td className="p-2 text-slate-700 dark:text-[var(--dark-text)]">{it.item_name ?? '—'}</td>
                      <td className="p-2 text-right tabular-nums">{it.ordered_qty ?? 0}</td>
                      <td className="p-2 text-right tabular-nums">{it.received_qty ?? 0}</td>
                      <td className="p-2 text-right tabular-nums text-green-600 dark:text-green-400">{it.accepted_qty ?? 0}</td>
                      <td className="p-2 text-right tabular-nums text-red-600 dark:text-red-400">{it.rejected_qty ?? 0}</td>
                      <td className="p-2 text-slate-500">{it.rejection_reason || '—'}</td>
                      <td className="p-2 text-slate-500">{it.bin_code || '—'}</td>
                    </tr>
                  ))}
                  {viewItems.length === 0 && (
                    <tr>
                      <td className="p-4 text-center text-slate-400" colSpan={7}>No items recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            {viewItem.notes && (
              <div className="text-xs">
                <p className="text-slate-400 mb-1">Notes</p>
                <p className="text-slate-600 dark:text-[var(--dark-text-2)]">{viewItem.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t dark:border-[var(--dark-border)]">
              <Button size="sm" variant="secondary" onClick={() => setViewItem(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ══════════════════════════════ FORM MODAL ══════════════════════════════ */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit GRN' : 'New Goods Receipt Note'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="triumph-label">GRN Number *</label>
              <input className="triumph-input" value={form.grn_number} readOnly
                onChange={(e) => f('grn_number', e.target.value)}
              />
            </div>
            <div>
              <label className="triumph-label">Purchase Order</label>
              <select className="triumph-input" value={form.po_id} onChange={(e) => f('po_id', e.target.value)}>
                <option value="">— Select PO —</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>{po.po_number} — {po.supplier_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="triumph-label">Supplier *</label>
              <select className="triumph-input" value={form.supplier_id} onChange={(e) => f('supplier_id', e.target.value)}>
                <option value="">— Select Supplier —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="triumph-label">Received By</label>
              <select className="triumph-input" value={form.received_by} onChange={(e) => f('received_by', e.target.value)}>
                <option value="">— Select Employee —</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="triumph-label">Received Date</label>
              <input type="date" className="triumph-input" value={form.received_date} onChange={(e) => f('received_date', e.target.value)} />
            </div>
            <div>
              <label className="triumph-label">Status</label>
              <select className="triumph-input" value={form.status} onChange={(e) => f('status', e.target.value)}>
                <option value="draft">Draft</option>
                <option value="verified">Verified</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="triumph-label">Notes</label>
              <textarea className="triumph-input resize-none" rows={2} value={form.notes} onChange={(e) => f('notes', e.target.value)} placeholder="Optional notes…" />
            </div>
          </div>

          {/* Dynamic Items */}
          <div className="pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
            <div className="flex items-center justify-between mb-2">
              <label className="triumph-label !mb-0">GRN Items</label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1"
              >
                <Plus size={12} /> Add Item
              </button>
            </div>

            {form.items.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-[var(--dark-text-3)]">No items added. Click &quot;Add Item&quot; to start.</p>
            )}

            <div className="space-y-3">
              {form.items.map((item, idx) => (
                <div key={idx} className="triumph-card !p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] font-medium text-slate-400">Item {idx + 1}</span>
                    {form.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="col-span-2">
                      <label className="text-[0.6rem] text-slate-400 mb-0.5 block">Item</label>
                      <select className="triumph-input !text-xs" value={item.item_id} onChange={(e) => updateItem(idx, 'item_id', e.target.value)}>
                        <option value="">— Select Item —</option>
                        {items.map((it) => <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[0.6rem] text-slate-400 mb-0.5 block">Ordered Qty</label>
                      <input type="number" min="0" className="triumph-input !text-xs" value={item.ordered_qty} onChange={(e) => updateItem(idx, 'ordered_qty', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[0.6rem] text-slate-400 mb-0.5 block">Received Qty</label>
                      <input type="number" min="0" className="triumph-input !text-xs" value={item.received_qty} onChange={(e) => updateItem(idx, 'received_qty', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[0.6rem] text-slate-400 mb-0.5 block">Accepted Qty</label>
                      <input type="number" min="0" className="triumph-input !text-xs" value={item.accepted_qty} onChange={(e) => updateItem(idx, 'accepted_qty', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[0.6rem] text-slate-400 mb-0.5 block">Rejected Qty</label>
                      <input type="number" min="0" className="triumph-input !text-xs" value={item.rejected_qty} onChange={(e) => updateItem(idx, 'rejected_qty', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[0.6rem] text-slate-400 mb-0.5 block">Rejection Reason</label>
                      <input className="triumph-input !text-xs" value={item.rejection_reason} onChange={(e) => updateItem(idx, 'rejection_reason', e.target.value)} placeholder="If any…" />
                    </div>
                    <div>
                      <label className="text-[0.6rem] text-slate-400 mb-0.5 block">Bin Location</label>
                      <select className="triumph-input !text-xs" value={item.bin_location_id} onChange={(e) => updateItem(idx, 'bin_location_id', e.target.value)}>
                        <option value="">— Select —</option>
                        {bins.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
            {editItem ? 'Save Changes' : 'Create GRN'}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        variant="danger"
        title="Delete GRN?"
        message={`This will permanently delete "${deleteTarget?.grn_number ?? ''}". This action cannot be undone.`}
        confirmLabel="Delete GRN"
        loading={deleting}
      />
    </div>
  );
}

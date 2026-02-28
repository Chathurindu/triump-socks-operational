'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  FileText, DollarSign, Package, Factory, Receipt, Users, ShoppingCart,
  Play, Save, Download, Pencil, Trash2, Globe, Lock,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import { Card } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';

/* ────────────────────────────────────────────────── constants */
const REPORT_TYPES = [
  { key: 'sales_summary',    icon: DollarSign,   title: 'Sales Summary',     description: 'Revenue and sales analysis' },
  { key: 'inventory_status', icon: Package,       title: 'Inventory Status',  description: 'Current stock levels' },
  { key: 'production_output',icon: Factory,       title: 'Production Output', description: 'Production order analysis' },
  { key: 'expense_report',   icon: Receipt,       title: 'Expense Report',    description: 'Expense breakdown' },
  { key: 'customer_report',  icon: Users,         title: 'Customer Report',   description: 'Customer details and credit' },
  { key: 'employee_report',  icon: Users,         title: 'Employee Report',   description: 'Employee directory' },
  { key: 'purchase_summary', icon: ShoppingCart,   title: 'Purchase Summary',  description: 'Purchase order analysis' },
] as const;

const PAGE_SIZE = 20;

/* ────────────────────────────────────────────────── CSV export */
function exportCSV(columns: { key: string; label: string }[], rows: Record<string, any>[], filename: string) {
  const header = columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');
  const body = rows.map(r =>
    columns.map(c => {
      const val = r[c.key] ?? '';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  ).join('\n');
  const csv = header + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ────────────────────────────────────────────────── component */
export default function ReportsPage() {
  const toast = useToast();

  /* ── tabs */
  const [tab, setTab] = useState<'run' | 'saved'>('run');

  /* ── run report state */
  const [selectedType, setSelectedType] = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [results, setResults]           = useState<{ columns: any[]; rows: any[] } | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  /* ── saved reports state */
  const [saved, setSaved]       = useState<any[]>([]);
  const [savedTotal, setSavedTotal] = useState(0);
  const [savedPage, setSavedPage]   = useState(1);
  const [savedSearch, setSavedSearch] = useState('');
  const [savedLoading, setSavedLoading] = useState(false);

  /* ── save modal */
  const [saveModal, setSaveModal] = useState(false);
  const [saveForm, setSaveForm]   = useState({ name: '', description: '', is_public: false });
  const [editId, setEditId]       = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);

  /* ── delete confirm */
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  /* ────────────────────────────────────────────── fetch saved */
  const fetchSaved = useCallback(async () => {
    setSavedLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(savedPage), limit: String(PAGE_SIZE), search: savedSearch,
      });
      const res = await fetch(`/api/reports?${qs}`);
      const json = await res.json();
      setSaved(json.data ?? []);
      setSavedTotal(json.total ?? 0);
    } catch { /* empty */ }
    setSavedLoading(false);
  }, [savedPage, savedSearch]);

  useEffect(() => { if (tab === 'saved') fetchSaved(); }, [tab, fetchSaved]);

  /* ────────────────────────────────────────────── generate report */
  const handleGenerate = async () => {
    if (!selectedType) { toast.warning('Select a report', 'Please choose a report type first.'); return; }
    if (!dateFrom || !dateTo) { toast.warning('Date range', 'Please select both from and to dates.'); return; }
    setReportLoading(true);
    setResults(null);
    try {
      const qs = new URLSearchParams({ type: selectedType, from: dateFrom, to: dateTo });
      const res = await fetch(`/api/reports?generate=1&${qs}`);
      if (!res.ok) throw new Error('Failed to generate');
      const json = await res.json();
      setResults({ columns: json.columns ?? [], rows: json.rows ?? [] });
      toast.success('Report generated', `${json.rows?.length ?? 0} rows returned.`);
    } catch {
      toast.error('Error', 'Failed to generate report.');
    }
    setReportLoading(false);
  };

  /* ────────────────────────────────────────────── save / update */
  const openSaveModal = (row?: any) => {
    if (row) {
      setEditId(row.id);
      setSaveForm({ name: row.name ?? '', description: row.description ?? '', is_public: !!row.is_public });
    } else {
      setEditId(null);
      setSaveForm({ name: '', description: '', is_public: false });
    }
    setSaveModal(true);
  };

  const handleSave = async () => {
    if (!saveForm.name.trim()) { toast.warning('Validation', 'Report name is required.'); return; }
    setSaving(true);
    try {
      const method = editId ? 'PATCH' : 'POST';
      const body: any = {
        ...saveForm,
        report_type: selectedType,
        parameters: { from: dateFrom, to: dateTo },
      };
      if (editId) body.id = editId;
      const res = await fetch('/api/reports', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Save failed');
      toast.success(editId ? 'Updated' : 'Saved', `Report "${saveForm.name}" saved.`);
      setSaveModal(false);
      fetchSaved();
    } catch {
      toast.error('Error', 'Failed to save report.');
    }
    setSaving(false);
  };

  /* ────────────────────────────────────────────── delete */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Deleted', 'Report removed.');
      setDeleteTarget(null);
      fetchSaved();
    } catch {
      toast.error('Error', 'Failed to delete report.');
    }
    setDeleting(false);
  };

  /* ────────────────────────────────────────────── run saved report */
  const runSavedReport = (row: any) => {
    setSelectedType(row.report_type ?? '');
    const params = typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters ?? {};
    setDateFrom(params.from ?? '');
    setDateTo(params.to ?? '');
    setTab('run');
    setTimeout(() => handleGenerate(), 100);
  };

  /* ────────────────────────────────────────────── saved columns */
  const savedColumns: Column[] = [
    { key: 'name', label: 'Name', sortable: true },
    {
      key: 'report_type', label: 'Type', sortable: true,
      render: (row: any) => {
        const rt = REPORT_TYPES.find(t => t.key === row.report_type);
        return <Badge label={rt?.title ?? row.report_type} color="blue" />;
      },
    },
    { key: 'description', label: 'Description' },
    { key: 'created_by_name', label: 'Created By', sortable: true },
    {
      key: 'is_public', label: 'Public', align: 'center',
      render: (row: any) => row.is_public
        ? <Badge label="Yes" color="green" />
        : <Badge label="No" color="gray" />,
    },
    {
      key: 'created_at', label: 'Created', sortable: true,
      render: (row: any) => formatDate(row.created_at),
    },
    {
      key: 'actions', label: 'Actions', align: 'center',
      render: (row: any) => (
        <div className="flex items-center justify-center gap-1">
          <Button size="xs" variant="ghost" icon={<Play className="w-3.5 h-3.5" />} onClick={() => runSavedReport(row)} />
          <Button size="xs" variant="ghost" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openSaveModal(row)} />
          <Button size="xs" variant="ghost" icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />} onClick={() => setDeleteTarget(row)} />
        </div>
      ),
    },
  ];

  /* ────────────────────────────────────────────── result columns (dynamic) */
  const resultColumns: Column[] = results
    ? results.columns.map((c: any) => ({
        key: c.key,
        label: c.label,
        sortable: true,
        render: c.render ? undefined : undefined,
      }))
    : [];

  /* ────────────────────────────────────────────── selected type info */
  const selectedInfo = REPORT_TYPES.find(t => t.key === selectedType);

  /* ────────────────────────────────────────────── render */
  return (
    <div className="space-y-6 anim-fade-up">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-600" /> Report Builder
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generate, save and export reports</p>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('run')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'run'
              ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Run Report
        </button>
        <button
          onClick={() => setTab('saved')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'saved'
              ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Saved Reports
        </button>
      </div>

      {/* ═══════════════════ RUN REPORT TAB ═══════════════════ */}
      {tab === 'run' && (
        <div className="space-y-6 anim-fade-up">
          {/* report type grid */}
          <Card title="Select Report Type">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {REPORT_TYPES.map(rt => {
                const Icon = rt.icon;
                const active = selectedType === rt.key;
                return (
                  <button
                    key={rt.key}
                    onClick={() => setSelectedType(rt.key)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center ${
                      active
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-400'
                        : 'border-gray-200 dark:border-slate-600 hover:border-amber-300 dark:hover:border-amber-500/50 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-7 h-7 ${active ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`} />
                    <span className={`text-sm font-semibold ${active ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      {rt.title}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{rt.description}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* parameters */}
          {selectedType && (
            <Card title={`Parameters — ${selectedInfo?.title ?? selectedType}`} className="anim-fade-up">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="triumph-label">From Date</label>
                  <input
                    type="date"
                    className="triumph-input"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="triumph-label">To Date</label>
                  <input
                    type="date"
                    className="triumph-input"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                  />
                </div>
                <Button
                  variant="primary"
                  icon={<Play className="w-4 h-4" />}
                  loading={reportLoading}
                  onClick={handleGenerate}
                >
                  Generate
                </Button>
              </div>
            </Card>
          )}

          {/* results */}
          {results && (
            <Card
              title="Results"
              className="anim-fade-up"
              action={
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Save className="w-4 h-4" />}
                    onClick={() => openSaveModal()}
                  >
                    Save Report
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Download className="w-4 h-4" />}
                    onClick={() => exportCSV(results.columns, results.rows, `${selectedType}_${dateFrom}_${dateTo}`)}
                  >
                    Export CSV
                  </Button>
                </div>
              }
              noPad
            >
              <DataTable
                columns={resultColumns}
                data={results.rows}
                total={results.rows.length}
                page={1}
                pageSize={results.rows.length || 50}
                onPageChange={() => {}}
                emptyIcon="📊"
                emptyText="No data returned"
              />
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════════ SAVED REPORTS TAB ═══════════════════ */}
      {tab === 'saved' && (
        <Card title="Saved Reports" noPad className="anim-fade-up">
          <DataTable
            columns={savedColumns}
            data={saved}
            total={savedTotal}
            page={savedPage}
            pageSize={PAGE_SIZE}
            loading={savedLoading}
            search={savedSearch}
            onSearchChange={v => { setSavedSearch(v); setSavedPage(1); }}
            onPageChange={setSavedPage}
            searchPlaceholder="Search saved reports…"
            emptyIcon="📋"
            emptyText="No saved reports yet"
          />
        </Card>
      )}

      {/* ═══════════════════ SAVE MODAL ═══════════════════ */}
      <Modal open={saveModal} onClose={() => setSaveModal(false)} title={editId ? 'Edit Saved Report' : 'Save Report'}>
        <div className="space-y-4">
          <div>
            <label className="triumph-label">Name *</label>
            <input
              className="triumph-input w-full"
              value={saveForm.name}
              onChange={e => setSaveForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Monthly Sales Summary"
            />
          </div>
          <div>
            <label className="triumph-label">Description</label>
            <textarea
              className="triumph-input w-full"
              rows={3}
              value={saveForm.description}
              onChange={e => setSaveForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description…"
            />
          </div>
          <div>
            <label className="triumph-label">Report Type</label>
            <input className="triumph-input w-full bg-gray-50 dark:bg-slate-700" readOnly value={selectedInfo?.title ?? selectedType} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveForm.is_public}
              onChange={e => setSaveForm(f => ({ ...f, is_public: e.target.checked }))}
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
              {saveForm.is_public ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              Public (visible to all users)
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setSaveModal(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editId ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══════════════════ DELETE CONFIRM ═══════════════════ */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Report"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Download, Upload, History, FileSpreadsheet, Users, Truck,
  Package, DollarSign, FileDown, FileJson, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import DataTable, { Column } from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/Toast';

/* ── helpers ── */
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split('\n').map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
  const headers = lines[0];
  const rows = lines.slice(1).map(cols => Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? ''])));
  return { headers, rows };
}

function downloadCSV(columns: { key: string; label: string }[], rows: any[], filename: string) {
  const header = columns.map(c => c.label).join(',');
  const body = rows.map(r => columns.map(c => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ── constants ── */
const EXPORT_TYPES = [
  { value: 'inventory', label: 'Inventory', icon: Package, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { value: 'customers', label: 'Customers', icon: Users, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  { value: 'suppliers', label: 'Suppliers', icon: Truck, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { value: 'products', label: 'Products', icon: FileSpreadsheet, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { value: 'expenses', label: 'Expenses', icon: DollarSign, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
];

const IMPORT_TYPES = EXPORT_TYPES.filter(t => ['inventory', 'customers', 'suppliers'].includes(t.value));

type Tab = 'export' | 'import' | 'history';
const PAGE_SIZE = 15;

export default function ImportExportPage() {
  const [tab, setTab] = useState<Tab>('export');
  const toast = useToast();

  /* ── Export state ── */
  const [exportType, setExportType] = useState('');
  const [exporting, setExporting] = useState(false);

  /* ── Import state ── */
  const [importType, setImportType] = useState('inventory');
  const [fileName, setFileName] = useState('');
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── History state ── */
  const [logs, setLogs] = useState<any[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logLoading, setLogLoading] = useState(false);

  /* ── fetch history ── */
  const fetchLogs = useCallback(async () => {
    setLogLoading(true);
    try {
      const qs = new URLSearchParams({ action: 'logs', page: String(logPage), limit: String(PAGE_SIZE) });
      const res = await fetch(`/api/import-export?${qs}`);
      const json = await res.json();
      setLogs(json.logs ?? []);
      setLogTotal(json.pagination?.total ?? 0);
    } catch { /* ignore */ }
    setLogLoading(false);
  }, [logPage]);

  useEffect(() => { if (tab === 'history') fetchLogs(); }, [tab, fetchLogs]);

  /* ── Export handler ── */
  const handleExport = async (format: 'csv' | 'json') => {
    if (!exportType) { toast.warning('Select Type', 'Please select a data type to export.'); return; }
    setExporting(true);
    try {
      const res = await fetch(`/api/import-export?action=export&type=${exportType}`);
      if (!res.ok) throw new Error('Export failed');
      const json = await res.json();
      const date = new Date().toISOString().slice(0, 10);
      if (format === 'csv') {
        downloadCSV(json.columns, json.rows, `${exportType}_export_${date}.csv`);
      } else {
        downloadJSON(json.rows, `${exportType}_export_${date}.json`);
      }
      toast.success('Export Complete', `${json.rows.length} ${exportType} records exported as ${format.toUpperCase()}.`);
    } catch (err: any) {
      toast.error('Export Failed', err.message);
    }
    setExporting(false);
  };

  /* ── File parse ── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);
      setParsedHeaders(headers);
      setParsedRows(rows);
    };
    reader.readAsText(file);
  };

  /* ── Import handler ── */
  const handleImport = async () => {
    if (parsedRows.length === 0) { toast.warning('No Data', 'Upload a CSV file first.'); return; }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch('/api/import-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: importType, rows: parsedRows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');
      setImportResult(json);
      toast.success('Import Complete', `${json.success_count} of ${json.total_rows} rows imported.`);
    } catch (err: any) {
      toast.error('Import Failed', err.message);
    }
    setImporting(false);
  };

  const resetImport = () => {
    setFileName('');
    setParsedHeaders([]);
    setParsedRows([]);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  /* ── History columns ── */
  const logColumns: Column[] = [
    {
      key: 'created_at', label: 'Date', width: '140px',
      render: (r) => <span className="text-xs tabular-nums text-slate-600 dark:text-[var(--dark-text-2)]">{new Date(r.created_at).toLocaleString()}</span>,
    },
    {
      key: 'import_type', label: 'Type', width: '100px',
      render: (r) => <Badge label={r.import_type} color="blue" />,
    },
    {
      key: 'file_name', label: 'File Name', width: '200px',
      render: (r) => <span className="text-xs text-slate-700 dark:text-[var(--dark-text)]">{r.file_name}</span>,
    },
    {
      key: 'total_rows', label: 'Total Rows', align: 'right', width: '90px',
      render: (r) => <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-[var(--dark-text)]">{r.total_rows}</span>,
    },
    {
      key: 'success_count', label: 'Success', align: 'right', width: '80px',
      render: (r) => <span className="text-xs font-semibold tabular-nums text-green-600 dark:text-green-400">{r.success_count}</span>,
    },
    {
      key: 'error_count', label: 'Errors', align: 'right', width: '80px',
      render: (r) => <span className="text-xs font-semibold tabular-nums text-red-600 dark:text-red-400">{r.error_count}</span>,
    },
    {
      key: 'status', label: 'Status', width: '100px',
      render: (r) => (
        <Badge
          label={r.status}
          color={r.status === 'completed' ? 'green' : r.status === 'partial' ? 'amber' : 'red'}
        />
      ),
    },
    {
      key: 'imported_by', label: 'Imported By', width: '130px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.imported_by}</span>,
    },
  ];

  /* ── tab buttons ── */
  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'export', label: 'Export', icon: Download },
    { key: 'import', label: 'Import', icon: Upload },
    { key: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-[var(--dark-text)]">Data Import / Export</h1>
          <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)] mt-1">Import and export data in CSV or JSON format</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-[var(--dark-surface)] w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium transition-all ${
              tab === t.key
                ? 'bg-white dark:bg-[var(--dark-card)] text-slate-800 dark:text-[var(--dark-text)] shadow-sm'
                : 'text-slate-500 dark:text-[var(--dark-text-3)] hover:text-slate-700 dark:hover:text-[var(--dark-text-2)]'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ──────────── Export Tab ──────────── */}
      {tab === 'export' && (
        <div className="space-y-5 anim-fade-up">
          <Card title="Select Data Type">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {EXPORT_TYPES.map(t => {
                const Icon = t.icon;
                const selected = exportType === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setExportType(t.value)}
                    className={`triumph-card flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-all border-2 ${
                      selected
                        ? 'border-amber-500 dark:border-amber-400 ring-2 ring-amber-500/20'
                        : 'border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${t.bg} flex items-center justify-center`}>
                      <Icon size={20} className={t.color} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-[var(--dark-text)]">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="flex gap-3">
            <Button
              icon={<FileDown size={15} />}
              onClick={() => handleExport('csv')}
              loading={exporting}
              disabled={!exportType}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              icon={<FileJson size={15} />}
              onClick={() => handleExport('json')}
              loading={exporting}
              disabled={!exportType}
            >
              Export JSON
            </Button>
          </div>
        </div>
      )}

      {/* ──────────── Import Tab ──────────── */}
      {tab === 'import' && (
        <div className="space-y-5 anim-fade-up">
          {/* Type selector */}
          <Card title="Import Settings">
            <div className="space-y-4">
              <div>
                <label className="triumph-label">Data Type</label>
                <select
                  value={importType}
                  onChange={e => { setImportType(e.target.value); resetImport(); }}
                  className="triumph-input w-full sm:w-64"
                >
                  {IMPORT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* File upload */}
              <div>
                <label className="triumph-label">CSV File</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="triumph-input w-full file:mr-3 file:py-1 file:px-3 file:border-0 file:text-xs file:font-medium file:bg-amber-50 file:text-amber-700 dark:file:bg-amber-900/30 dark:file:text-amber-400 file:rounded-md file:cursor-pointer"
                />
              </div>
            </div>
          </Card>

          {/* Preview */}
          {parsedHeaders.length > 0 && (
            <Card title={`Preview — ${fileName} (${parsedRows.length} rows)`}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      {parsedHeaders.map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-[var(--dark-text-2)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                        {parsedHeaders.map(h => (
                          <td key={h} className="px-3 py-1.5 text-slate-700 dark:text-[var(--dark-text)]">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 5 && (
                  <p className="text-xs text-slate-400 mt-2 px-3">… and {parsedRows.length - 5} more rows</p>
                )}
              </div>
            </Card>
          )}

          {/* Import button */}
          {parsedRows.length > 0 && !importResult && (
            <Button
              icon={<Upload size={15} />}
              onClick={handleImport}
              loading={importing}
            >
              Import {parsedRows.length} Rows
            </Button>
          )}

          {/* Results */}
          {importResult && (
            <Card title="Import Results">
              <div className="space-y-4">
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-green-500" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">Success</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">{importResult.success_count}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={18} className="text-red-500" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">Errors</p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">{importResult.error_count}</p>
                    </div>
                  </div>
                </div>

                {importResult.errors?.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3 space-y-1 max-h-48 overflow-y-auto">
                    {importResult.errors.map((e: any, i: number) => (
                      <p key={i} className="text-xs text-red-700 dark:text-red-400">
                        Row {e.row}: {e.message}
                      </p>
                    ))}
                  </div>
                )}

                <Button variant="secondary" size="sm" onClick={resetImport}>
                  Import Another File
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ──────────── History Tab ──────────── */}
      {tab === 'history' && (
        <div className="anim-fade-up">
          <Card noPad>
            <DataTable
              columns={logColumns}
              data={logs}
              total={logTotal}
              page={logPage}
              pageSize={PAGE_SIZE}
              loading={logLoading}
              onPageChange={setLogPage}
              emptyIcon="📋"
              emptyText="No import history yet."
            />
          </Card>
        </div>
      )}
    </div>
  );
}

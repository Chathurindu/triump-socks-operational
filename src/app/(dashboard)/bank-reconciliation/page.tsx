'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Landmark, CheckCircle2, AlertCircle, Scale,
  Trash2, Unlink, Upload, ArrowRightLeft, FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import { Card } from '@/components/ui/Card';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatCurrency } from '@/lib/utils';

const PAGE_SIZE = 20;

const IMPORT_PLACEHOLDER = `[
  {
    "statement_date": "2026-03-01",
    "description": "Payment received",
    "reference": "REF-001",
    "debit": 0,
    "credit": 15000,
    "balance": 115000
  }
]`;

export default function BankReconciliationPage() {
  /* ── shared state ── */
  const [accountId, setAccountId] = useState('');
  const [tab, setTab] = useState<'statements' | 'match' | 'import'>('statements');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [globalSummary, setGlobalSummary] = useState<any>(null);

  /* ── statements tab ── */
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [matchFilter, setMatchFilter] = useState<'all' | 'true' | 'false'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);

  /* ── match tab ── */
  const [unmatchedStatements, setUnmatchedStatements] = useState<any[]>([]);
  const [suggestedTxns, setSuggestedTxns] = useState<any[]>([]);
  const [selectedStatement, setSelectedStatement] = useState<any>(null);
  const [matching, setMatching] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);

  /* ── import tab ── */
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  /* ── delete / unmatch ── */
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [unmatchTarget, setUnmatchTarget] = useState<any>(null);
  const [unmatching, setUnmatching] = useState(false);

  const toast = useToast();

  /* ──────── load accounts (meta) ──────── */
  useEffect(() => {
    fetch('/api/bank-reconciliation?meta=1')
      .then(r => r.json())
      .then(j => {
        setAccounts(j.accounts ?? []);
        setGlobalSummary(j.summary ?? null);
      });
  }, []);

  /* ──────── load statements ──────── */
  const fetchStatements = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const qs = new URLSearchParams({
      account_id: accountId,
      page: String(page),
      limit: String(PAGE_SIZE),
      matched: matchFilter === 'all' ? 'all' : matchFilter,
      from: fromDate,
      to: toDate,
    });
    try {
      const res = await fetch(`/api/bank-reconciliation?${qs}`);
      const json = await res.json();
      setData(json.statements ?? []);
      setTotal(json.total ?? 0);
      setSummary(json.summary ?? null);
    } catch { /* silent */ }
    setLoading(false);
  }, [accountId, page, matchFilter, fromDate, toDate]);

  useEffect(() => {
    if (tab === 'statements') fetchStatements();
  }, [fetchStatements, tab]);

  /* ──────── load unmatched (match tab) ──────── */
  const fetchUnmatched = useCallback(async () => {
    if (!accountId) return;
    setMatchLoading(true);
    try {
      const res = await fetch(`/api/bank-reconciliation?action=unmatched&account_id=${accountId}`);
      const json = await res.json();
      setUnmatchedStatements(json.unmatched_statements ?? []);
      setSuggestedTxns(json.suggested_transactions ?? []);
    } catch { /* silent */ }
    setMatchLoading(false);
  }, [accountId]);

  useEffect(() => {
    if (tab === 'match') { fetchUnmatched(); setSelectedStatement(null); }
  }, [tab, fetchUnmatched]);

  /* ──────── actions ──────── */
  const handleMatch = async (statementId: string, transactionId: string) => {
    setMatching(true);
    try {
      const res = await fetch('/api/bank-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'match', statement_id: statementId, transaction_id: transactionId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Match failed');
      toast.success('Matched', 'Statement matched to transaction successfully.');
      setSelectedStatement(null);
      fetchUnmatched();
      fetchStatements();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setMatching(false); }
  };

  const handleUnmatch = async () => {
    if (!unmatchTarget) return;
    setUnmatching(true);
    try {
      const res = await fetch('/api/bank-reconciliation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement_id: unmatchTarget.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Unmatch failed');
      toast.success('Unmatched', 'Statement unmatched successfully.');
      setUnmatchTarget(null);
      fetchStatements();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setUnmatching(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/bank-reconciliation?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      toast.success('Deleted', 'Statement deleted.');
      setDeleteTarget(null);
      fetchStatements();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setDeleting(false); }
  };

  const handleImport = async () => {
    let parsed: any[];
    try {
      parsed = JSON.parse(importJson);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error();
    } catch {
      toast.warning('Invalid JSON', 'Please provide a valid non-empty JSON array.');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch('/api/bank-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', account_id: Number(accountId), statements: parsed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');
      setImportResult({ success: json.count ?? 0, batch: json.import_batch ?? '' });
      toast.success('Imported', `${json.count} statement(s) imported successfully.`);
      setImportJson('');
      fetchStatements();
    } catch (err: any) {
      setImportResult({ error: err.message });
      toast.error('Import Failed', err.message);
    }
    finally { setImporting(false); }
  };

  /* ──────── KPI data ──────── */
  const s = accountId ? summary : globalSummary;
  const kpis = s ? [
    { label: 'Total Statements', value: s.total_statements ?? 0,                                icon: FileText,     color: 'text-blue-500',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Matched',          value: s.matched_count ?? 0,                                    icon: CheckCircle2, color: 'text-green-500',  bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Unmatched',        value: s.unmatched_count ?? 0,                                  icon: AlertCircle,  color: 'text-amber-500',  bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Balance',          value: formatCurrency(parseFloat(s.total_credits ?? 0) - parseFloat(s.total_debits ?? 0)), icon: Scale, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  ] : [];

  /* ──────── columns ──────── */
  const columns: Column[] = [
    { key: 'statement_date', label: 'Date', width: '100px', sortable: true,
      render: r => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{formatDate(r.statement_date)}</span> },
    { key: 'description', label: 'Description', sortable: true,
      render: r => <span className="text-xs text-slate-600 dark:text-[var(--dark-text)] truncate block max-w-[220px]">{r.description ?? '—'}</span> },
    { key: 'reference', label: 'Reference', width: '120px',
      render: r => <span className="text-xs text-slate-400">{r.reference || '—'}</span> },
    { key: 'debit', label: 'Debit', width: '110px', align: 'right',
      render: r => r.debit && parseFloat(r.debit) > 0
        ? <span className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">{formatCurrency(parseFloat(r.debit))}</span>
        : <span className="text-xs text-slate-300">—</span> },
    { key: 'credit', label: 'Credit', width: '110px', align: 'right',
      render: r => r.credit && parseFloat(r.credit) > 0
        ? <span className="text-sm font-semibold tabular-nums text-green-600 dark:text-green-400">{formatCurrency(parseFloat(r.credit))}</span>
        : <span className="text-xs text-slate-300">—</span> },
    { key: 'balance', label: 'Balance', width: '110px', align: 'right',
      render: r => <span className="text-xs font-medium tabular-nums text-slate-700 dark:text-slate-300">{formatCurrency(parseFloat(r.balance ?? 0))}</span> },
    { key: 'matched', label: 'Matched', width: '90px', align: 'center',
      render: r => r.matched
        ? <Badge label="Yes" color="green" />
        : <Badge label="No" color="amber" /> },
    { key: 'transaction_id', label: 'Transaction', width: '100px',
      render: r => r.matched && r.transaction_id
        ? <span className="text-[0.65rem] text-blue-500 underline cursor-pointer" title={r.transaction_id}>{r.transaction_id.slice(0, 8)}…</span>
        : <span className="text-xs text-slate-300">—</span> },
    { key: 'actions', label: '', width: '70px', sortable: false, align: 'right',
      render: r => (
        <div className="flex items-center justify-end gap-1">
          {r.matched && (
            <button onClick={e => { e.stopPropagation(); setUnmatchTarget(r); }}
              className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Unmatch">
              <Unlink size={11} />
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); setDeleteTarget(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
            <Trash2 size={11} />
          </button>
        </div>
      ) },
  ];

  /* ──────── tabs ──────── */
  const tabs: { key: typeof tab; label: string; icon: React.ReactNode }[] = [
    { key: 'statements', label: 'Statements',  icon: <FileText size={13} /> },
    { key: 'match',      label: 'Match',        icon: <ArrowRightLeft size={13} /> },
    { key: 'import',     label: 'Import',       icon: <Upload size={13} /> },
  ];

  return (
    <div className="space-y-4">
      {/* ── Account Selector ── */}
      <div className="triumph-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 anim-fade-up">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
            <Landmark size={16} className="text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">Bank Reconciliation</p>
            <p className="text-[0.65rem] text-slate-400">Select a bank account to reconcile</p>
          </div>
        </div>
        <select
          className="triumph-input !w-auto min-w-[220px]"
          value={accountId}
          onChange={e => { setAccountId(e.target.value); setPage(1); setMatchFilter('all'); }}
        >
          <option value="">— Select Account —</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* ── KPI Cards ── */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map((k, i) => { const Icon = k.icon; return (
            <div key={k.label} className={`triumph-card p-4 flex items-center gap-3 anim-fade-up anim-d${Math.min(i + 1, 6)}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.bg}`}>
                <Icon size={18} className={k.color} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{k.value}</p>
                <p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">{k.label}</p>
              </div>
            </div>
          ); })}
        </div>
      )}

      {/* ── show tabs only when account selected ── */}
      {accountId && (
        <>
          {/* tab bar */}
          <div className="flex gap-1 triumph-card p-1 w-fit anim-fade-up anim-d3">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-amber-500 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'
                }`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ═══════ Statements Tab ═══════ */}
          {tab === 'statements' && (
            <DataTable
              columns={columns}
              data={data}
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
              loading={loading}
              onPageChange={setPage}
              searchPlaceholder="Search statements…"
              emptyIcon="🏦"
              emptyText="No bank statements found."
              toolbar={
                <>
                  <div className="flex gap-1 flex-wrap">
                    {(['all', 'true', 'false'] as const).map(v => (
                      <button key={v} onClick={() => { setMatchFilter(v); setPage(1); }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                          matchFilter === v
                            ? 'bg-amber-500 text-white'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'
                        }`}>
                        {v === 'all' ? 'All' : v === 'true' ? 'Matched' : 'Unmatched'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }}
                      className="triumph-input !py-1 !text-xs !w-32" />
                    <span className="text-[0.6rem] text-slate-400">to</span>
                    <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }}
                      className="triumph-input !py-1 !text-xs !w-32" />
                  </div>
                </>
              }
            />
          )}

          {/* ═══════ Match Tab ═══════ */}
          {tab === 'match' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 anim-fade-up">
              {/* left: unmatched statements */}
              <Card title="Unmatched Statements">
                {matchLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full" />
                  </div>
                ) : unmatchedStatements.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">All statements are matched! 🎉</p>
                ) : (
                  <div className="space-y-1 max-h-[420px] overflow-y-auto">
                    {unmatchedStatements.map(s => {
                      const isSelected = selectedStatement?.id === s.id;
                      const amt = parseFloat(s.debit) > 0 ? parseFloat(s.debit) : parseFloat(s.credit);
                      const isDebit = parseFloat(s.debit) > 0;
                      return (
                        <button key={s.id} onClick={() => setSelectedStatement(s)}
                          className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                            isSelected
                              ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-600'
                              : 'border-transparent hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)]'
                          }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-slate-700 dark:text-[var(--dark-text)] truncate max-w-[200px]">
                                {s.description}
                              </p>
                              <p className="text-[0.6rem] text-slate-400 mt-0.5">
                                {formatDate(s.statement_date)} {s.reference ? `· ${s.reference}` : ''}
                              </p>
                            </div>
                            <span className={`text-sm font-semibold tabular-nums ${isDebit ? 'text-red-500' : 'text-green-500'}`}>
                              {isDebit ? '-' : '+'}{formatCurrency(amt)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* right: suggested transactions */}
              <Card title={selectedStatement ? 'Suggested Transactions' : 'Select a Statement'}>
                {!selectedStatement ? (
                  <p className="text-xs text-slate-400 text-center py-8">Click a statement on the left to see suggested matches.</p>
                ) : suggestedTxns.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No unmatched transactions found for this account.</p>
                ) : (
                  <div className="space-y-1 max-h-[420px] overflow-y-auto">
                    {suggestedTxns.map(t => (
                      <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors">
                        <div>
                          <p className="text-xs font-medium text-slate-700 dark:text-[var(--dark-text)] truncate max-w-[180px]">
                            {t.description}
                          </p>
                          <p className="text-[0.6rem] text-slate-400 mt-0.5">
                            {formatDate(t.date)} · {t.type}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                            {formatCurrency(parseFloat(t.amount))}
                          </span>
                          <Button size="sm" onClick={() => handleMatch(selectedStatement.id, t.id)} loading={matching}>
                            Match
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ═══════ Import Tab ═══════ */}
          {tab === 'import' && (
            <Card title="Import Bank Statements" className="anim-fade-up">
              <div className="space-y-4">
                <div>
                  <label className="triumph-label">Statement Data (JSON Array)</label>
                  <textarea
                    className="triumph-input font-mono text-xs resize-none"
                    rows={10}
                    value={importJson}
                    onChange={e => setImportJson(e.target.value)}
                    placeholder={IMPORT_PLACEHOLDER}
                  />
                  <p className="text-[0.6rem] text-slate-400 mt-1">
                    Paste a JSON array of statement objects. Required fields: statement_date, description. Optional: reference, debit, credit, balance.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    {importResult && !importResult.error && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        ✓ {importResult.success} statement(s) imported {importResult.batch && <span className="text-slate-400">(batch: {importResult.batch})</span>}
                      </p>
                    )}
                    {importResult?.error && (
                      <p className="text-xs text-red-500">✗ {importResult.error}</p>
                    )}
                  </div>
                  <Button size="sm" icon={<Upload size={13} />} onClick={handleImport} loading={importing}>
                    Import
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Confirm Dialogs ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        variant="danger"
        title="Delete Statement?"
        message="Delete this bank statement? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />

      <ConfirmDialog
        open={!!unmatchTarget}
        onClose={() => setUnmatchTarget(null)}
        onConfirm={handleUnmatch}
        variant="danger"
        title="Unmatch Statement?"
        message="Remove the match between this statement and its transaction?"
        confirmLabel="Unmatch"
        loading={unmatching}
      />
    </div>
  );
}

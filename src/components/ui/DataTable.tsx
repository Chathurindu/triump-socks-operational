'use client';
import { useState, useMemo, useCallback } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

/* ────────────────────────────────────────────────── types */
export interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;            // e.g. '120px', 'minmax(120px,1fr)'
  render?: (row: T, idx: number) => React.ReactNode;
  getValue?: (row: T) => string | number; // for sorting fallback
  hidden?: boolean;
}

export interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  search?: string;
  onSearchChange?: (v: string) => void;
  onPageChange: (p: number) => void;
  onRowDoubleClick?: (row: T) => void;
  toolbar?: React.ReactNode;          // extra buttons / filters
  searchPlaceholder?: string;
  emptyIcon?: string;
  emptyText?: string;
  idKey?: string;
  /** if set, client-side sorting disabled; parent does sorting via API */
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (key: string, dir: 'asc' | 'desc') => void;
}

/* ────────────────────────────────────────────────── component */
export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  total,
  page,
  pageSize,
  loading,
  search,
  onSearchChange,
  onPageChange,
  onRowDoubleClick,
  toolbar,
  searchPlaceholder = 'Search…',
  emptyIcon = '📋',
  emptyText = 'No records found.',
  sortKey: externalSortKey,
  sortDir: externalSortDir,
  onSortChange,
}: DataTableProps<T>) {
  /* ── local sort state (used when parent doesn't supply sort) ── */
  const [localSortKey, setLocalSortKey] = useState<string>('');
  const [localSortDir, setLocalSortDir] = useState<'asc' | 'desc'>('asc');

  const sKey = externalSortKey ?? localSortKey;
  const sDir = externalSortDir ?? localSortDir;

  const handleSort = useCallback((key: string) => {
    const newDir = sKey === key && sDir === 'asc' ? 'desc' : 'asc';
    if (onSortChange) {
      onSortChange(key, newDir);
    } else {
      setLocalSortKey(key);
      setLocalSortDir(newDir);
    }
  }, [sKey, sDir, onSortChange]);

  /* ── client-side sort when no onSortChange (local mode) ── */
  const sorted = useMemo(() => {
    if (onSortChange || !localSortKey) return data;
    return [...data].sort((a, b) => {
      const col = columns.find((c) => c.key === localSortKey);
      const va = col?.getValue ? col.getValue(a) : a[localSortKey];
      const vb = col?.getValue ? col.getValue(b) : b[localSortKey];
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return localSortDir === 'asc' ? va - vb : vb - va;
      return localSortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [data, localSortKey, localSortDir, columns, onSortChange]);

  /* ── pagination ── */
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const pageNumbers = useMemo(() => {
    const p: (number | '...')[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) p.push(i); return p; }
    p.push(1);
    if (page > 4) p.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) p.push(i);
    if (page < totalPages - 3) p.push('...');
    p.push(totalPages);
    return p;
  }, [page, totalPages]);

  const visibleCols = columns.filter((c) => !c.hidden);

  return (
    <div className="triumph-card">
      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-[var(--dark-border)]">
        {onSearchChange && (
          <div className="relative flex-shrink-0 w-full sm:w-64">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[var(--dark-text-3)]" />
            <input
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="triumph-input pl-8 w-full"
            />
          </div>
        )}
        <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
          {toolbar}
          <span className="text-xs text-slate-400 dark:text-[var(--dark-text-3)] whitespace-nowrap ml-1">
            {total} {total === 1 ? 'record' : 'records'}
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
            <span className="text-xs text-slate-400 dark:text-[var(--dark-text-3)]">Loading…</span>
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <span className="text-4xl">{emptyIcon}</span>
          <p className="text-sm text-slate-400 dark:text-[var(--dark-text-3)]">{emptyText}</p>
        </div>
      ) : (
        <div className="overflow-x-auto table-scroll">
          <table className="w-full triumph-table">
            <thead>
              <tr>
                {visibleCols.map((col) => (
                  <th
                    key={col.key}
                    className={`${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.sortable !== false ? 'cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors' : ''}`}
                    style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                  >
                    <div className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'flex-row-reverse' : ''}`}>
                      {col.label}
                      {col.sortable !== false && (
                        <span className="flex-shrink-0 opacity-40">
                          {sKey === col.key ? (
                            sDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          ) : (
                            <ChevronsUpDown size={12} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => (
                <tr
                  key={row.id ?? idx}
                  onDoubleClick={() => onRowDoubleClick?.(row)}
                  className={onRowDoubleClick ? 'cursor-pointer' : ''}
                >
                  {visibleCols.map((col) => (
                    <td
                      key={col.key}
                      className={col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                    >
                      {col.render ? col.render(row, idx) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)] whitespace-nowrap">
            {`Showing ${start}–${end} of ${total}`}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[0.65rem] font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed dark:hover:bg-[var(--dark-surface)] dark:text-[var(--dark-text-2)] transition-colors"
            >
              «
            </button>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed dark:hover:bg-[var(--dark-surface)] dark:text-[var(--dark-text-2)] transition-colors"
            >
              <ChevronLeft size={14} />
            </button>

            {pageNumbers.map((p, i) =>
              p === '...' ? (
                <span key={`dot-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-slate-400 dark:text-[var(--dark-text-3)]">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p as number)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-200
                    ${p === page
                      ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/25 scale-105'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'
                    }`}
                >
                  {p}
                </button>
              ),
            )}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed dark:hover:bg-[var(--dark-surface)] dark:text-[var(--dark-text-2)] transition-colors"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[0.65rem] font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed dark:hover:bg-[var(--dark-surface)] dark:text-[var(--dark-text-2)] transition-colors"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

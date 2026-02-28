'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  if (totalPages <= 1 && total <= pageSize) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 4) pages.push('...');
    const rangeStart = Math.max(2, page - 1);
    const rangeEnd   = Math.min(totalPages - 1, page + 1);
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (page < totalPages - 3) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-3 px-1">
      <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)] whitespace-nowrap">
        {total === 0 ? 'No results' : `${start}–${end} of ${total}`}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed dark:hover:bg-[var(--dark-surface)] dark:text-[var(--dark-text-2)] transition-colors"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dot-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-slate-400 dark:text-[var(--dark-text-3)]">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors
                ${p === page
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'
                }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed dark:hover:bg-[var(--dark-surface)] dark:text-[var(--dark-text-2)] transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

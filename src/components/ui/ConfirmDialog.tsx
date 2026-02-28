'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';

type Variant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  loading?: boolean;
}

const variantConfig: Record<Variant, { icon: typeof Trash2; iconBg: string; iconColor: string; btnBg: string; btnHover: string }> = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    btnBg: 'bg-red-600 dark:bg-red-500',
    btnHover: 'hover:bg-red-700 dark:hover:bg-red-600',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    btnBg: 'bg-amber-600 dark:bg-amber-500',
    btnHover: 'hover:bg-amber-700 dark:hover:bg-amber-600',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    btnBg: 'bg-blue-600 dark:bg-blue-500',
    btnHover: 'hover:bg-blue-700 dark:hover:bg-blue-600',
  },
};

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!open || !mounted) return null;

  const cfg = variantConfig[variant];
  const Icon = cfg.icon;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px] animate-[confirm-fade-in_0.18s_ease]" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-sm bg-white dark:bg-[var(--dark-card)] rounded-2xl shadow-2xl dark:shadow-black/40 border border-slate-200 dark:border-[var(--dark-border-2)] overflow-hidden animate-[confirm-pop_0.28s_cubic-bezier(0.16,1,0.3,1)]"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[var(--dark-surface)] dark:hover:text-[var(--dark-text)] transition-colors z-10"
        >
          <X size={14} />
        </button>

        <div className="px-6 pt-6 pb-5">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-xl ${cfg.iconBg} flex items-center justify-center mb-4`}>
            <Icon size={22} className={cfg.iconColor} />
          </div>

          {/* Text */}
          <h3 className="text-base font-semibold text-slate-800 dark:text-[var(--dark-text)] mb-1.5">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-[var(--dark-text-2)] leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-[var(--dark-surface)] text-slate-700 dark:text-[var(--dark-text-2)] hover:bg-slate-200 dark:hover:bg-[var(--dark-border)] transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white ${cfg.btnBg} ${cfg.btnHover} transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

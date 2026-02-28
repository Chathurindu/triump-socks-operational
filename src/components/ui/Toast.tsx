'use client';
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

/* ────────────────────────────────────────────────── types */
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  removing?: boolean;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
};

/* ────────────────────────────────────────────────── config */
const typeConfig: Record<ToastType, { icon: typeof Info; iconColor: string; barColor: string; bg: string }> = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-green-500 dark:text-green-400',
    barColor: 'bg-green-500',
    bg: 'bg-white dark:bg-[var(--dark-card)]',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-red-500 dark:text-red-400',
    barColor: 'bg-red-500',
    bg: 'bg-white dark:bg-[var(--dark-card)]',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-500 dark:text-blue-400',
    barColor: 'bg-blue-500',
    bg: 'bg-white dark:bg-[var(--dark-card)]',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500 dark:text-amber-400',
    barColor: 'bg-amber-500',
    bg: 'bg-white dark:bg-[var(--dark-card)]',
  },
};

/* ────────────────────────────────────────────────── item */
function ToastItem({ t, onRemove }: { t: Toast; onRemove: (id: string) => void }) {
  const cfg = typeConfig[t.type];
  const Icon = cfg.icon;
  const dur = t.duration ?? 4000;
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(t.id), dur);
    return () => clearTimeout(timerRef.current);
  }, [t.id, dur, onRemove]);

  return (
    <div
      className={`relative w-80 rounded-xl shadow-lg dark:shadow-black/40 border border-slate-200 dark:border-[var(--dark-border-2)] overflow-hidden ${cfg.bg} ${
        t.removing ? 'animate-[toast-out_0.28s_ease_forwards]' : 'animate-[toast-in_0.32s_cubic-bezier(0.16,1,0.3,1)]'
      }`}
    >
      {/* progress bar */}
      <div className="absolute top-0 left-0 h-[3px] w-full overflow-hidden">
        <div className={`h-full ${cfg.barColor} animate-[toast-progress_linear_forwards]`} style={{ animationDuration: `${dur}ms` }} />
      </div>

      <div className="flex items-start gap-3 px-4 py-3 pt-4">
        <div className="flex-shrink-0 mt-0.5">
          <Icon size={18} className={cfg.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-[var(--dark-text)] leading-tight">{t.title}</p>
          {t.message && <p className="text-xs text-slate-500 dark:text-[var(--dark-text-2)] mt-0.5 leading-relaxed">{t.message}</p>}
        </div>
        <button
          onClick={() => onRemove(t.id)}
          className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-[var(--dark-surface)] transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────── provider */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, removing: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
  }, []);

  const addToast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-4), { ...opts, id }]); // max 5 visible
  }, []);

  const ctx: ToastContextValue = {
    toast: addToast,
    success: (title, message) => addToast({ type: 'success', title, message }),
    error: (title, message) => addToast({ type: 'error', title, message }),
    info: (title, message) => addToast({ type: 'info', title, message }),
    warning: (title, message) => addToast({ type: 'warning', title, message }),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem t={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

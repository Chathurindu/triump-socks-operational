'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell, X, AlertTriangle, Info, CheckCircle2, Activity,
  Package, Users, DollarSign, Factory, ShoppingCart,
  Clock, RefreshCw, ExternalLink,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

/* ── Icon / color mapping ── */
const MODULE_ICONS: Record<string, any> = {
  inventory: Package,
  production: Factory,
  hr: Users,
  sales: ShoppingCart,
  finance: DollarSign,
  default: Activity,
};

const TYPE_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', icon: AlertTriangle },
  info: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', icon: Info },
  success: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
};

const ACTION_COLORS: Record<string, string> = {
  create: 'text-emerald-500',
  update: 'text-blue-500',
  delete: 'text-red-500',
  login: 'text-amber-500',
};

function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function NotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [tab, setTab] = useState<'alerts' | 'activity'>('alerts');
  const [hasNew, setHasNew] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=25');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setAlerts(data.alerts || []);
      setActivities(data.activities || []);
      if ((data.alerts?.length || 0) > 0) setHasNew(true);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  /* Fetch on mount + every 60s */
  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 60000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  /* Close on click outside */
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const toggleOpen = () => {
    setOpen(o => !o);
    if (!open) {
      setHasNew(false);
      fetchNotifications();
    }
  };

  const navigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const totalAlerts = alerts.length;
  const displayItems = tab === 'alerts' ? alerts : activities;

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={toggleOpen}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={15} />
        {(hasNew || totalAlerts > 0) && (
          <span className="absolute top-0.5 right-0.5 flex items-center justify-center">
            <span className="absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75 animate-ping" />
            <span className="relative inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-amber-500 text-white text-[0.45rem] font-bold border border-white dark:border-gray-900">
              {totalAlerts > 9 ? '9+' : totalAlerts || ''}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-[380px] max-h-[520px] bg-white dark:bg-[var(--dark-card)] rounded-xl shadow-2xl border border-slate-200 dark:border-[var(--dark-border)] overflow-hidden flex flex-col z-50"
          style={{ animation: 'notif-panel-in 0.2s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[var(--dark-border)]">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-[var(--dark-text)]">Notifications</h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { fetchNotifications(); }}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[var(--dark-surface)] transition-colors"
                title="Refresh"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[var(--dark-surface)] transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 dark:border-[var(--dark-border)]">
            <button
              onClick={() => setTab('alerts')}
              className={`flex-1 py-2 text-xs font-medium text-center transition-colors relative ${
                tab === 'alerts'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 dark:text-[var(--dark-text-2)] hover:text-slate-700'
              }`}
            >
              Alerts {totalAlerts > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[0.6rem] font-bold">{totalAlerts}</span>}
              {tab === 'alerts' && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-amber-500 rounded-full" />}
            </button>
            <button
              onClick={() => setTab('activity')}
              className={`flex-1 py-2 text-xs font-medium text-center transition-colors relative ${
                tab === 'activity'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 dark:text-[var(--dark-text-2)] hover:text-slate-700'
              }`}
            >
              Activity
              {tab === 'activity' && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-amber-500 rounded-full" />}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading && displayItems.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw size={18} className="text-slate-300 animate-spin" />
              </div>
            ) : displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Bell size={28} className="text-slate-200 dark:text-slate-600" />
                <p className="text-xs text-slate-400 dark:text-[var(--dark-text-3)]">
                  {tab === 'alerts' ? 'No alerts right now' : 'No recent activity'}
                </p>
              </div>
            ) : tab === 'alerts' ? (
              /* Alert items */
              <div className="divide-y divide-slate-50 dark:divide-[var(--dark-border)]">
                {alerts.map((a) => {
                  const style = TYPE_STYLES[a.type] || TYPE_STYLES.info;
                  const Icon = style.icon;
                  return (
                    <div
                      key={a.id}
                      className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors cursor-pointer"
                      onClick={() => {
                        if (a.module === 'inventory') navigate('/inventory');
                        else if (a.module === 'production') navigate('/production');
                        else if (a.module === 'hr') navigate('/hr/leave');
                        else if (a.module === 'sales') navigate('/sales');
                      }}
                    >
                      <div className="flex gap-3">
                        <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon size={14} className={style.text} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-700 dark:text-[var(--dark-text)]">{a.title}</p>
                            <span className="text-[0.6rem] text-slate-400 whitespace-nowrap flex items-center gap-0.5">
                              <Clock size={8} /> {timeAgo(a.created_at)}
                            </span>
                          </div>
                          <p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5 leading-relaxed">{a.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Activity items */
              <div className="divide-y divide-slate-50 dark:divide-[var(--dark-border)]">
                {activities.map((a) => {
                  const ModIcon = MODULE_ICONS[a.module] || MODULE_ICONS.default;
                  const actionColor = ACTION_COLORS[a.action] || 'text-slate-500';
                  return (
                    <div
                      key={a.id}
                      className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors"
                    >
                      <div className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[var(--dark-surface)] flex items-center justify-center flex-shrink-0">
                          <ModIcon size={12} className="text-slate-500 dark:text-[var(--dark-text-2)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-slate-700 dark:text-[var(--dark-text)] truncate">
                              <span className="font-medium">{a.user_name || 'System'}</span>{' '}
                              <span className={`font-semibold ${actionColor}`}>{a.action}</span>{' '}
                              <span className="text-slate-500 dark:text-[var(--dark-text-3)]">in {a.module}</span>
                            </p>
                            <span className="text-[0.55rem] text-slate-400 whitespace-nowrap">{timeAgo(a.created_at)}</span>
                          </div>
                          {a.description && (
                            <p className="text-[0.6rem] text-slate-400 dark:text-[var(--dark-text-3)] mt-0.5 truncate">{a.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-[var(--dark-border)] flex items-center justify-between">
            <span className="text-[0.6rem] text-slate-400 dark:text-[var(--dark-text-3)]">
              {tab === 'alerts' ? `${totalAlerts} alert${totalAlerts !== 1 ? 's' : ''}` : `${activities.length} recent`}
            </span>
            <button
              onClick={() => navigate('/admin/activity')}
              className="text-[0.65rem] font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors flex items-center gap-1"
            >
              View All Activity <ExternalLink size={9} />
            </button>
          </div>
        </div>
      )}

      {/* Animation */}
      <style jsx>{`
        @keyframes notif-panel-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

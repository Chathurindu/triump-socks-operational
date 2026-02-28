'use client';
import { useEffect, useState } from 'react';
import { Plus, Factory } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { formatDate, formatNumber } from '@/lib/utils';
import type { ProductionOrder } from '@/types';

export default function ProductionPage() {
  const [orders, setOrders]   = useState<ProductionOrder[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setFilter] = useState('');

  useEffect(() => {
    fetch(`/api/production?status=${statusFilter}`)
      .then((r) => r.json())
      .then((d) => { setOrders(d.data ?? []); setSummary(d.summary); setLoading(false); });
  }, [statusFilter]);

  const statusTabs = [
    { value: '',            label: 'All' },
    { value: 'planned',     label: 'Planned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed',   label: 'Completed' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Planned',     value: summary.planned },
            { label: 'In Progress', value: summary.in_progress },
            { label: 'Completed',   value: summary.completed },
            { label: 'Total Planned', value: formatNumber(summary.total_qty) },
            { label: 'Total Produced',value: formatNumber(summary.total_produced) },
          ].map((s) => (
            <div key={s.label} className="triumph-card p-3">
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
              <p className="text-[0.65rem] text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <Card noPad>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex gap-1">
            {statusTabs.map((t) => (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === t.value
                    ? 'bg-amber-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Button size="sm" icon={<Plus size={13} />}>New Order</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <table className="w-full triumph-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Product</th>
                <th className="text-right">Target</th>
                <th className="text-right">Produced</th>
                <th>Progress</th>
                <th>Machine</th>
                <th>Supervisor</th>
                <th>Start Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => {
                const pct = o.quantity > 0 ? Math.round((o.produced_qty / o.quantity) * 100) : 0;
                return (
                  <tr key={o.id}>
                    <td className="font-mono text-[0.7rem] text-amber-700 dark:text-amber-400">{o.order_number}</td>
                    <td className="text-sm font-medium">{o.product_name ?? '—'}</td>
                    <td className="text-right text-sm tabular-nums">{formatNumber(o.quantity)}</td>
                    <td className="text-right text-sm tabular-nums">{formatNumber(o.produced_qty)}</td>
                    <td>
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-amber-500"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[0.65rem] text-gray-500 tabular-nums w-8">{pct}%</span>
                      </div>
                    </td>
                    <td className="text-xs text-gray-500">{o.machine_name ?? '—'}</td>
                    <td className="text-xs">{o.supervisor_name ?? '—'}</td>
                    <td className="text-xs text-gray-500">{o.start_date ? formatDate(o.start_date) : '—'}</td>
                    <td><Badge status={o.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

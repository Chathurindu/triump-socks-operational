'use client';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function SalesPage() {
  const [orders, setOrders]   = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sales?status=${status}`)
      .then((r) => r.json())
      .then((d) => { setOrders(d.data ?? []); setSummary(d.summary); setLoading(false); });
  }, [status]);

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Revenue (This Month)', value: formatCurrency(summary.total_revenue ?? 0) },
            { label: 'Total Orders',         value: summary.total_orders ?? 0 },
            { label: 'Paid Orders',          value: summary.paid_orders ?? 0 },
            { label: 'Pending Orders',       value: summary.pending_orders ?? 0 },
          ].map((s) => (
            <div key={s.label} className="triumph-card p-3">
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
              <p className="text-[0.65rem] text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <Card noPad>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex gap-1">
            {[['', 'All'], ['pending','Pending'], ['confirmed','Confirmed'], ['shipped','Shipped'], ['delivered','Delivered']].map(([v, l]) => (
              <button key={v} onClick={() => setStatus(v)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${status === v ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
                {l}
              </button>
            ))}
          </div>
          <Button size="sm" icon={<Plus size={13} />}>New Order</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full" /></div>
        ) : (
          <table className="w-full triumph-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Order Date</th>
                <th>Delivery Date</th>
                <th className="text-right">Total</th>
                <th className="text-right">Discount</th>
                <th className="text-right">Grand Total</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="font-mono text-[0.7rem] text-amber-700 dark:text-amber-400">{o.order_number}</td>
                  <td className="text-sm font-medium">{o.customer_name ?? '—'}</td>
                  <td><Badge label={o.customer_type} color="gray" /></td>
                  <td className="text-xs text-gray-500">{formatDate(o.order_date)}</td>
                  <td className="text-xs text-gray-500">{o.delivery_date ? formatDate(o.delivery_date) : '—'}</td>
                  <td className="text-right text-xs tabular-nums">{formatCurrency(o.total_amount)}</td>
                  <td className="text-right text-xs tabular-nums text-red-600 dark:text-red-400">{formatCurrency(o.discount)}</td>
                  <td className="text-right text-sm font-semibold tabular-nums">{formatCurrency(o.grand_total)}</td>
                  <td><Badge status={o.payment_status} /></td>
                  <td><Badge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

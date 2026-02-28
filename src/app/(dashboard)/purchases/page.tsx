'use client';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function PurchasesPage() {
  const [orders, setOrders]   = useState<any[]>([]);
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/purchases?status=${status}`)
      .then((r) => r.json())
      .then((d) => { setOrders(d.data ?? []); setLoading(false); });
  }, [status]);

  return (
    <div className="space-y-4">
      <Card noPad>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex gap-1">
            {[['','All'],['pending','Pending'],['confirmed','Confirmed'],['received','Received'],['cancelled','Cancelled']].map(([v,l]) => (
              <button key={v} onClick={() => setStatus(v)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${status===v?'bg-amber-600 text-white':'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
                {l}
              </button>
            ))}
          </div>
          <Button size="sm" icon={<Plus size={13} />}>New PO</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full" /></div>
        ) : (
          <table className="w-full triumph-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Category</th>
                <th>Order Date</th>
                <th>Expected</th>
                <th className="text-right">Total Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="font-mono text-[0.7rem] text-amber-700 dark:text-amber-400">{o.po_number}</td>
                  <td className="text-sm font-medium">{o.supplier_name ?? '—'}</td>
                  <td><Badge label={o.supplier_category ?? 'other'} color="gray" /></td>
                  <td className="text-xs text-gray-500">{formatDate(o.order_date)}</td>
                  <td className="text-xs text-gray-500">{o.expected_date ? formatDate(o.expected_date) : '—'}</td>
                  <td className="text-right text-sm font-semibold tabular-nums">{formatCurrency(o.total_amount)}</td>
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

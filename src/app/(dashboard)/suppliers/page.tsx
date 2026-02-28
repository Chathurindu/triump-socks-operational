'use client';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch('/api/suppliers').then((r) => r.json()).then((d) => { setSuppliers(d.data ?? []); setLoading(false); });
  }, []);

  return (
    <div className="space-y-4">
      <Card noPad>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">All Suppliers</h3>
          <Button size="sm" icon={<Plus size={13} />}>Add Supplier</Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full" /></div>
        ) : (
          <table className="w-full triumph-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Category</th>
                <th className="text-center">Rating</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium text-sm">{s.name}</td>
                  <td className="text-xs text-gray-500">{s.contact ?? '—'}</td>
                  <td className="text-xs">{s.phone ?? '—'}</td>
                  <td className="text-xs text-blue-600 dark:text-blue-400">{s.email ?? '—'}</td>
                  <td><Badge label={s.category} color="amber" /></td>
                  <td className="text-center">
                    <span className="text-xs font-medium">{'⭐'.repeat(Math.round(s.rating || 5))}</span>
                  </td>
                  <td><Badge status={s.is_active ? 'active' : 'inactive'} label={s.is_active ? 'Active' : 'Inactive'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

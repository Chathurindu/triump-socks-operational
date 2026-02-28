'use client';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const TYPES = ['all', 'retail', 'wholesale', 'distributor'];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [type, setType]           = useState('all');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/customers').then((r) => r.json()).then((d) => { setCustomers(d.data ?? []); setLoading(false); });
  }, []);

  const filtered = type === 'all' ? customers : customers.filter((c) => c.customer_type === type);

  return (
    <div className="space-y-4">
      <Card noPad>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex gap-1">
            {TYPES.map((t) => (
              <button key={t} onClick={() => setType(t)}
                className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${type === t ? 'bg-amber-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>
          <Button size="sm" icon={<Plus size={13} />}>Add Customer</Button>
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
                <th>Type</th>
                <th>City</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium text-sm">{c.name}</td>
                  <td className="text-xs text-gray-500">{c.contact ?? '—'}</td>
                  <td className="text-xs">{c.phone ?? '—'}</td>
                  <td className="text-xs text-blue-600 dark:text-blue-400">{c.email ?? '—'}</td>
                  <td><Badge label={c.customer_type} color={c.customer_type === 'wholesale' ? 'blue' : c.customer_type === 'distributor' ? 'purple' : 'amber'} /></td>
                  <td className="text-xs">{c.city ?? '—'}</td>
                  <td><Badge status={c.is_active ? 'active' : 'inactive'} label={c.is_active ? 'Active' : 'Inactive'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

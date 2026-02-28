'use client';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';

const TYPES = ['all', 'knitting', 'overlock', 'sealer', 'packaging', 'dyeing'];

export default function MachinesPage() {
  const [machines, setMachines] = useState<any[]>([]);
  const [type, setType]         = useState('all');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/machines').then((r) => r.json()).then((d) => { setMachines(d.data ?? []); setLoading(false); });
  }, []);

  const filtered = type === 'all' ? machines : machines.filter((m) => m.machine_type === type);

  return (
    <div className="space-y-4">
      <Card noPad>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex gap-1 flex-wrap">
            {TYPES.map((t) => (
              <button key={t} onClick={() => setType(t)}
                className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${type === t ? 'bg-amber-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>
          <Button size="sm" icon={<Plus size={13} />}>Add Machine</Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full" /></div>
        ) : (
          <table className="w-full triumph-table">
            <thead>
              <tr>
                <th>Machine Name</th>
                <th>Type</th>
                <th>Model</th>
                <th>Manufacturer</th>
                <th>Location</th>
                <th>Last Maintenance</th>
                <th>Next Maintenance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium text-sm">{m.name}</td>
                  <td><Badge label={m.machine_type} color="blue" /></td>
                  <td className="text-xs text-gray-500">{m.model ?? '—'}</td>
                  <td className="text-xs">{m.manufacturer ?? '—'}</td>
                  <td className="text-xs">{m.location ?? '—'}</td>
                  <td className="text-xs">{m.last_maintenance_date ? formatDate(m.last_maintenance_date) : '—'}</td>
                  <td className="text-xs">{m.next_maintenance_date ? formatDate(m.next_maintenance_date) : '—'}</td>
                  <td><Badge status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

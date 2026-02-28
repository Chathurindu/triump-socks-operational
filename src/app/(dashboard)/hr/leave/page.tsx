'use client';
import { useEffect, useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';

const STATUSES = ['all', 'pending', 'approved', 'rejected', 'cancelled'];

export default function LeavePage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [status, setStatus]     = useState('all');
  const [loading, setLoading]   = useState(true);

  const load = (s: string) => {
    setLoading(true);
    const qs = s !== 'all' ? `?status=${s}` : '';
    fetch(`/api/leave${qs}`).then((r) => r.json()).then((d) => { setRequests(d.data ?? []); setLoading(false); });
  };

  useEffect(() => { load(status); }, [status]);

  const approve = async (id: string, action: 'approved' | 'rejected') => {
    await fetch('/api/leave', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: action }) });
    load(status);
  };

  return (
    <div className="space-y-4">
      <Card noPad>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex gap-1 flex-wrap">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${status === s ? 'bg-amber-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                {s}
              </button>
            ))}
          </div>
          <Button size="sm" icon={<Plus size={13} />}>New Request</Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full" /></div>
        ) : (
          <table className="w-full triumph-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>From</th>
                <th>To</th>
                <th className="text-center">Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="text-sm font-medium">{r.employee_name}<br/><span className="text-xs text-gray-400">{r.emp_code}</span></td>
                  <td><Badge label={r.leave_type_name} color="blue" /></td>
                  <td className="text-xs">{formatDate(r.from_date)}</td>
                  <td className="text-xs">{formatDate(r.to_date)}</td>
                  <td className="text-center text-sm font-semibold">
                    {Math.ceil((new Date(r.to_date).getTime() - new Date(r.from_date).getTime()) / 86400000) + 1}
                  </td>
                  <td className="text-xs text-gray-500 max-w-[160px] truncate">{r.reason ?? '—'}</td>
                  <td><Badge status={r.status} /></td>
                  <td className="text-center">
                    {r.status === 'pending' && (
                      <div className="flex justify-center gap-1">
                        <button onClick={() => approve(r.id, 'approved')} className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 transition-colors"><Check size={13} /></button>
                        <button onClick={() => approve(r.id, 'rejected')} className="p-1 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors"><X size={13} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400 text-sm">No leave requests found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AttendancePage() {
  const [records, setRecords]   = useState<any[]>([]);
  const [summary, setSummary]   = useState<any>(null);
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/attendance?date=${date}`)
      .then((r) => r.json())
      .then((d) => { setRecords(d.data ?? []); setSummary(d.summary); setLoading(false); })
      .catch(() => setLoading(false));
  }, [date]);

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      {summary && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Present', value: summary.present, cls: 'text-green-700 dark:text-green-400' },
            { label: 'Absent',  value: summary.absent,  cls: 'text-red-700 dark:text-red-400' },
            { label: 'Late',    value: summary.late,    cls: 'text-orange-700 dark:text-orange-400' },
            { label: 'Leave',   value: summary.leave,   cls: 'text-blue-700 dark:text-blue-400' },
          ].map((s) => (
            <div key={s.label} className="triumph-card p-3 text-center">
              <p className={`text-xl font-bold ${s.cls}`}>{s.value ?? 0}</p>
              <p className="text-[0.65rem] text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <Card noPad>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500">Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="triumph-input w-36"
            />
          </div>
          <Button size="sm" icon={<Plus size={13} />}>Mark Attendance</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full" /></div>
        ) : (
          <table className="w-full triumph-table">
            <thead>
              <tr>
                <th>Emp Code</th>
                <th>Name</th>
                <th>Department</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th className="text-right">OT (hrs)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-xs text-gray-400 py-8">
                  No attendance records for {formatDate(date)}.
                </td></tr>
              ) : records.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-[0.7rem] text-amber-700 dark:text-amber-400">{r.emp_code}</td>
                  <td className="text-sm font-medium">{r.full_name}</td>
                  <td className="text-xs text-gray-500">{r.department_name ?? '—'}</td>
                  <td className="text-sm tabular-nums">{r.check_in ?? '—'}</td>
                  <td className="text-sm tabular-nums">{r.check_out ?? '—'}</td>
                  <td className="text-right text-sm tabular-nums">{parseFloat(r.overtime_hrs || 0).toFixed(1)}</td>
                  <td><Badge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

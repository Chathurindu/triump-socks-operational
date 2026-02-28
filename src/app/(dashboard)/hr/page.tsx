'use client';
import Link from 'next/link';
import { Users, Clock, DollarSign, Calendar, Calculator } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { CardGrid } from '@/components/ui/Card';

export default function HRPage() {
  const modules = [
    { title: 'Employees',          desc: 'Manage employee records, roles, and details.',                 href: '/hr/employees',          icon: Users,       color: 'blue'   as const },
    { title: 'Attendance',         desc: 'Track daily check-in/out and leave status.',                   href: '/hr/attendance',         icon: Clock,       color: 'green'  as const },
    { title: 'Payroll',            desc: 'Process monthly salary and view payment history.',             href: '/hr/payroll',            icon: DollarSign,  color: 'amber'  as const },
    { title: 'Leave',              desc: 'Manage leave requests and approvals.',                         href: '/hr/leave',              icon: Calendar,    color: 'purple' as const },
    { title: 'Payroll Calculator', desc: 'Enterprise payroll computation with statutory deductions.',    href: '/hr/payroll-calculator', icon: Calculator,  color: 'amber'  as const },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600 dark:text-gray-400">Human Resources modules</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modules.map((m) => {
          const Icon = m.icon;
          const iconColors = { blue:'bg-blue-100 text-blue-600', green:'bg-green-100 text-green-600', amber:'bg-amber-100 text-amber-600', purple:'bg-purple-100 text-purple-600' };
          return (
            <Link key={m.href} href={m.href} className="triumph-card p-5 flex items-start gap-4 hover:border-amber-400 transition-colors group">
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${iconColors[m.color]}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">{m.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

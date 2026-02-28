'use client';
import { useEffect, useState } from 'react';
import {
  DollarSign, Users, Package, Factory, ShoppingCart,
  TrendingUp, AlertTriangle, Wrench,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardGrid } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

type DashData = {
  totalRevenue: number; totalExpense: number; netProfit: number;
  totalEmployees: number; presentToday: number; activeOrders: number;
  lowStockItems: number; productionInProgress: number;
  monthlyRevenue: { month: string; revenue: number; expense: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  recentTransactions: any[];
};

const PIE_COLORS = ['#d4730a','#3b82f6','#22c55e','#f59e0b','#a855f7','#ef4444'];

export default function DashboardPage() {
  const [data, setData]     = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!data) return <div className="text-sm text-gray-500 dark:text-gray-400">Failed to load dashboard.</div>;

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <CardGrid cols={4}>
        <StatCard title="Revenue (This Month)" value={formatCurrency(data.totalRevenue)} icon={DollarSign} iconColor="amber" change={8.4} animDelay="anim-d1" />
        <StatCard title="Expenses (This Month)" value={formatCurrency(data.totalExpense)} icon={TrendingUp} iconColor="red" change={-3.1} animDelay="anim-d2" />
        <StatCard title="Net Profit" value={formatCurrency(data.netProfit)} icon={DollarSign} iconColor="green" change={12.5} animDelay="anim-d3" />
        <StatCard title="Active Employees" value={data.totalEmployees} icon={Users} iconColor="blue" description={`${data.presentToday} present today`} animDelay="anim-d4" />
      </CardGrid>

      <CardGrid cols={4}>
        <StatCard title="Active Sales Orders" value={data.activeOrders} icon={ShoppingCart} iconColor="purple" animDelay="anim-d1" />
        <StatCard title="Low Stock Alerts" value={data.lowStockItems} icon={AlertTriangle} iconColor="red" animDelay="anim-d2" />
        <StatCard title="In Production" value={data.productionInProgress} icon={Factory} iconColor="amber" animDelay="anim-d3" />
        <StatCard title="Total Employees" value={data.totalEmployees} icon={Wrench} iconColor="gray" animDelay="anim-d4" />
      </CardGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue vs Expense */}
        <Card title="Revenue vs Expense (6 months)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.monthlyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4730a" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#d4730a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="revenue" stroke="#d4730a" fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} name="Expense" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Products Pie */}
        <Card title="Revenue by Product">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.topProducts} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }: any) => `${(name ?? '').split(' ')[0]} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 9 }}>
                {data.topProducts.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Products Bar */}
        <Card title="Top Products by Units Sold">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.topProducts.slice(0,6)} layout="vertical" margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
              <Tooltip />
              <Bar dataKey="quantity" fill="#d4730a" radius={[0, 3, 3, 0]} name="Units" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent Transactions */}
        <Card title="Recent Transactions">
          <div className="space-y-1">
            {data.recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-none">
                <div className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.txn_type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight">
                      {t.description?.length > 35 ? t.description.slice(0, 35) + '…' : t.description}
                    </p>
                    <p className="text-[0.65rem] text-gray-400">{formatDate(t.txn_date)} · {t.category}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold tabular-nums flex-shrink-0 ${t.txn_type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {t.txn_type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

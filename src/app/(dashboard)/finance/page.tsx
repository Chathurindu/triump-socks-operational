'use client';
import { useEffect, useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function FinancePage() {
  const [transactions, setTxns] = useState<any[]>([]);
  const [summary, setSummary]   = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [txnType, setTxnType]   = useState('');
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/finance?type=${txnType}&search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((d) => { setTxns(d.data ?? []); setSummary(d.summary); setAccounts(d.accounts ?? []); setLoading(false); });
  }, [txnType, search]);

  const totalAssets    = accounts.filter((a) => a.type === 'asset').reduce((s, a) => s + parseFloat(a.balance || 0), 0);
  const totalLiability = accounts.filter((a) => a.type === 'liability').reduce((s, a) => s + parseFloat(a.balance || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Income',   value: formatCurrency(summary?.total_income ?? 0),   cls: 'text-green-700 dark:text-green-400' },
          { label: 'Total Expense',  value: formatCurrency(summary?.total_expense ?? 0),  cls: 'text-red-700 dark:text-red-400' },
          { label: 'Total Assets',   value: formatCurrency(totalAssets),                   cls: 'text-blue-700 dark:text-blue-400' },
          { label: 'Total Liabilities',value: formatCurrency(totalLiability),             cls: 'text-purple-700 dark:text-purple-400' },
        ].map((s) => (
          <div key={s.label} className="triumph-card p-3">
            <p className={`text-lg font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-[0.65rem] text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Accounts */}
        <div className="triumph-card">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Chart of Accounts</h3>
          </div>
          <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div>
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{a.name}</p>
                  <p className="text-[0.6rem] text-gray-400 capitalize">{a.type}</p>
                </div>
                <span className={`text-xs font-semibold tabular-nums ${a.type === 'expense' || a.type === 'liability' ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                  {formatCurrency(parseFloat(a.balance || 0))}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="lg:col-span-2 triumph-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex gap-1">
              {[['', 'All'], ['income', 'Income'], ['expense', 'Expense']].map(([v, l]) => (
                <button key={v} onClick={() => setTxnType(v)} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${txnType === v ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}>{l}</button>
              ))}
            </div>
            <Button size="sm" icon={<Plus size={13} />}>Add Transaction</Button>
          </div>
          <div className="p-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions…" className="triumph-input mb-3" />
          </div>
          {loading ? (
            <div className="flex justify-center py-6"><div className="animate-spin w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full" /></div>
          ) : (
            <table className="w-full triumph-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Account</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="text-xs text-gray-500">{formatDate(t.txn_date)}</td>
                    <td><Badge label={t.txn_type} status={t.txn_type === 'income' ? 'active' : 'absent'} /></td>
                    <td className="text-xs text-gray-500">{t.category ?? '—'}</td>
                    <td className="text-xs max-w-[180px] truncate">{t.description ?? '—'}</td>
                    <td className="text-xs text-gray-400">{t.account_name ?? '—'}</td>
                    <td className={`text-right text-sm font-semibold tabular-nums ${t.txn_type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {t.txn_type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

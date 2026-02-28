'use client';
import { useEffect, useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { AppSettings } from '@/types';

const SETTING_GROUPS = [
  {
    title: 'Company Information',
    keys: ['company_name','company_email','company_phone','company_address'],
    labels: { company_name:'Company Name', company_email:'Email Address', company_phone:'Phone', company_address:'Address' },
  },
  {
    title: 'Financial Settings',
    keys: ['currency','currency_symbol','tax_rate','financial_year_start'],
    labels: { currency:'Default Currency', currency_symbol:'Currency Symbol', tax_rate:'Tax Rate (%)', financial_year_start:'Financial Year Start' },
  },
  {
    title: 'HR & Payroll',
    keys: ['payroll_cycle','working_hours','overtime_rate'],
    labels: { payroll_cycle:'Payroll Cycle', working_hours:'Working Hours/Day', overtime_rate:'Overtime Rate Multiplier' },
  },
  {
    title: 'Inventory Alerts',
    keys: ['low_stock_alert'],
    labels: { low_stock_alert:'Low Stock Alert Threshold (%)' },
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Partial<AppSettings>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d) => { setSettings(d.data ?? {}); setLoading(false); });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function update(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full" /></div>;

  return (
    <form onSubmit={handleSave} className="space-y-5 max-w-3xl">
      {/* Theme */}
      <Card title="Appearance">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Theme Mode</p>
            <p className="text-xs text-gray-500">Toggle between light and dark mode. Default is light.</p>
          </div>
          <ThemeToggle />
        </div>
      </Card>

      {SETTING_GROUPS.map((group) => (
        <Card key={group.title} title={group.title}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {group.keys.map((key) => (
              <div key={key}>
                <label className="triumph-label">{(group.labels as any)[key]}</label>
                {key === 'company_address' ? (
                  <textarea
                    value={(settings as any)[key] ?? ''}
                    onChange={(e) => update(key, e.target.value)}
                    rows={2}
                    className="triumph-input resize-none"
                  />
                ) : key === 'payroll_cycle' ? (
                  <select value={(settings as any)[key] ?? 'monthly'} onChange={(e) => update(key, e.target.value)} className="triumph-input">
                    <option value="monthly">Monthly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={(settings as any)[key] ?? ''}
                    onChange={(e) => update(key, e.target.value)}
                    className="triumph-input"
                  />
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving} icon={<Save size={13} />}>
          Save Settings
        </Button>
        {saved && <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Settings saved successfully</span>}
      </div>
    </form>
  );
}

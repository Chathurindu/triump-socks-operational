'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Target, TrendingUp, CheckCircle2, AlertTriangle, BarChart3,
  Pencil, Trash2, Star, Eye, X,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';

const PAGE_SIZE = 15;

/* ── Types ── */
type TabType = 'dashboard' | 'targets' | 'appraisals' | 'definitions';

type TargetForm = {
  kpi_id: string; employee_id: string; department: string;
  period_month: string; period_year: string;
  target_value: string; actual_value: string; notes: string;
};

type AppraisalForm = {
  employee_id: string; reviewer_id: string;
  period_start: string; period_end: string;
  overall_score: string; status: string;
  strengths: string; improvements: string; goals: string;
  scores: { kpi_name: string; target: string; actual: string; score: string; weight: string }[];
};

type DefinitionForm = {
  name: string; description: string; unit: string;
  category: string; is_active: boolean;
};

const EMPTY_TARGET: TargetForm = {
  kpi_id: '', employee_id: '', department: '',
  period_month: String(new Date().getMonth() + 1), period_year: String(new Date().getFullYear()),
  target_value: '', actual_value: '', notes: '',
};

const EMPTY_APPRAISAL: AppraisalForm = {
  employee_id: '', reviewer_id: '',
  period_start: '', period_end: '',
  overall_score: '', status: 'draft',
  strengths: '', improvements: '', goals: '',
  scores: [{ kpi_name: '', target: '', actual: '', score: '', weight: '' }],
};

const EMPTY_DEFINITION: DefinitionForm = {
  name: '', description: '', unit: '',
  category: 'production', is_active: true,
};

const CATEGORIES = ['production', 'quality', 'attendance', 'delivery', 'sales'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function achColor(pct: number) {
  if (pct >= 100) return '#22c55e';
  if (pct >= 70) return '#f59e0b';
  return '#ef4444';
}

function achBadge(pct: number) {
  if (pct >= 100) return { label: 'On Track', color: 'green' as const };
  if (pct >= 70) return { label: 'Needs Attention', color: 'amber' as const };
  return { label: 'Below Target', color: 'red' as const };
}

export default function KPIPage() {
  /* ── tab ── */
  const [tab, setTab] = useState<TabType>('dashboard');

  /* ── dashboard state ── */
  const [dashMonth, setDashMonth] = useState(new Date().getMonth() + 1);
  const [dashYear, setDashYear] = useState(new Date().getFullYear());
  const [dashData, setDashData] = useState<any[]>([]);
  const [dashSummary, setDashSummary] = useState<any>(null);
  const [dashLoading, setDashLoading] = useState(true);

  /* ── targets state ── */
  const [targets, setTargets] = useState<any[]>([]);
  const [targetsTotal, setTargetsTotal] = useState(0);
  const [targetsPage, setTargetsPage] = useState(1);
  const [targetsSearch, setTargetsSearch] = useState('');
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [filterKpi, setFilterKpi] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');

  /* ── appraisals state ── */
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [appraisalsTotal, setAppraisalsTotal] = useState(0);
  const [appraisalsPage, setAppraisalsPage] = useState(1);
  const [appraisalsSearch, setAppraisalsSearch] = useState('');
  const [appraisalsLoading, setAppraisalsLoading] = useState(true);

  /* ── definitions state ── */
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [defsLoading, setDefsLoading] = useState(true);

  /* ── form / modal ── */
  const [targetFormOpen, setTargetFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [targetForm, setTargetForm] = useState<TargetForm>(EMPTY_TARGET);
  const [targetSaving, setTargetSaving] = useState(false);

  const [appraisalFormOpen, setAppraisalFormOpen] = useState(false);
  const [editAppraisal, setEditAppraisal] = useState<any>(null);
  const [appraisalForm, setAppraisalForm] = useState<AppraisalForm>(EMPTY_APPRAISAL);
  const [appraisalSaving, setAppraisalSaving] = useState(false);

  const [defFormOpen, setDefFormOpen] = useState(false);
  const [editDef, setEditDef] = useState<any>(null);
  const [defForm, setDefForm] = useState<DefinitionForm>(EMPTY_DEFINITION);
  const [defSaving, setDefSaving] = useState(false);

  /* ── delete ── */
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteType, setDeleteType] = useState<'target' | 'appraisal' | 'definition'>('target');
  const [deleting, setDeleting] = useState(false);

  /* ── meta ── */
  const [kpiDefs, setKpiDefs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const toast = useToast();

  /* ── load meta ── */
  useEffect(() => {
    fetch('/api/kpi?meta=1')
      .then((r) => r.json())
      .then((j) => {
        setKpiDefs(j.definitions ?? []);
        setEmployees(j.employees ?? []);
      });
  }, []);

  /* ── fetch dashboard ── */
  const fetchDashboard = useCallback(async () => {
    setDashLoading(true);
    const qs = new URLSearchParams({ dashboard: '1', month: String(dashMonth), year: String(dashYear) });
    const res = await fetch(`/api/kpi?${qs}`);
    const json = await res.json();
    setDashData(json.rows ?? []);
    setDashSummary(json.summary ?? null);
    setDashLoading(false);
  }, [dashMonth, dashYear]);

  useEffect(() => { if (tab === 'dashboard') fetchDashboard(); }, [tab, fetchDashboard]);

  /* ── fetch targets ── */
  const fetchTargets = useCallback(async () => {
    setTargetsLoading(true);
    const qs = new URLSearchParams({
      page: String(targetsPage), limit: String(PAGE_SIZE),
      search: targetsSearch,
      ...(filterKpi ? { kpi_id: filterKpi } : {}),
      ...(filterEmployee ? { employee_id: filterEmployee } : {}),
      ...(filterMonth ? { month: filterMonth } : {}),
      ...(filterYear ? { year: filterYear } : {}),
    });
    const res = await fetch(`/api/kpi?${qs}`);
    const json = await res.json();
    setTargets(json.rows ?? []);
    setTargetsTotal(json.total ?? 0);
    setTargetsLoading(false);
  }, [targetsPage, targetsSearch, filterKpi, filterEmployee, filterMonth, filterYear]);

  useEffect(() => { if (tab === 'targets') fetchTargets(); }, [tab, fetchTargets]);

  /* ── fetch appraisals ── */
  const fetchAppraisals = useCallback(async () => {
    setAppraisalsLoading(true);
    const qs = new URLSearchParams({
      appraisals: '1',
      page: String(appraisalsPage), limit: String(PAGE_SIZE),
      search: appraisalsSearch,
    });
    const res = await fetch(`/api/kpi?${qs}`);
    const json = await res.json();
    setAppraisals(json.rows ?? []);
    setAppraisalsTotal(json.total ?? 0);
    setAppraisalsLoading(false);
  }, [appraisalsPage, appraisalsSearch]);

  useEffect(() => { if (tab === 'appraisals') fetchAppraisals(); }, [tab, fetchAppraisals]);

  /* ── fetch definitions ── */
  const fetchDefinitions = useCallback(async () => {
    setDefsLoading(true);
    const res = await fetch('/api/kpi?definitions=1');
    const json = await res.json();
    setDefinitions(json.rows ?? []);
    setDefsLoading(false);
  }, []);

  useEffect(() => { if (tab === 'definitions') fetchDefinitions(); }, [tab, fetchDefinitions]);

  /* ═══════════════════════════════ HANDLERS ═══════════════════════════════ */

  /* ── target CRUD ── */
  const openAddTarget = () => { setEditTarget(null); setTargetForm(EMPTY_TARGET); setTargetFormOpen(true); };
  const openEditTarget = (row: any) => {
    setEditTarget(row);
    setTargetForm({
      kpi_id: String(row.kpi_id ?? ''),
      employee_id: String(row.employee_id ?? ''),
      department: row.department ?? '',
      period_month: String(row.period_month ?? ''),
      period_year: String(row.period_year ?? ''),
      target_value: String(row.target_value ?? ''),
      actual_value: String(row.actual_value ?? ''),
      notes: row.notes ?? '',
    });
    setTargetFormOpen(true);
  };

  const handleSaveTarget = async () => {
    if (!targetForm.kpi_id) { toast.warning('Validation', 'Please select a KPI.'); return; }
    if (!targetForm.target_value) { toast.warning('Validation', 'Target value is required.'); return; }

    setTargetSaving(true);
    try {
      const payload = {
        ...targetForm,
        target_value: parseFloat(targetForm.target_value) || 0,
        actual_value: parseFloat(targetForm.actual_value) || 0,
        period_month: parseInt(targetForm.period_month) || 0,
        period_year: parseInt(targetForm.period_year) || 0,
        ...(editTarget ? { id: editTarget.id } : {}),
      };
      const res = await fetch('/api/kpi', {
        method: editTarget ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editTarget ? 'Target Updated' : 'Target Created', editTarget ? 'KPI target updated.' : 'New KPI target set.');
      setTargetFormOpen(false);
      fetchTargets();
      if (tab === 'dashboard') fetchDashboard();
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setTargetSaving(false);
    }
  };

  /* ── appraisal CRUD ── */
  const openAddAppraisal = () => { setEditAppraisal(null); setAppraisalForm(EMPTY_APPRAISAL); setAppraisalFormOpen(true); };
  const openEditAppraisal = (row: any) => {
    setEditAppraisal(row);
    setAppraisalForm({
      employee_id: String(row.employee_id ?? ''),
      reviewer_id: String(row.reviewer_id ?? ''),
      period_start: row.period_start ? String(row.period_start).slice(0, 10) : '',
      period_end: row.period_end ? String(row.period_end).slice(0, 10) : '',
      overall_score: String(row.overall_score ?? ''),
      status: row.status ?? 'draft',
      strengths: row.strengths ?? '',
      improvements: row.improvements ?? '',
      goals: row.goals ?? '',
      scores: Array.isArray(row.scores) && row.scores.length > 0
        ? row.scores
        : [{ kpi_name: '', target: '', actual: '', score: '', weight: '' }],
    });
    setAppraisalFormOpen(true);
  };

  const handleSaveAppraisal = async () => {
    if (!appraisalForm.employee_id) { toast.warning('Validation', 'Please select an employee.'); return; }
    if (!appraisalForm.period_start || !appraisalForm.period_end) { toast.warning('Validation', 'Period dates are required.'); return; }

    setAppraisalSaving(true);
    try {
      const payload = {
        type: 'appraisal',
        ...appraisalForm,
        overall_score: parseFloat(appraisalForm.overall_score) || 0,
        scores: appraisalForm.scores.filter(s => s.kpi_name.trim()).map(s => ({
          ...s,
          target: parseFloat(s.target) || 0,
          actual: parseFloat(s.actual) || 0,
          score: parseFloat(s.score) || 0,
          weight: parseFloat(s.weight) || 0,
        })),
        ...(editAppraisal ? { id: editAppraisal.id } : {}),
      };
      const res = await fetch('/api/kpi', {
        method: editAppraisal ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(
        editAppraisal ? 'Appraisal Updated' : 'Appraisal Created',
        editAppraisal ? 'Performance appraisal updated.' : 'New appraisal created.',
      );
      setAppraisalFormOpen(false);
      fetchAppraisals();
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setAppraisalSaving(false);
    }
  };

  /* ── definition CRUD ── */
  const openAddDef = () => { setEditDef(null); setDefForm(EMPTY_DEFINITION); setDefFormOpen(true); };
  const openEditDef = (row: any) => {
    setEditDef(row);
    setDefForm({
      name: row.name ?? '',
      description: row.description ?? '',
      unit: row.unit ?? '',
      category: row.category ?? 'production',
      is_active: row.is_active ?? true,
    });
    setDefFormOpen(true);
  };

  const handleSaveDef = async () => {
    if (!defForm.name.trim()) { toast.warning('Validation', 'KPI name is required.'); return; }

    setDefSaving(true);
    try {
      const payload = {
        type: 'definition',
        ...defForm,
        ...(editDef ? { id: editDef.id } : {}),
      };
      const res = await fetch('/api/kpi', {
        method: editDef ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(
        editDef ? 'Definition Updated' : 'Definition Created',
        editDef ? 'KPI definition updated.' : 'New KPI definition added.',
      );
      setDefFormOpen(false);
      fetchDefinitions();
      fetch('/api/kpi?meta=1').then(r => r.json()).then(j => setKpiDefs(j.definitions ?? []));
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setDefSaving(false);
    }
  };

  /* ── delete handler ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/kpi', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id, type: deleteType }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', `${deleteType.charAt(0).toUpperCase() + deleteType.slice(1)} deleted.`);
      setDeleteTarget(null);
      if (deleteType === 'target') fetchTargets();
      else if (deleteType === 'appraisal') fetchAppraisals();
      else fetchDefinitions();
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setDeleting(false);
    }
  };

  /* ── form helpers ── */
  const tf = (k: keyof TargetForm, v: any) => setTargetForm((p) => ({ ...p, [k]: v }));
  const af = (k: keyof AppraisalForm, v: any) => setAppraisalForm((p) => ({ ...p, [k]: v }));
  const df = (k: keyof DefinitionForm, v: any) => setDefForm((p) => ({ ...p, [k]: v }));

  const addScoreRow = () => setAppraisalForm((p) => ({
    ...p, scores: [...p.scores, { kpi_name: '', target: '', actual: '', score: '', weight: '' }],
  }));
  const removeScoreRow = (i: number) => setAppraisalForm((p) => ({
    ...p, scores: p.scores.filter((_, idx) => idx !== i),
  }));
  const updateScore = (i: number, key: string, val: string) =>
    setAppraisalForm((p) => ({
      ...p, scores: p.scores.map((s, idx) => idx === i ? { ...s, [key]: val } : s),
    }));

  /* ── dashboard computed ── */
  const chartData = dashData.map((d: any) => ({
    name: d.kpi_name ?? d.name ?? '',
    achievement: d.target_value > 0 ? Math.round((d.actual_value / d.target_value) * 1000) / 10 : 0,
  }));

  /* ── targets columns ── */
  const targetColumns: Column[] = [
    {
      key: 'kpi_name', label: 'KPI Name', width: '160px',
      render: (r) => <span className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{r.kpi_name ?? '—'}</span>,
    },
    {
      key: 'employee_name', label: 'Employee', width: '140px',
      render: (r) => <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">{r.employee_name ?? '—'}</span>,
    },
    {
      key: 'department', label: 'Department', width: '120px',
      render: (r) => <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{r.department ?? '—'}</span>,
    },
    {
      key: 'period', label: 'Month / Year', width: '110px',
      render: (r) => (
        <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">
          {r.period_month ? MONTHS[(r.period_month - 1)] : ''} {r.period_year ?? ''}
        </span>
      ),
    },
    {
      key: 'target_value', label: 'Target', align: 'right', width: '90px',
      render: (r) => <span className="text-sm tabular-nums">{formatNumber(r.target_value ?? 0)}</span>,
    },
    {
      key: 'actual_value', label: 'Actual', align: 'right', width: '90px',
      render: (r) => <span className="text-sm tabular-nums">{formatNumber(r.actual_value ?? 0)}</span>,
    },
    {
      key: 'achievement', label: 'Achievement %', align: 'right', width: '110px',
      render: (r) => {
        const pct = r.target_value > 0 ? Math.round((r.actual_value / r.target_value) * 1000) / 10 : 0;
        const badge = achBadge(pct);
        return <Badge label={`${pct}%`} color={badge.color} />;
      },
    },
    {
      key: 'actions', label: '', width: '70px', sortable: false, align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEditTarget(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            title="Edit"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteType('target'); setDeleteTarget(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
        </div>
      ),
    },
  ];

  /* ── appraisal columns ── */
  const appraisalColumns: Column[] = [
    {
      key: 'employee_name', label: 'Employee', width: '160px',
      render: (r) => <span className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{r.employee_name ?? '—'}</span>,
    },
    {
      key: 'period', label: 'Period', width: '180px',
      render: (r) => (
        <span className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">
          {r.period_start ? formatDate(r.period_start) : '—'} → {r.period_end ? formatDate(r.period_end) : '—'}
        </span>
      ),
    },
    {
      key: 'overall_score', label: 'Overall Score', align: 'center', width: '120px',
      render: (r) => {
        const score = Number(r.overall_score ?? 0);
        return (
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={12} className={s <= Math.round(score)
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-300 dark:text-slate-600'
              } />
            ))}
            <span className="text-xs text-slate-500 ml-1">{score.toFixed(1)}</span>
          </div>
        );
      },
    },
    {
      key: 'status', label: 'Status', width: '100px',
      render: (r) => <Badge status={r.status} />,
    },
    {
      key: 'actions', label: '', width: '90px', sortable: false, align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEditAppraisal(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="View"
          >
            <Eye size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEditAppraisal(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            title="Edit"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteType('appraisal'); setDeleteTarget(r); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
        </div>
      ),
    },
  ];

  /* ── summary cards ── */
  const summaryCards = dashSummary ? [
    {
      label: 'Avg Achievement',
      value: `${Number(dashSummary.avg_achievement ?? 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-blue-500',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Targets Met',
      value: formatNumber(dashSummary.targets_met ?? 0),
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Total Targets',
      value: formatNumber(dashSummary.total_targets ?? 0),
      icon: Target,
      color: 'text-amber-500',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
  ] : [];

  /* ── dashboard table columns ── */
  const dashColumns: Column[] = [
    {
      key: 'kpi_name', label: 'KPI Name', width: '200px',
      render: (r) => <span className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{r.kpi_name ?? r.name ?? '—'}</span>,
    },
    {
      key: 'target_value', label: 'Target', align: 'right', width: '100px',
      render: (r) => <span className="text-sm tabular-nums">{formatNumber(r.target_value ?? 0)}</span>,
    },
    {
      key: 'actual_value', label: 'Actual', align: 'right', width: '100px',
      render: (r) => <span className="text-sm tabular-nums">{formatNumber(r.actual_value ?? 0)}</span>,
    },
    {
      key: 'achievement', label: 'Achievement %', align: 'right', width: '120px',
      render: (r) => {
        const pct = r.target_value > 0 ? Math.round((r.actual_value / r.target_value) * 1000) / 10 : 0;
        return <span className="text-sm font-semibold tabular-nums" style={{ color: achColor(pct) }}>{pct}%</span>;
      },
    },
    {
      key: 'status', label: 'Status', width: '130px',
      render: (r) => {
        const pct = r.target_value > 0 ? Math.round((r.actual_value / r.target_value) * 1000) / 10 : 0;
        const badge = achBadge(pct);
        return <Badge label={badge.label} color={badge.color} />;
      },
    },
  ];

  const TABS: { value: TabType; label: string }[] = [
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'targets', label: 'Targets' },
    { value: 'appraisals', label: 'Appraisals' },
    { value: 'definitions', label: 'Definitions' },
  ];

  return (
    <div className="space-y-4">
      {/* ── Tab Toggle ── */}
      <div className="flex items-center gap-1 triumph-card p-1 w-fit anim-fade-up">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.value
                ? 'bg-amber-500 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════ DASHBOARD TAB ══════════════════════════════════════ */}
      {tab === 'dashboard' && (
        <>
          {/* Month / Year Selector */}
          <div className="flex items-center gap-2 anim-fade-up anim-d1">
            <select
              className="triumph-input w-36"
              value={dashMonth}
              onChange={(e) => setDashMonth(parseInt(e.target.value))}
            >
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <input
              type="number"
              className="triumph-input w-24"
              value={dashYear}
              onChange={(e) => setDashYear(parseInt(e.target.value) || dashYear)}
              min={2020}
              max={2040}
            />
          </div>

          {/* Summary Cards */}
          {summaryCards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {summaryCards.map((k, i) => {
                const Icon = k.icon;
                return (
                  <div key={k.label} className={`triumph-card p-4 flex items-center gap-3 anim-fade-up anim-d${Math.min(i + 1, 6)}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.bg}`}>
                      <Icon size={18} className={k.color} />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{k.value}</p>
                      <p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">{k.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bar Chart */}
          <Card title={`KPI Achievement — ${MONTHS[dashMonth - 1]} ${dashYear}`} className="anim-fade-up anim-d3">
            {dashLoading ? (
              <div className="flex items-center justify-center h-52">
                <div className="animate-spin w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-52 text-sm text-slate-400">No data for this period.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip formatter={(v) => String(Number(v).toFixed(1))} />
                  <Bar dataKey="achievement" name="Achievement %" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={achColor(entry.achievement)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Dashboard Data Table */}
          <DataTable
            columns={dashColumns}
            data={dashData}
            total={dashData.length}
            page={1}
            pageSize={999}
            loading={dashLoading}
            onPageChange={() => {}}
            emptyIcon="📊"
            emptyText="No KPI data for this period."
          />
        </>
      )}

      {/* ══════════════════════════════════════ TARGETS TAB ══════════════════════════════════════ */}
      {tab === 'targets' && (
        <DataTable
          columns={targetColumns}
          data={targets}
          total={targetsTotal}
          page={targetsPage}
          pageSize={PAGE_SIZE}
          loading={targetsLoading}
          search={targetsSearch}
          onSearchChange={(v) => { setTargetsSearch(v); setTargetsPage(1); }}
          onPageChange={setTargetsPage}
          onRowDoubleClick={openEditTarget}
          searchPlaceholder="Search KPI targets…"
          emptyIcon="🎯"
          emptyText="No KPI targets found."
          toolbar={
            <>
              <select className="triumph-input text-xs !py-1 w-32" value={filterKpi} onChange={(e) => { setFilterKpi(e.target.value); setTargetsPage(1); }}>
                <option value="">All KPIs</option>
                {kpiDefs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select className="triumph-input text-xs !py-1 w-36" value={filterEmployee} onChange={(e) => { setFilterEmployee(e.target.value); setTargetsPage(1); }}>
                <option value="">All Employees</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select className="triumph-input text-xs !py-1 w-28" value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setTargetsPage(1); }}>
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <input
                type="number" placeholder="Year" min={2020} max={2040}
                className="triumph-input text-xs !py-1 w-20"
                value={filterYear}
                onChange={(e) => { setFilterYear(e.target.value); setTargetsPage(1); }}
              />
              <Button size="sm" icon={<Plus size={13} />} onClick={openAddTarget}>Set Target</Button>
            </>
          }
        />
      )}

      {/* ══════════════════════════════════════ APPRAISALS TAB ══════════════════════════════════════ */}
      {tab === 'appraisals' && (
        <DataTable
          columns={appraisalColumns}
          data={appraisals}
          total={appraisalsTotal}
          page={appraisalsPage}
          pageSize={PAGE_SIZE}
          loading={appraisalsLoading}
          search={appraisalsSearch}
          onSearchChange={(v) => { setAppraisalsSearch(v); setAppraisalsPage(1); }}
          onPageChange={setAppraisalsPage}
          onRowDoubleClick={openEditAppraisal}
          searchPlaceholder="Search appraisals…"
          emptyIcon="⭐"
          emptyText="No appraisals found."
          toolbar={
            <Button size="sm" icon={<Plus size={13} />} onClick={openAddAppraisal}>New Appraisal</Button>
          }
        />
      )}

      {/* ══════════════════════════════════════ DEFINITIONS TAB ══════════════════════════════════════ */}
      {tab === 'definitions' && (
        <div className="space-y-3 anim-fade-up">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-[var(--dark-text)]">KPI Definitions</h2>
            <Button size="sm" icon={<Plus size={13} />} onClick={openAddDef}>New KPI</Button>
          </div>

          {defsLoading ? (
            <div className="triumph-card p-8 text-center text-sm text-slate-400">Loading definitions…</div>
          ) : definitions.length === 0 ? (
            <div className="triumph-card p-8 text-center">
              <Target size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400">No KPI definitions yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {definitions.map((def) => (
                <div key={def.id} className="triumph-card p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{def.name}</span>
                      <Badge label={def.category} color="purple" />
                      <Badge
                        label={def.is_active ? 'Active' : 'Inactive'}
                        color={def.is_active ? 'green' : 'gray'}
                      />
                      {def.unit && (
                        <span className="text-[0.65rem] text-slate-400 dark:text-[var(--dark-text-3)]">Unit: {def.unit}</span>
                      )}
                    </div>
                    {def.description && (
                      <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5 truncate">{def.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditDef(def)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      title="Edit"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => { setDeleteType('definition'); setDeleteTarget(def); }}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════ TARGET FORM MODAL ══════════════════════════════════════ */}
      <Modal open={targetFormOpen} onClose={() => setTargetFormOpen(false)} title={editTarget ? 'Edit KPI Target' : 'Set KPI Target'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">KPI *</label>
            <select className="triumph-input" value={targetForm.kpi_id} onChange={(e) => tf('kpi_id', e.target.value)}>
              <option value="">— Select KPI —</option>
              {kpiDefs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Employee</label>
            <select className="triumph-input" value={targetForm.employee_id} onChange={(e) => tf('employee_id', e.target.value)}>
              <option value="">— Select —</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Department</label>
            <input className="triumph-input" value={targetForm.department} onChange={(e) => tf('department', e.target.value)} placeholder="e.g. Production" />
          </div>
          <div>
            <label className="triumph-label">Month</label>
            <select className="triumph-input" value={targetForm.period_month} onChange={(e) => tf('period_month', e.target.value)}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Year</label>
            <input type="number" className="triumph-input" value={targetForm.period_year} onChange={(e) => tf('period_year', e.target.value)} min={2020} max={2040} />
          </div>
          <div>
            <label className="triumph-label">Target Value *</label>
            <input type="number" className="triumph-input" value={targetForm.target_value} onChange={(e) => tf('target_value', e.target.value)} placeholder="e.g. 1000" />
          </div>
          <div>
            <label className="triumph-label">Actual Value</label>
            <input type="number" className="triumph-input" value={targetForm.actual_value} onChange={(e) => tf('actual_value', e.target.value)} placeholder="e.g. 850" />
          </div>
          <div>
            <label className="triumph-label">&nbsp;</label>
          </div>
          <div className="sm:col-span-2">
            <label className="triumph-label">Notes</label>
            <textarea className="triumph-input resize-none" rows={2} value={targetForm.notes} onChange={(e) => tf('notes', e.target.value)} placeholder="Optional notes…" />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setTargetFormOpen(false)}>Cancel</Button>
          {editTarget && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => { setTargetFormOpen(false); setDeleteType('target'); setDeleteTarget(editTarget); }}
              icon={<Trash2 size={12} />}
            >
              Delete
            </Button>
          )}
          <Button size="sm" onClick={handleSaveTarget} loading={targetSaving}>
            {editTarget ? 'Save Changes' : 'Set Target'}
          </Button>
        </div>
      </Modal>

      {/* ══════════════════════════════════════ APPRAISAL FORM MODAL ══════════════════════════════════════ */}
      <Modal open={appraisalFormOpen} onClose={() => setAppraisalFormOpen(false)} title={editAppraisal ? 'Edit Appraisal' : 'New Appraisal'} size="xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">Employee *</label>
            <select className="triumph-input" value={appraisalForm.employee_id} onChange={(e) => af('employee_id', e.target.value)}>
              <option value="">— Select Employee —</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Reviewer</label>
            <select className="triumph-input" value={appraisalForm.reviewer_id} onChange={(e) => af('reviewer_id', e.target.value)}>
              <option value="">— Select Reviewer —</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="triumph-label">Period Start *</label>
            <input type="date" className="triumph-input" value={appraisalForm.period_start} onChange={(e) => af('period_start', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Period End *</label>
            <input type="date" className="triumph-input" value={appraisalForm.period_end} onChange={(e) => af('period_end', e.target.value)} />
          </div>
          <div>
            <label className="triumph-label">Overall Score (0–5)</label>
            <input type="number" min="0" max="5" step="0.1" className="triumph-input" value={appraisalForm.overall_score} onChange={(e) => af('overall_score', e.target.value)} placeholder="e.g. 4.2" />
          </div>
          <div>
            <label className="triumph-label">Status</label>
            <select className="triumph-input" value={appraisalForm.status} onChange={(e) => af('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="finalized">Finalized</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="triumph-label">Strengths</label>
            <textarea className="triumph-input resize-none" rows={2} value={appraisalForm.strengths} onChange={(e) => af('strengths', e.target.value)} placeholder="Key strengths…" />
          </div>
          <div className="sm:col-span-2">
            <label className="triumph-label">Areas for Improvement</label>
            <textarea className="triumph-input resize-none" rows={2} value={appraisalForm.improvements} onChange={(e) => af('improvements', e.target.value)} placeholder="Areas to improve…" />
          </div>
          <div className="sm:col-span-2">
            <label className="triumph-label">Goals</label>
            <textarea className="triumph-input resize-none" rows={2} value={appraisalForm.goals} onChange={(e) => af('goals', e.target.value)} placeholder="Goals for next period…" />
          </div>
        </div>

        {/* Dynamic KPI Scores */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <div className="flex items-center justify-between mb-2">
            <label className="triumph-label !mb-0">KPI Scores</label>
            <button
              type="button"
              onClick={addScoreRow}
              className="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1"
            >
              <Plus size={12} /> Add Row
            </button>
          </div>
          {appraisalForm.scores.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-[var(--dark-text-3)]">No KPI scores. Click &quot;Add Row&quot; to add scores.</p>
          )}
          {appraisalForm.scores.map((row, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <input
                className="triumph-input flex-1"
                placeholder="KPI Name"
                value={row.kpi_name}
                onChange={(e) => updateScore(i, 'kpi_name', e.target.value)}
              />
              <input
                type="number"
                className="triumph-input w-20"
                placeholder="Target"
                value={row.target}
                onChange={(e) => updateScore(i, 'target', e.target.value)}
              />
              <input
                type="number"
                className="triumph-input w-20"
                placeholder="Actual"
                value={row.actual}
                onChange={(e) => updateScore(i, 'actual', e.target.value)}
              />
              <input
                type="number"
                className="triumph-input w-20"
                placeholder="Score"
                value={row.score}
                min="0" max="5" step="0.1"
                onChange={(e) => updateScore(i, 'score', e.target.value)}
              />
              <input
                type="number"
                className="triumph-input w-20"
                placeholder="Weight %"
                value={row.weight}
                min="0" max="100"
                onChange={(e) => updateScore(i, 'weight', e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeScoreRow(i)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setAppraisalFormOpen(false)}>Cancel</Button>
          {editAppraisal && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => { setAppraisalFormOpen(false); setDeleteType('appraisal'); setDeleteTarget(editAppraisal); }}
              icon={<Trash2 size={12} />}
            >
              Delete
            </Button>
          )}
          <Button size="sm" onClick={handleSaveAppraisal} loading={appraisalSaving}>
            {editAppraisal ? 'Save Changes' : 'Create Appraisal'}
          </Button>
        </div>
      </Modal>

      {/* ══════════════════════════════════════ DEFINITION FORM MODAL ══════════════════════════════════════ */}
      <Modal open={defFormOpen} onClose={() => setDefFormOpen(false)} title={editDef ? 'Edit KPI Definition' : 'New KPI Definition'}>
        <div className="space-y-4">
          <div>
            <label className="triumph-label">Name *</label>
            <input className="triumph-input" value={defForm.name} onChange={(e) => df('name', e.target.value)} placeholder="e.g. Output Per Hour" />
          </div>
          <div>
            <label className="triumph-label">Description</label>
            <textarea className="triumph-input resize-none" rows={2} value={defForm.description} onChange={(e) => df('description', e.target.value)} placeholder="What this KPI measures…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="triumph-label">Unit</label>
              <input className="triumph-input" value={defForm.unit} onChange={(e) => df('unit', e.target.value)} placeholder="e.g. pairs/hr, %, count" />
            </div>
            <div>
              <label className="triumph-label">Category</label>
              <select className="triumph-input" value={defForm.category} onChange={(e) => df('category', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={defForm.is_active}
                onChange={(e) => df('is_active', e.target.checked)}
                className="accent-amber-500 w-4 h-4"
              />
              <span className="text-sm text-slate-700 dark:text-[var(--dark-text-2)]">Active</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setDefFormOpen(false)}>Cancel</Button>
          {editDef && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => { setDefFormOpen(false); setDeleteType('definition'); setDeleteTarget(editDef); }}
              icon={<Trash2 size={12} />}
            >
              Delete
            </Button>
          )}
          <Button size="sm" onClick={handleSaveDef} loading={defSaving}>
            {editDef ? 'Save Changes' : 'Create KPI'}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        variant="danger"
        title={`Delete ${deleteType.charAt(0).toUpperCase() + deleteType.slice(1)}?`}
        message={
          deleteType === 'definition'
            ? `This will permanently delete KPI definition "${deleteTarget?.name ?? ''}". This action cannot be undone.`
            : deleteType === 'appraisal'
              ? `This will permanently delete the appraisal for ${deleteTarget?.employee_name ?? 'this employee'}. This action cannot be undone.`
              : `This will permanently delete this KPI target. This action cannot be undone.`
        }
        confirmLabel={`Delete ${deleteType.charAt(0).toUpperCase() + deleteType.slice(1)}`}
        loading={deleting}
      />
    </div>
  );
}

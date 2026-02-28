'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Plus, Calendar, List, LayoutTemplate, ChevronLeft, ChevronRight,
  Pencil, Trash2, Clock, Users, CheckCircle2, XCircle,
  CalendarDays, Search, SlidersHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';

/* ────────────────────────────────────── constants ── */
const PAGE_SIZE = 15;
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Tab = 'calendar' | 'list' | 'templates';

type AssignmentForm = {
  employee_id: string;
  shift_id: string;
  machine_id: string;
  shift_date: string;
  status: string;
  notes: string;
};

type BulkForm = {
  employee_ids: string[];
  shift_id: string;
  machine_id: string;
  date_from: string;
  date_to: string;
  notes: string;
};

type TemplateForm = {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  break_mins: string;
  color: string;
  is_active: boolean;
};

const EMPTY_FORM: AssignmentForm = {
  employee_id: '', shift_id: '', machine_id: '', shift_date: '', status: 'scheduled', notes: '',
};

const EMPTY_BULK: BulkForm = {
  employee_ids: [], shift_id: '', machine_id: '', date_from: '', date_to: '', notes: '',
};

const STATUS_OPTIONS = ['scheduled', 'checked_in', 'completed', 'absent', 'swapped'];

type BadgeColor = 'red' | 'purple' | 'blue' | 'gray' | 'amber' | 'green';

const statusBadge = (s: string) => {
  const map: Record<string, BadgeColor> = {
    scheduled: 'blue', checked_in: 'amber', completed: 'green', absent: 'red', swapped: 'purple',
  };
  return <Badge label={s.replace(/_/g, ' ')} color={map[s] ?? 'gray'} />;
};

/* ────────────────────── helpers ────────────────────── */
function getMonday(d: Date) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  dt.setDate(diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function addDays(d: Date, n: number) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getWeekDays(mondayStr: string) {
  const mon = new Date(mondayStr + 'T00:00:00');
  return Array.from({ length: 7 }, (_, i) => {
    const dt = addDays(mon, i);
    return { date: toISO(dt), dayName: DAY_NAMES[i], dayNum: dt.getDate(), month: dt.toLocaleString('default', { month: 'short' }) };
  });
}

function formatTime(t: string | null) {
  if (!t) return '';
  return t.slice(0, 5); // HH:MM
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════ */
export default function ShiftsPage() {
  /* ── tab / navigation state ── */
  const [tab, setTab] = useState<Tab>('calendar');
  const [weekStart, setWeekStart] = useState(() => toISO(getMonday(new Date())));

  /* ── calendar state ── */
  const [calendarData, setCalendarData] = useState<Record<string, any[]>>({});
  const [calLoading, setCalLoading] = useState(false);

  /* ── list state ── */
  const [listData, setListData] = useState<any[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listSummary, setListSummary] = useState<any>(null);
  const [listSearch, setListSearch] = useState('');
  const [listFrom, setListFrom] = useState('');
  const [listTo, setListTo] = useState('');
  const [listPage, setListPage] = useState(1);
  const [listLoading, setListLoading] = useState(false);

  /* ── templates state ── */
  const [templates, setTemplates] = useState<any[]>([]);
  const [tplLoading, setTplLoading] = useState(false);

  /* ── meta (dropdowns) ── */
  const [metaTemplates, setMetaTemplates] = useState<any[]>([]);
  const [metaEmployees, setMetaEmployees] = useState<any[]>([]);
  const [metaMachines, setMetaMachines] = useState<any[]>([]);

  /* ── form modal (assignment) ── */
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<AssignmentForm>({ ...EMPTY_FORM });
  const [isBulk, setIsBulk] = useState(false);
  const [bulkForm, setBulkForm] = useState<BulkForm>({ ...EMPTY_BULK });
  const [saving, setSaving] = useState(false);

  /* ── template edit modal ── */
  const [tplEditOpen, setTplEditOpen] = useState(false);
  const [tplForm, setTplForm] = useState<TemplateForm | null>(null);
  const [tplSaving, setTplSaving] = useState(false);

  /* ── delete confirm ── */
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  /* ── load meta ── */
  useEffect(() => {
    fetch('/api/shifts?meta=1')
      .then((r) => r.json())
      .then((j) => {
        setMetaTemplates(j.templates ?? []);
        setMetaEmployees(j.employees ?? []);
        setMetaMachines(j.machines ?? []);
        setTemplates(j.templates ?? []);
      })
      .catch(() => toast.error('Load Error', 'Could not load shift metadata.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── calendar fetch ── */
  const fetchCalendar = useCallback(async () => {
    setCalLoading(true);
    try {
      const res = await fetch(`/api/shifts?week=${weekStart}`);
      const json = await res.json();
      setCalendarData(json.data ?? {});
    } catch {
      toast.error('Error', 'Could not load calendar data.');
    } finally {
      setCalLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  useEffect(() => {
    if (tab === 'calendar') fetchCalendar();
  }, [tab, fetchCalendar]);

  /* ── list fetch ── */
  const fetchList = useCallback(async () => {
    setListLoading(true);
    const qs = new URLSearchParams({
      page: String(listPage), limit: String(PAGE_SIZE), search: listSearch,
    });
    if (listFrom) qs.set('from', listFrom);
    if (listTo) qs.set('to', listTo);
    try {
      const res = await fetch(`/api/shifts?${qs}`);
      const json = await res.json();
      setListData(json.data ?? []);
      setListTotal(json.total ?? 0);
      setListSummary(json.summary ?? null);
    } catch {
      toast.error('Error', 'Could not load shift list.');
    } finally {
      setListLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listPage, listSearch, listFrom, listTo]);

  useEffect(() => {
    if (tab === 'list') fetchList();
  }, [tab, fetchList]);

  /* ── templates fetch ── */
  const fetchTemplates = useCallback(async () => {
    setTplLoading(true);
    try {
      const res = await fetch('/api/shifts?meta=1');
      const json = await res.json();
      setTemplates(json.templates ?? []);
    } catch {
      toast.error('Error', 'Could not load templates.');
    } finally {
      setTplLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === 'templates') fetchTemplates();
  }, [tab, fetchTemplates]);

  /* ── week navigation ── */
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const goWeek = (dir: -1 | 1) => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(toISO(d));
  };

  const goToday = () => setWeekStart(toISO(getMonday(new Date())));

  /* ── assignment form handlers ── */
  const openAdd = (prefillDate?: string) => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, shift_date: prefillDate ?? '' });
    setIsBulk(false);
    setBulkForm({ ...EMPTY_BULK, date_from: prefillDate ?? '', date_to: prefillDate ?? '' });
    setFormOpen(true);
  };

  const openEdit = (row: any) => {
    setEditItem(row);
    setIsBulk(false);
    setForm({
      employee_id: row.employee_id ? String(row.employee_id) : '',
      shift_id: row.shift_id ? String(row.shift_id) : '',
      machine_id: row.machine_id ? String(row.machine_id) : '',
      shift_date: row.shift_date ? String(row.shift_date).slice(0, 10) : '',
      status: row.status ?? 'scheduled',
      notes: row.notes ?? '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (isBulk) {
      if (!bulkForm.employee_ids.length) { toast.warning('Validation', 'Select at least one employee.'); return; }
      if (!bulkForm.shift_id) { toast.warning('Validation', 'Select a shift template.'); return; }
      if (!bulkForm.date_from || !bulkForm.date_to) { toast.warning('Validation', 'Set date range.'); return; }

      setSaving(true);
      try {
        // build all assignments
        const assignments: any[] = [];
        const from = new Date(bulkForm.date_from + 'T00:00:00');
        const to = new Date(bulkForm.date_to + 'T00:00:00');
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          for (const empId of bulkForm.employee_ids) {
            assignments.push({
              employee_id: parseInt(empId),
              shift_id: parseInt(bulkForm.shift_id),
              machine_id: bulkForm.machine_id ? parseInt(bulkForm.machine_id) : null,
              shift_date: toISO(d),
              status: 'scheduled',
              notes: bulkForm.notes,
            });
          }
        }
        const res = await fetch('/api/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignments }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed');
        toast.success('Created', `${json.inserted ?? assignments.length} assignments created.`);
        setFormOpen(false);
        refresh();
      } catch (err: any) {
        toast.error('Error', err.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    // single save
    if (!form.employee_id) { toast.warning('Validation', 'Select an employee.'); return; }
    if (!form.shift_id) { toast.warning('Validation', 'Select a shift template.'); return; }
    if (!form.shift_date) { toast.warning('Validation', 'Select a date.'); return; }

    setSaving(true);
    try {
      const payload: any = {
        employee_id: parseInt(form.employee_id),
        shift_id: parseInt(form.shift_id),
        machine_id: form.machine_id ? parseInt(form.machine_id) : null,
        shift_date: form.shift_date,
        status: form.status,
        notes: form.notes,
      };
      if (editItem) payload.id = editItem.id;

      const res = await fetch('/api/shifts', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      toast.success(editItem ? 'Updated' : 'Created', `Shift assignment ${editItem ? 'updated' : 'created'}.`);
      setFormOpen(false);
      refresh();
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/shifts?id=${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      toast.success('Deleted', 'Shift assignment deleted.');
      setDeleteTarget(null);
      refresh();
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setDeleting(false);
    }
  };

  /* ── template edit ── */
  const openTplEdit = (tpl: any) => {
    setTplForm({
      id: tpl.id,
      name: tpl.name ?? '',
      start_time: tpl.start_time ? tpl.start_time.slice(0, 5) : '',
      end_time: tpl.end_time ? tpl.end_time.slice(0, 5) : '',
      break_mins: tpl.break_mins != null ? String(tpl.break_mins) : '0',
      color: tpl.color ?? '#3b82f6',
      is_active: tpl.is_active !== false,
    });
    setTplEditOpen(true);
  };

  const handleTplSave = async () => {
    if (!tplForm) return;
    setTplSaving(true);
    try {
      const res = await fetch('/api/shifts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'template', ...tplForm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      toast.success('Updated', 'Shift template updated.');
      setTplEditOpen(false);
      fetchTemplates();
      // refresh meta
      fetch('/api/shifts?meta=1').then(r => r.json()).then(j => setMetaTemplates(j.templates ?? []));
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setTplSaving(false);
    }
  };

  /* ── refresh helper ── */
  const refresh = () => {
    if (tab === 'calendar') fetchCalendar();
    if (tab === 'list') fetchList();
  };

  /* ── bulk employee toggle ── */
  const toggleBulkEmployee = (id: string) => {
    setBulkForm(prev => ({
      ...prev,
      employee_ids: prev.employee_ids.includes(id)
        ? prev.employee_ids.filter(e => e !== id)
        : [...prev.employee_ids, id],
    }));
  };

  /* ── list table columns ── */
  const listColumns: Column[] = [
    {
      key: 'shift_date', label: 'Date', sortable: true, width: '110px',
      render: (r: any) => formatDate(String(r.shift_date).slice(0, 10)),
    },
    { key: 'employee_name', label: 'Employee', sortable: true },
    {
      key: 'shift_name', label: 'Shift', sortable: true,
      render: (r: any) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color ?? '#94a3b8' }} />
          {r.shift_name ?? '—'}
        </span>
      ),
    },
    { key: 'machine_name', label: 'Machine', render: (r: any) => r.machine_name ?? '—' },
    { key: 'status', label: 'Status', render: (r: any) => statusBadge(r.status) },
    {
      key: 'actions', label: '', width: '90px', align: 'right',
      render: (r: any) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => openEdit(r)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400" title="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={() => setDeleteTarget(r)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 anim-fade-up">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Shift Scheduling</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage shift assignments, calendar &amp; templates</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => openAdd()}>Add Assignment</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-[var(--dark-surface)] rounded-lg p-1 w-fit anim-fade-up anim-d1">
        {([
          { key: 'calendar' as Tab, label: 'Calendar', icon: Calendar },
          { key: 'list' as Tab, label: 'List', icon: List },
          { key: 'templates' as Tab, label: 'Templates', icon: LayoutTemplate },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${tab === t.key
                ? 'bg-white dark:bg-[var(--dark-card)] text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}
            `}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ CALENDAR TAB ══════════ */}
      {tab === 'calendar' && (
        <div className="space-y-4 anim-fade-up anim-d2">
          {/* Week navigator */}
          <div className="flex items-center gap-3 triumph-card p-3">
            <Button variant="ghost" size="sm" onClick={() => goWeek(-1)} icon={<ChevronLeft size={15} />} />
            <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
            <Button variant="ghost" size="sm" onClick={() => goWeek(1)} icon={<ChevronRight size={15} />} />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 ml-2">
              {formatDate(weekDays[0].date, 'dd MMM')} — {formatDate(weekDays[6].date, 'dd MMM yyyy')}
            </span>
          </div>

          {/* Calendar grid */}
          {calLoading ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">Loading calendar…</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(day => {
                const isToday = day.date === toISO(new Date());
                const assignments = calendarData[day.date] ?? [];
                return (
                  <div key={day.date} className="flex flex-col">
                    {/* Day header */}
                    <div
                      className={`
                        text-center text-xs font-semibold py-2 rounded-t-lg
                        ${isToday
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-gray-50 text-gray-600 dark:bg-[var(--dark-surface)] dark:text-gray-400'}
                      `}
                    >
                      <div>{day.dayName}</div>
                      <div className="text-base font-bold mt-0.5">{day.dayNum}</div>
                      <div className="text-[0.6rem] uppercase tracking-wide">{day.month}</div>
                    </div>
                    {/* Assignments */}
                    <div className="triumph-card rounded-t-none min-h-[140px] flex flex-col gap-1.5 p-2">
                      {assignments.map((a: any) => (
                        <button
                          key={a.id}
                          onClick={() => openEdit(a)}
                          className="w-full text-left p-1.5 rounded-md text-[0.65rem] leading-snug transition-colors hover:bg-gray-50 dark:hover:bg-white/5 border-l-[3px]"
                          style={{ borderLeftColor: a.color ?? '#94a3b8' }}
                        >
                          <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">{a.employee_name}</div>
                          <div className="text-gray-500 dark:text-gray-400 truncate">{a.shift_name} • {formatTime(a.start_time)}–{formatTime(a.end_time)}</div>
                          {a.machine_name && <div className="text-gray-400 dark:text-gray-500 truncate">🏭 {a.machine_name}</div>}
                        </button>
                      ))}
                      {/* Add button */}
                      <button
                        onClick={() => openAdd(day.date)}
                        className="w-full mt-auto py-1.5 rounded-md border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-amber-400 hover:text-amber-500 dark:hover:border-amber-500 dark:hover:text-amber-400 transition-colors text-xs flex items-center justify-center gap-1"
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════ LIST TAB ══════════ */}
      {tab === 'list' && (
        <div className="space-y-4 anim-fade-up anim-d2">
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Scheduled"
              value={
                (parseInt(listSummary?.scheduled ?? '0') +
                  parseInt(listSummary?.checked_in ?? '0') +
                  parseInt(listSummary?.completed ?? '0') +
                  parseInt(listSummary?.absent ?? '0'))
              }
              icon={CalendarDays}
              iconColor="blue"
              description="This month"
              animDelay="anim-d1"
            />
            <StatCard
              title="Checked In"
              value={parseInt(listSummary?.checked_in ?? '0')}
              icon={Users}
              iconColor="amber"
              animDelay="anim-d2"
            />
            <StatCard
              title="Completed"
              value={parseInt(listSummary?.completed ?? '0')}
              icon={CheckCircle2}
              iconColor="green"
              animDelay="anim-d3"
            />
            <StatCard
              title="Absent"
              value={parseInt(listSummary?.absent ?? '0')}
              icon={XCircle}
              iconColor="red"
              animDelay="anim-d4"
            />
          </div>

          {/* Filters toolbar */}
          <div className="triumph-card p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <SlidersHorizontal size={13} />
                <span>Filters:</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="triumph-label text-xs">From</label>
                <input
                  type="date"
                  value={listFrom}
                  onChange={e => { setListFrom(e.target.value); setListPage(1); }}
                  className="triumph-input text-xs py-1 px-2 w-[130px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="triumph-label text-xs">To</label>
                <input
                  type="date"
                  value={listTo}
                  onChange={e => { setListTo(e.target.value); setListPage(1); }}
                  className="triumph-input text-xs py-1 px-2 w-[130px]"
                />
              </div>
              {(listFrom || listTo) && (
                <Button variant="ghost" size="xs" onClick={() => { setListFrom(''); setListTo(''); setListPage(1); }}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Data table */}
          <Card noPad>
            <DataTable
              columns={listColumns}
              data={listData}
              total={listTotal}
              page={listPage}
              pageSize={PAGE_SIZE}
              loading={listLoading}
              search={listSearch}
              onSearchChange={(v) => { setListSearch(v); setListPage(1); }}
              onPageChange={setListPage}
              onRowDoubleClick={openEdit}
              searchPlaceholder="Search employees…"
              emptyIcon="📅"
              emptyText="No shift assignments found."
              toolbar={
                <Button size="sm" icon={<Plus size={14} />} onClick={() => openAdd()}>
                  Add Assignment
                </Button>
              }
            />
          </Card>
        </div>
      )}

      {/* ══════════ TEMPLATES TAB ══════════ */}
      {tab === 'templates' && (
        <div className="space-y-4 anim-fade-up anim-d2">
          {tplLoading ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">Loading templates…</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">No shift templates found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl: any, idx: number) => (
                <div key={tpl.id} className={`triumph-card p-4 anim-fade-up anim-d${Math.min(idx + 1, 5)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: tpl.color ?? '#94a3b8' }} />
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{tpl.name}</h3>
                    </div>
                    <Badge label={tpl.is_active !== false ? 'Active' : 'Inactive'} color={tpl.is_active !== false ? 'green' : 'gray'} />
                  </div>
                  <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Clock size={12} />
                      <span>{formatTime(tpl.start_time)} — {formatTime(tpl.end_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 dark:text-gray-600">☕</span>
                      <span>{tpl.break_mins ?? 0} min break</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <Button variant="ghost" size="xs" icon={<Pencil size={12} />} onClick={() => openTplEdit(tpl)}>
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ ASSIGNMENT FORM MODAL ══════════ */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Assignment' : 'Add Assignment'} size={isBulk ? 'lg' : 'md'}>
        {/* Bulk toggle (only for new) */}
        {!editItem && (
          <div className="flex items-center gap-2 mb-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isBulk} onChange={e => setIsBulk(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm peer-checked:bg-amber-500" />
            </label>
            <span className="text-xs text-gray-600 dark:text-gray-400">Bulk assignment</span>
          </div>
        )}

        {isBulk && !editItem ? (
          /* ── Bulk form ── */
          <div className="space-y-4">
            {/* Employees multi-select */}
            <div>
              <label className="triumph-label mb-1.5 block">Employees *</label>
              <div className="triumph-card max-h-[180px] overflow-y-auto p-2 space-y-1">
                {metaEmployees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={bulkForm.employee_ids.includes(String(emp.id))}
                      onChange={() => toggleBulkEmployee(String(emp.id))}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-800"
                    />
                    {emp.name}
                  </label>
                ))}
                {metaEmployees.length === 0 && (
                  <div className="text-xs text-gray-400 py-2 text-center">No employees found</div>
                )}
              </div>
              <div className="text-[0.65rem] text-gray-400 mt-1">{bulkForm.employee_ids.length} selected</div>
            </div>

            {/* Shift template */}
            <div>
              <label className="triumph-label mb-1">Shift Template *</label>
              <select
                value={bulkForm.shift_id}
                onChange={e => setBulkForm(p => ({ ...p, shift_id: e.target.value }))}
                className="triumph-input w-full text-sm"
              >
                <option value="">— Select —</option>
                {metaTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({formatTime(t.start_time)}–{formatTime(t.end_time)})</option>
                ))}
              </select>
            </div>

            {/* Machine */}
            <div>
              <label className="triumph-label mb-1">Machine</label>
              <select
                value={bulkForm.machine_id}
                onChange={e => setBulkForm(p => ({ ...p, machine_id: e.target.value }))}
                className="triumph-input w-full text-sm"
              >
                <option value="">— None —</option>
                {metaMachines.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="triumph-label mb-1">From *</label>
                <input
                  type="date"
                  value={bulkForm.date_from}
                  onChange={e => setBulkForm(p => ({ ...p, date_from: e.target.value }))}
                  className="triumph-input w-full text-sm"
                />
              </div>
              <div>
                <label className="triumph-label mb-1">To *</label>
                <input
                  type="date"
                  value={bulkForm.date_to}
                  onChange={e => setBulkForm(p => ({ ...p, date_to: e.target.value }))}
                  className="triumph-input w-full text-sm"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="triumph-label mb-1">Notes</label>
              <textarea
                value={bulkForm.notes}
                onChange={e => setBulkForm(p => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="triumph-input w-full text-sm"
              />
            </div>
          </div>
        ) : (
          /* ── Single form ── */
          <div className="space-y-4">
            {/* Employee */}
            <div>
              <label className="triumph-label mb-1">Employee *</label>
              <select
                value={form.employee_id}
                onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}
                className="triumph-input w-full text-sm"
              >
                <option value="">— Select —</option>
                {metaEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            {/* Shift template */}
            <div>
              <label className="triumph-label mb-1">Shift Template *</label>
              <select
                value={form.shift_id}
                onChange={e => setForm(p => ({ ...p, shift_id: e.target.value }))}
                className="triumph-input w-full text-sm"
              >
                <option value="">— Select —</option>
                {metaTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({formatTime(t.start_time)}–{formatTime(t.end_time)})</option>
                ))}
              </select>
            </div>

            {/* Machine */}
            <div>
              <label className="triumph-label mb-1">Machine</label>
              <select
                value={form.machine_id}
                onChange={e => setForm(p => ({ ...p, machine_id: e.target.value }))}
                className="triumph-input w-full text-sm"
              >
                <option value="">— None —</option>
                {metaMachines.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="triumph-label mb-1">Date *</label>
              <input
                type="date"
                value={form.shift_date}
                onChange={e => setForm(p => ({ ...p, shift_date: e.target.value }))}
                className="triumph-input w-full text-sm"
              />
            </div>

            {/* Status */}
            <div>
              <label className="triumph-label mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="triumph-input w-full text-sm"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="triumph-label mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="triumph-input w-full text-sm"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button size="sm" loading={saving} onClick={handleSave}>
            {editItem ? 'Update' : isBulk ? 'Create Bulk' : 'Create'}
          </Button>
        </div>
      </Modal>

      {/* ══════════ TEMPLATE EDIT MODAL ══════════ */}
      <Modal open={tplEditOpen} onClose={() => setTplEditOpen(false)} title="Edit Shift Template">
        {tplForm && (
          <>
            <div className="space-y-4">
              <div>
                <label className="triumph-label mb-1">Name</label>
                <input
                  type="text"
                  value={tplForm.name}
                  onChange={e => setTplForm(p => p ? { ...p, name: e.target.value } : p)}
                  className="triumph-input w-full text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="triumph-label mb-1">Start Time</label>
                  <input
                    type="time"
                    value={tplForm.start_time}
                    onChange={e => setTplForm(p => p ? { ...p, start_time: e.target.value } : p)}
                    className="triumph-input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="triumph-label mb-1">End Time</label>
                  <input
                    type="time"
                    value={tplForm.end_time}
                    onChange={e => setTplForm(p => p ? { ...p, end_time: e.target.value } : p)}
                    className="triumph-input w-full text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="triumph-label mb-1">Break (mins)</label>
                  <input
                    type="number"
                    value={tplForm.break_mins}
                    onChange={e => setTplForm(p => p ? { ...p, break_mins: e.target.value } : p)}
                    className="triumph-input w-full text-sm"
                    min={0}
                  />
                </div>
                <div>
                  <label className="triumph-label mb-1">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={tplForm.color}
                      onChange={e => setTplForm(p => p ? { ...p, color: e.target.value } : p)}
                      className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={tplForm.color}
                      onChange={e => setTplForm(p => p ? { ...p, color: e.target.value } : p)}
                      className="triumph-input flex-1 text-sm"
                      placeholder="#hex"
                    />
                  </div>
                </div>
              </div>
              {/* Active toggle */}
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tplForm.is_active}
                    onChange={e => setTplForm(p => p ? { ...p, is_active: e.target.checked } : p)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm peer-checked:bg-amber-500" />
                </label>
                <span className="text-xs text-gray-600 dark:text-gray-400">Active</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
              <Button variant="outline" size="sm" onClick={() => setTplEditOpen(false)}>Cancel</Button>
              <Button size="sm" loading={tplSaving} onClick={handleTplSave}>Update Template</Button>
            </div>
          </>
        )}
      </Modal>

      {/* ══════════ DELETE CONFIRM ══════════ */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Assignment"
        message={`Delete shift assignment for ${deleteTarget?.employee_name ?? 'this employee'} on ${deleteTarget?.shift_date ? formatDate(String(deleteTarget.shift_date).slice(0, 10)) : ''}?`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

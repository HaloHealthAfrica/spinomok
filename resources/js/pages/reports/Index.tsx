import React, { useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Plus, ClipboardList, ChevronRight, CheckCircle, Clock, BarChart2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';
import type { DailyReport, PageProps } from '@/types';
import { formatDate, formatKES, formatLitres } from '@/utils/format';

interface ReportsIndexProps extends PageProps {
  reports: {
    data: DailyReport[];
    meta: { total: number; current_page: number; last_page: number };
  };
  today_report: DailyReport | null;
}

const TABS = ['Daily', 'Weekly', 'Monthly'] as const;
type Tab = typeof TABS[number];

export default function ReportsIndex() {
  const { reports, today_report } = usePage<ReportsIndexProps>().props;
  const [activeTab, setActiveTab] = useState<Tab>('Daily');
  const today = new Date().toISOString().split('T')[0];
  const weeklySummaries = useMemo(() => summarizeReports(reports.data, 'week'), [reports.data]);
  const monthlySummaries = useMemo(() => summarizeReports(reports.data, 'month'), [reports.data]);

  return (
    <AppLayout title="Reports">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-4">
          <h1 className="text-white text-xl font-bold">Reports</h1>
          <button
            onClick={() => router.visit('/reports/daily/new')}
            className="flex items-center gap-1.5 bg-accent-500 text-white px-3 py-2 rounded-full text-sm font-medium"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            New Report
          </button>
        </div>
      </div>

      {/* Quick links row */}
      <div className="px-4 py-2 flex gap-2 bg-white border-b border-gray-100">
        <button
          onClick={() => router.visit('/milk-sales')}
          className="flex items-center gap-1.5 text-xs font-medium text-primary-900 bg-primary-50 px-3 py-1.5 rounded-full"
        >
          🥛 Milk Sales
        </button>
        <button
          onClick={() => router.visit('/analytics')}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full"
        >
          📊 Analytics
        </button>
      </div>

      <div className="flex bg-white border-b border-gray-100">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab ? 'text-primary-900 border-primary-900' : 'text-gray-500 border-transparent',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3">
        <TodayBanner report={today_report} date={today} />

        {activeTab === 'Daily' && (
          <>
            {reports.data.length === 0 ? (
              <EmptyReports />
            ) : (
              reports.data.map((report) => <ReportCard key={report.id} report={report} />)
            )}
          </>
        )}

        {activeTab === 'Weekly' && (
          <SummaryList
            summaries={weeklySummaries}
            emptyLabel="No weekly summaries yet"
            emptyText="Submit daily reports and weekly totals will appear here automatically."
          />
        )}

        {activeTab === 'Monthly' && (
          <SummaryList
            summaries={monthlySummaries}
            emptyLabel="No monthly summaries yet"
            emptyText="Submit daily reports and monthly totals will appear here automatically."
          />
        )}
      </div>
    </AppLayout>
  );
}

function TodayBanner({ report, date }: { report: DailyReport | null; date: string }) {
  if (!report) {
    return (
      <button onClick={() => router.visit('/reports/daily/new')} className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-left">
        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <ClipboardList className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">Daily Report Not Started</p>
          <p className="text-xs text-amber-600 mt-0.5">Tap to start today's report / {formatDate(date)}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-amber-400" />
      </button>
    );
  }

  if (report.status === 'draft') {
    return (
      <button onClick={() => router.visit('/reports/daily/new')} className="w-full bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 text-left">
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Clock className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900">Draft Report / Step {report.draft_step ?? 1} of 5</p>
          <p className="text-xs text-blue-600 mt-0.5">Tap to continue today's report</p>
        </div>
        <ChevronRight className="h-4 w-4 text-blue-400" />
      </button>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <CheckCircle className="h-5 w-5 text-green-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-green-900">Today's Report Submitted</p>
        <p className="text-xs text-green-600 mt-0.5">
          {report.total_milk_litres ? formatLitres(report.total_milk_litres) : '-'} / {report.milk_revenue ? formatKES(report.milk_revenue) : '-'}
        </p>
      </div>
    </div>
  );
}

function ReportCard({ report }: { report: DailyReport }) {
  const isSubmitted = report.status === 'submitted';

  return (
    <Card onClick={() => isSubmitted ? router.visit(`/reports/daily/${report.id}`) : router.visit('/reports/daily/new')} className="flex items-center gap-3">
      <div className={clsx('h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0', isSubmitted ? 'bg-green-100' : 'bg-amber-100')}>
        {isSubmitted ? <CheckCircle className="h-5 w-5 text-green-600" /> : <Clock className="h-5 w-5 text-amber-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{formatDate(report.report_date)}</p>
          <Badge variant={isSubmitted ? 'success' : 'warning'} size="sm">{isSubmitted ? 'Submitted' : 'Draft'}</Badge>
        </div>
        {isSubmitted && (
          <p className="text-xs text-gray-500 mt-0.5">
            {report.total_milk_litres ? formatLitres(report.total_milk_litres) : '-'} produced
            {report.milk_revenue ? ` / ${formatKES(report.milk_revenue)} revenue` : ''}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
    </Card>
  );
}

function EmptyReports() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <ClipboardList className="h-10 w-10 text-gray-300 mb-3" />
      <h3 className="text-base font-semibold text-gray-800">No Reports Yet</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-[220px]">Start your first daily report to see your farm data here.</p>
      <button onClick={() => router.visit('/reports/daily/new')} className="mt-4 px-5 py-2.5 bg-primary-900 text-white rounded-xl text-sm font-medium">
        Start First Report
      </button>
    </div>
  );
}

interface PeriodSummary {
  key: string;
  label: string;
  reports: number;
  milk: number;
  revenue: number;
  feedCost: number;
  healthEvents: number;
}

function summarizeReports(reports: DailyReport[], mode: 'week' | 'month'): PeriodSummary[] {
  const groups = new Map<string, PeriodSummary>();

  reports.filter(report => report.status === 'submitted').forEach(report => {
    const date = new Date(report.report_date);
    const key = mode === 'month' ? monthKey(date) : weekKey(date);
    const existing = groups.get(key) ?? {
      key,
      label: mode === 'month'
        ? date.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })
        : `Week of ${formatDate(startOfWeek(date).toISOString().slice(0, 10))}`,
      reports: 0,
      milk: 0,
      revenue: 0,
      feedCost: 0,
      healthEvents: 0,
    };

    existing.reports += 1;
    existing.milk += Number(report.total_milk_litres ?? 0);
    existing.revenue += Number(report.milk_revenue ?? 0);
    existing.feedCost += Number(report.total_feed_cost ?? 0);
    existing.healthEvents += Number(report.health_events_count ?? 0);
    groups.set(key, existing);
  });

  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day + (day === 0 ? -6 : 1));
  return copy;
}

function weekKey(date: Date): string {
  return startOfWeek(date).toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function SummaryList({ summaries, emptyLabel, emptyText }: { summaries: PeriodSummary[]; emptyLabel: string; emptyText: string }) {
  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BarChart2 className="h-10 w-10 text-gray-300 mb-3" />
        <h3 className="text-base font-semibold text-gray-800">{emptyLabel}</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-[240px]">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {summaries.map(summary => (
        <Card key={summary.key} className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{summary.label}</p>
              <p className="text-xs text-gray-500">{summary.reports} submitted {summary.reports === 1 ? 'report' : 'reports'}</p>
            </div>
            <Badge variant={summary.revenue >= summary.feedCost ? 'success' : 'warning'} size="sm">{formatKES(summary.revenue - summary.feedCost)}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Milk" value={formatLitres(summary.milk)} />
            <Metric label="Revenue" value={formatKES(summary.revenue)} />
            <Metric label="Health" value={String(summary.healthEvents)} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 text-xs font-bold text-gray-900">{value}</p>
    </div>
  );
}

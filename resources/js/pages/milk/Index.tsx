import React from 'react';
import { router, usePage } from '@inertiajs/react';
import { Plus, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { clsx } from 'clsx';
import type { PageProps, AnimalMilkRecord, DailyMilkSummary } from '@/types';
import { formatDate, formatKES } from '@/utils/format';

interface MilkIndexProps extends PageProps {
  date: string;
  summary: DailyMilkSummary;
  animal_records: AnimalMilkRecord[];
  trend: { date: string; total: number }[];
}

export default function MilkIndex() {
  const { date, summary, animal_records, trend } = usePage<MilkIndexProps>().props;

  const navigateDate = (direction: -1 | 1) => {
    const d = new Date(date);
    d.setDate(d.getDate() + direction);
    router.get('/milk-records', { date: d.toISOString().split('T')[0] }, {
      preserveState: true, only: ['date', 'summary', 'animal_records', 'trend'],
    });
  };

  const isPositive = summary.vs_yesterday_delta >= 0;

  return (
    <AppLayout title="Milk Production">
      {/* Header */}
      <div className="bg-primary-900 pt-safe-top px-4 pb-5">
        <div className="flex items-center justify-between pt-3 mb-4">
          <h1 className="text-white text-xl font-bold">Milk Production</h1>
          <button
            onClick={() => router.visit('/milk-records/create')}
            className="flex items-center gap-1.5 bg-accent-500 text-white px-3 py-2 rounded-full text-sm font-medium"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Record
          </button>
        </div>

        {/* Date navigator */}
        <div className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2">
          <button onClick={() => navigateDate(-1)} className="h-8 w-8 flex items-center justify-center text-white/70 hover:text-white">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-white font-semibold text-sm">{formatDate(date)}</p>
          <button
            onClick={() => navigateDate(1)}
            disabled={date >= new Date().toISOString().split('T')[0]}
            className="h-8 w-8 flex items-center justify-center text-white/70 hover:text-white disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Daily KPIs */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <KpiBox label="Total" value={`${summary.total_litres.toFixed(1)} L`} />
          <KpiBox label="Cows" value={`${summary.cows_milked}`} />
          <KpiBox
            label="vs Yesterday"
            value={`${isPositive ? '+' : ''}${summary.vs_yesterday_percent}%`}
            color={isPositive ? 'text-green-300' : 'text-red-300'}
            icon={isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          />
        </div>

        {/* Session breakdown */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: '🌅 Morning', value: summary.morning_litres },
            { label: '☀️ Midday',  value: summary.midday_litres  },
            { label: '🌆 Evening', value: summary.evening_litres },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-lg px-2 py-2 text-center">
              <p className="text-primary-200 text-xs">{s.label}</p>
              <p className="text-white text-sm font-bold">{s.value.toFixed(1)} L</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Trend sparkline (simple bar chart) */}
        {trend.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              7-Day Trend
            </h2>
            <Card padding="md">
              <TrendBars data={trend} />
            </Card>
          </section>
        )}

        {/* Per-animal breakdown */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Per Cow — {formatDate(date)}
          </h2>
          {animal_records.length === 0 ? (
            <Card className="text-center py-6">
              <p className="text-gray-500 text-sm">No milk records for this date.</p>
              <button
                onClick={() => router.visit('/milk-records/create')}
                className="mt-2 text-primary-900 text-sm font-medium underline"
              >
                Add records
              </button>
            </Card>
          ) : (
            <div className="space-y-2">
              {[...animal_records]
                .sort((a, b) => b.daily_total - a.daily_total)
                .map((ar) => (
                  <AnimalRow key={ar.animal_id} record={ar} />
                ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function KpiBox({ label, value, color = 'text-white', icon }: { label: string; value: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white/10 rounded-xl px-3 py-3 text-center">
      <p className="text-primary-200 text-xs mb-1">{label}</p>
      <div className={clsx('flex items-center justify-center gap-1 text-lg font-bold', color)}>
        {icon}
        <span>{value}</span>
      </div>
    </div>
  );
}

function TrendBars({ data }: { data: { date: string; total: number }[] }) {
  const max = Math.max(...data.map(d => d.total), 1);

  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d) => {
        const height = Math.max((d.total / max) * 100, 4);
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-primary-600 rounded-t-sm"
              style={{ height: `${height}%` }}
            />
            <span className="text-[9px] text-gray-400">
              {new Date(d.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'numeric' }).split('/')[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AnimalRow({ record }: { record: AnimalMilkRecord }) {
  const hasAm  = record.morning != null;
  const hasMd  = record.midday  != null;
  const hasPm  = record.evening != null;

  return (
    <Card padding="sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-primary-900">
            {(record.name ?? record.tag_number).slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{record.name ?? record.tag_number}</p>
          <div className="flex gap-3 mt-1">
            <SessionTag label="AM" value={record.morning?.litres} active={hasAm} />
            <SessionTag label="MD" value={record.midday?.litres}  active={hasMd} />
            <SessionTag label="PM" value={record.evening?.litres} active={hasPm} />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-base font-bold text-primary-900">{record.daily_total.toFixed(1)}</p>
          <p className="text-xs text-gray-400">litres</p>
        </div>
      </div>
    </Card>
  );
}

function SessionTag({ label, value, active }: { label: string; value?: number; active: boolean }) {
  if (!active) return <span className="text-xs text-gray-300">{label} —</span>;
  return (
    <span className="text-xs text-gray-600">
      {label} <strong className="text-gray-900">{value?.toFixed(1)}</strong>L
    </span>
  );
}

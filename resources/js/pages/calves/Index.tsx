import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
  Plus, Scale, TrendingUp, TrendingDown, Minus,
  ChevronRight, AlertTriangle, Trophy,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';
import type { PageProps, CalfKPIs, CalfSummary } from '@/types';
import { formatDate } from '@/utils/format';

interface CalvesIndexProps extends PageProps {
  kpis: CalfKPIs;
  calves: CalfSummary[];
  ranking: CalfSummary[];
}

const TABS = ['Calves & Heifers', 'Growth Ranking'] as const;
type Tab = typeof TABS[number];

export default function CalvesIndex() {
  const { kpis, calves, ranking } = usePage<CalvesIndexProps>().props;
  const [tab, setTab] = useState<Tab>('Calves & Heifers');

  return (
    <AppLayout title="Calf Growth">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-4">
          <h1 className="text-white text-xl font-bold">Calf & Heifer Growth</h1>
          <button
            onClick={() => router.visit('/weight/batch')}
            className="flex items-center gap-1.5 bg-accent-500 text-white px-3 py-2 rounded-full text-sm font-medium"
          >
            <Scale className="h-4 w-4" strokeWidth={2.5} />
            Weigh All
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-2">
          <KpiBox value={kpis.total_calves_heifers} label="Total" icon="🐄" />
          <KpiBox value={kpis.need_weighing} label="Need Weighing" icon="⚖️" alert={kpis.need_weighing > 0} />
          <KpiBox value={kpis.low_adg_alerts} label="Low Growth" icon="📉" alert={kpis.low_adg_alerts > 0} />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex bg-white border-b border-gray-100">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
              tab === t ? 'text-primary-900 border-primary-900' : 'text-gray-500 border-transparent')}>
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3">
        {tab === 'Calves & Heifers' && <CalvesList calves={calves} />}
        {tab === 'Growth Ranking'   && <GrowthRanking ranking={ranking} />}
      </div>

      {/* Quick actions */}
      <div className="sticky bottom-16 px-4 pb-3">
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 grid grid-cols-3 gap-2">
          {[
            { label: 'Record Weight', icon: Scale,      href: '/weight/record',    color: 'text-blue-600 bg-blue-50' },
            { label: 'Batch Weigh',   icon: TrendingUp, href: '/weight/batch',     color: 'text-primary-900 bg-primary-50' },
            { label: 'Calf Feeding',  icon: Plus,       href: '/calf-feeding/new', color: 'text-green-600 bg-green-50' },
          ].map(a => {
            const Icon = a.icon;
            return (
              <button key={a.href} onClick={() => router.visit(a.href)}
                className={clsx('flex flex-col items-center gap-1 rounded-xl py-3 active:opacity-70', a.color)}>
                <Icon className="h-5 w-5" />
                <span className="text-xs font-semibold text-center leading-tight">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

function CalvesList({ calves }: { calves: CalfSummary[] }) {
  if (calves.length === 0) {
    return (
      <Card className="text-center py-10">
        <p className="text-3xl mb-2">🐄</p>
        <p className="text-sm font-semibold text-gray-800">No calves or heifers</p>
        <p className="text-xs text-gray-500 mt-1">Calves are automatically added when calvings are recorded</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {calves.map(calf => <CalfCard key={calf.id} calf={calf} />)}
    </div>
  );
}

function CalfCard({ calf }: { calf: CalfSummary }) {
  const adgColor = {
    good: 'text-green-600',
    acceptable: 'text-amber-600',
    poor: 'text-red-600',
    unknown: 'text-gray-400',
  }[calf.adg_rating];

  const adgIcon = {
    good: <TrendingUp className="h-4 w-4 text-green-600" />,
    acceptable: <Minus className="h-4 w-4 text-amber-600" />,
    poor: <TrendingDown className="h-4 w-4 text-red-600" />,
    unknown: null,
  }[calf.adg_rating];

  const ageLabel = calf.age_weeks !== null
    ? calf.age_weeks < 4
      ? `${calf.age_days} days old`
      : calf.age_weeks < 52
      ? `${Math.floor(calf.age_weeks)} weeks old`
      : `${(calf.age_weeks / 52).toFixed(1)} yrs old`
    : 'Age unknown';

  return (
    <Card onClick={() => router.visit(`/calves/${calf.id}`)} className="flex items-start gap-3">
      {/* Avatar */}
      <div className={clsx(
        'h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold',
        calf.status === 'calf' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800',
      )}>
        {(calf.name ?? calf.tag_number).slice(0, 2).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{calf.name ?? calf.tag_number}</p>
          <Badge variant={calf.status === 'calf' ? 'info' : 'primary'} size="sm">
            {calf.status}
          </Badge>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{ageLabel} · {calf.breed}</p>

        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1">
            <Scale className="h-3 w-3 text-gray-400" />
            <span className="text-xs font-medium text-gray-700">{calf.current_weight.toFixed(1)} kg</span>
            {calf.target_weight && (
              <span className="text-xs text-gray-400">/ {calf.target_weight} target</span>
            )}
          </div>
          {calf.adg !== null && (
            <div className="flex items-center gap-1">
              {adgIcon}
              <span className={clsx('text-xs font-medium', adgColor)}>
                {calf.adg >= 0 ? '+' : ''}{calf.adg.toFixed(2)} kg/day
              </span>
            </div>
          )}
        </div>

        {calf.needs_weighing && (
          <p className="text-xs text-amber-600 font-medium mt-0.5 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {calf.last_weighed ? `Last weighed ${formatDate(calf.last_weighed)}` : 'Never weighed'}
          </p>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 mt-1" />
    </Card>
  );
}

function GrowthRanking({ ranking }: { ranking: CalfSummary[] }) {
  if (ranking.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-3xl mb-2">🏆</p>
        <p className="text-sm text-gray-600">Record weight data to see growth ranking</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {ranking.map((calf, idx) => (
        <Card key={calf.id} onClick={() => router.visit(`/calves/${calf.id}`)} className="flex items-center gap-3">
          {/* Rank badge */}
          <div className={clsx('h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
            idx === 0 ? 'bg-yellow-100 text-yellow-700' :
            idx === 1 ? 'bg-gray-200 text-gray-600' :
            idx === 2 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500')}>
            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{calf.name ?? calf.tag_number}</p>
            <p className="text-xs text-gray-500">{calf.breed} · {calf.age_days} days</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={clsx('text-sm font-bold',
              calf.adg_rating === 'good' ? 'text-green-600' :
              calf.adg_rating === 'poor' ? 'text-red-600' : 'text-gray-700')}>
              {calf.adg !== null ? `${calf.adg >= 0 ? '+' : ''}${calf.adg.toFixed(2)} kg/d` : '—'}
            </p>
            <p className="text-xs text-gray-400">{calf.current_weight.toFixed(0)} kg</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

function KpiBox({ value, label, icon, alert }: { value: number | string; label: string; icon: string; alert?: boolean }) {
  return (
    <div className={clsx('rounded-xl p-3 text-center', alert ? 'bg-amber-500/20' : 'bg-white/10')}>
      <p className="text-lg">{icon}</p>
      <p className="text-white text-lg font-bold leading-tight">{value}</p>
      <p className="text-primary-200 text-xs mt-0.5">{label}</p>
    </div>
  );
}

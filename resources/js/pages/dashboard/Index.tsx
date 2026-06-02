import React from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import {
  ChevronRight, Bell, Milk, TrendingUp, TrendingDown,
  PawPrint, AlertTriangle, ClipboardList, Heart, Calendar, Wheat, DollarSign,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardGroup, CardRow } from '@/components/ui/Card';
import { Badge, getSeverityVariant } from '@/components/ui/Badge';
import { clsx } from 'clsx';
import type { PageProps, DashboardKPIs, Alert, Animal } from '@/types';
import { formatKES } from '@/utils/format';

interface DashboardProps extends PageProps {
  kpis: DashboardKPIs;
  active_alerts: Alert[];
  recent_animals: Animal[];
  today_date: string;
  today_report?: { id: string; status: string } | null;
  milk_trend?: { date: string; total: number }[];
}

const QUICK_ACTIONS = [
  { label: 'Daily Report', icon: ClipboardList, href: '/reports/daily/new', color: '#1B5E20', bg: 'rgba(27,94,32,0.10)' },
  { label: 'Record Milk',  icon: Milk,           href: '/milk-records/create', color: '#007AFF', bg: 'rgba(0,122,255,0.10)' },
  { label: 'Health Event', icon: Heart,           href: '/health/create',       color: '#FF3B30', bg: 'rgba(255,59,48,0.10)' },
  { label: 'Breeding',     icon: Calendar,        href: '/breeding',            color: '#AF52DE', bg: 'rgba(175,82,222,0.10)' },
  { label: 'Feed',         icon: Wheat,           href: '/feed',                color: '#FF9500', bg: 'rgba(255,149,0,0.10)' },
  { label: 'Finance',      icon: DollarSign,      href: '/finance',             color: '#34C759', bg: 'rgba(52,199,89,0.10)' },
];

export default function Dashboard() {
  const {
    kpis, active_alerts, recent_animals, today_date, auth, today_report, milk_trend,
  } = usePage<DashboardProps>().props;

  const hour    = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const isPositive = kpis.milk_delta_percent >= 0;

  return (
    <AppLayout title="Dashboard">
      {/* ── Large Title Header (iOS navigation bar style) ── */}
      <header className="px-4 pt-[env(safe-area-inset-top)] pt-3 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[15px]" style={{ color: 'rgba(60,60,67,0.6)' }}>
              {greeting}
            </p>
            <h1 className="text-[34px] font-bold tracking-[-0.5px] text-black leading-tight">
              {auth.farm?.name ?? 'SpinoMok Farm'}
            </h1>
            <p className="text-[15px] mt-0.5" style={{ color: 'rgba(60,60,67,0.5)' }}>
              {today_date}
            </p>
          </div>
          <button
            onClick={() => router.visit('/alerts')}
            aria-label="Alerts"
            className="relative h-10 w-10 mt-1 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(120,120,128,0.12)' }}
          >
            <Bell className="h-5 w-5 text-black" strokeWidth={1.8} />
            {kpis.critical_alerts_count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-[#FF3B30] text-white text-[11px] font-bold flex items-center justify-center">
                {kpis.critical_alerts_count}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="px-4 space-y-6 pb-6">
        {/* ── Hero KPI card — Today's Milk ── */}
        <Card
          onClick={() => router.visit('/milk-records')}
          padding="lg"
          className="bg-brand-900 !shadow-[0_4px_20px_rgba(27,94,32,0.30)]"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-brand-200">Today's Milk</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[44px] font-bold tracking-[-1px] text-white leading-none">
                  {kpis.milk_today_litres.toFixed(1)}
                </span>
                <span className="text-[22px] font-medium text-brand-300">L</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {isPositive
                  ? <TrendingUp className="h-3.5 w-3.5 text-[#34C759]" />
                  : <TrendingDown className="h-3.5 w-3.5 text-[#FF3B30]" />
                }
                <span className={clsx('text-[13px] font-medium', isPositive ? 'text-[#34C759]' : 'text-[#FF6B6B]')}>
                  {isPositive ? '+' : ''}{kpis.milk_delta_percent.toFixed(1)}% vs yesterday
                </span>
              </div>
            </div>

            {/* Mini sparkline */}
            {milk_trend && milk_trend.length > 1 && (
              <MiniSparkline data={milk_trend} />
            )}
          </div>

          {/* Sub stats */}
          <div
            className="mt-4 pt-4 grid grid-cols-3 gap-0"
            style={{ borderTop: '0.5px solid rgba(255,255,255,0.15)' }}
          >
            {[
              { label: 'Milking',  value: kpis.lactating_cows },
              { label: 'Dry',      value: kpis.dry_cows },
              { label: 'Pregnant', value: kpis.pregnant_cows },
            ].map((s, i) => (
              <div key={s.label} className={clsx('text-center', i > 0 && 'border-l border-white/15')}>
                <p className="text-[22px] font-semibold text-white">{s.value}</p>
                <p className="text-[12px] text-brand-300 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Secondary KPIs ── */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            label="Revenue MTD"
            value={formatKES(kpis.revenue_mtd_kes)}
            icon={<TrendingUp className="h-5 w-5" />}
            accentColor="#34C759"
            onClick={() => router.visit('/finance')}
          />
          <KpiCard
            label="Active Alerts"
            value={kpis.active_alerts_count}
            icon={<AlertTriangle className="h-5 w-5" />}
            accentColor={kpis.critical_alerts_count > 0 ? '#FF3B30' : '#FF9500'}
            onClick={() => router.visit('/alerts')}
            badge={kpis.critical_alerts_count > 0 ? `${kpis.critical_alerts_count} critical` : undefined}
          />
        </div>

        {/* ── Daily report status ── */}
        {today_report?.status !== 'submitted' && (
          <button
            onClick={() => router.visit('/reports/daily/new')}
            className="w-full flex items-center gap-3 bg-white rounded-[12px] px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)] active:bg-gray-50 transition-colors"
          >
            <div className="h-9 w-9 rounded-full bg-[rgba(255,149,0,0.12)] flex items-center justify-center shrink-0">
              <ClipboardList className="h-4.5 w-4.5 text-[#D97706]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-semibold text-black">
                {today_report?.status === 'draft' ? 'Continue Daily Report' : "Start Today's Report"}
              </p>
              <p className="text-[13px]" style={{ color: 'rgba(60,60,67,0.5)' }}>
                {today_report?.status === 'draft' ? 'Draft in progress' : 'Not started yet'}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'rgba(60,60,67,0.3)' }} />
          </button>
        )}

        {/* ── Quick Actions ── */}
        <section aria-labelledby="quick-actions-heading">
          <SectionHeader id="quick-actions-heading" title="Quick Actions" />
          <div className="grid grid-cols-3 gap-3">
            {QUICK_ACTIONS.map(action => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  className="flex flex-col items-center gap-2 rounded-[12px] py-4 active:opacity-70 transition-opacity"
                  style={{ background: action.bg }}
                  href={action.href}
                >
                  <Icon className="h-6 w-6" style={{ color: action.color }} strokeWidth={1.8} />
                  <span className="text-[12px] font-medium text-center leading-tight" style={{ color: action.color }}>
                    {action.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Active Alerts ── */}
        {active_alerts.length > 0 && (
          <section aria-labelledby="alerts-heading">
            <SectionHeader
              id="alerts-heading"
              title="Alerts"
              action="See All"
              onAction={() => router.visit('/alerts')}
            />
            <CardGroup>
              {active_alerts.slice(0, 3).map((alert, i) => (
                <CardRow key={alert.id} onClick={() => router.visit('/alerts')}>
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{
                      background: alert.severity === 'critical' ? '#FF3B30' :
                                  alert.severity === 'warning'  ? '#FF9500' : '#007AFF',
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-black truncate">{alert.title}</p>
                    <p className="text-[13px] truncate" style={{ color: 'rgba(60,60,67,0.5)' }}>
                      {alert.message}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'rgba(60,60,67,0.25)' }} />
                </CardRow>
              ))}
            </CardGroup>
          </section>
        )}

        {/* ── Herd Overview ── */}
        {recent_animals.length > 0 && (
          <section aria-labelledby="herd-heading">
            <SectionHeader
              id="herd-heading"
              title="Herd"
              action="View All"
              onAction={() => router.visit('/animals')}
            />
            <CardGroup>
              {recent_animals.slice(0, 4).map(animal => (
                <CardRow key={animal.id} onClick={() => router.visit(`/animals/${animal.id}`)}>
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {animal.photo_url ? (
                      <img src={animal.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-[13px] font-bold text-brand-900">
                        {(animal.name ?? animal.tag_number).slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-black truncate">
                      {animal.name ?? animal.tag_number}
                    </p>
                    <p className="text-[13px] truncate" style={{ color: 'rgba(60,60,67,0.5)' }}>
                      {animal.breed} · {animal.tag_number}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={getAnimalBadgeVariant(animal.status)} size="sm">
                      {getAnimalStatusLabel(animal.status)}
                    </Badge>
                    <ChevronRight className="h-4 w-4" style={{ color: 'rgba(60,60,67,0.25)' }} />
                  </div>
                </CardRow>
              ))}
            </CardGroup>
          </section>
        )}
      </div>
    </AppLayout>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  id, title, action, onAction,
}: {
  id?: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <h2
        id={id}
        className="text-[22px] font-bold tracking-[-0.3px] text-black"
      >
        {title}
      </h2>
      {action && (
        <button
          onClick={onAction}
          className="text-[15px] font-medium text-brand-700"
        >
          {action}
        </button>
      )}
    </div>
  );
}

function KpiCard({
  label, value, icon, accentColor, onClick, badge,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accentColor: string;
  onClick?: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-[12px] p-4 text-left w-full shadow-[0_1px_3px_rgba(0,0,0,0.08)] active:bg-gray-50 transition-colors"
    >
      <div
        className="h-9 w-9 rounded-full flex items-center justify-center mb-3"
        style={{ background: `${accentColor}18`, color: accentColor }}
      >
        {icon}
      </div>
      <p className="text-[22px] font-bold text-black tracking-[-0.3px]">{value}</p>
      <p className="text-[13px] mt-0.5" style={{ color: 'rgba(60,60,67,0.5)' }}>{label}</p>
      {badge && (
        <p className="text-[12px] font-medium mt-1" style={{ color: accentColor }}>
          {badge}
        </p>
      )}
    </button>
  );
}

function MiniSparkline({ data }: { data: { date: string; total: number }[] }) {
  const max = Math.max(...data.map(d => d.total), 1);
  const w   = 80;
  const h   = 40;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (d.total / max) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline
        points={points}
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function getAnimalBadgeVariant(status: string) {
  const map: Record<string, 'success' | 'neutral' | 'warning' | 'info' | 'primary'> = {
    lactating: 'success',
    dry:       'neutral',
    heifer:    'info',
    calf:      'primary',
    pregnant:  'warning',
  };
  return map[status] ?? 'neutral';
}

function getAnimalStatusLabel(status: string): string {
  const map: Record<string, string> = {
    lactating: 'Milking',
    dry:       'Dry',
    heifer:    'Heifer',
    calf:      'Calf',
    bull:      'Bull',
    culled:    'Culled',
    sold:      'Sold',
    dead:      'Dead',
  };
  return map[status] ?? status;
}

import React from 'react';
import { usePage, router } from '@inertiajs/react';
import {
  ChevronRight, Bell, Milk, TrendingUp, TrendingDown,
  AlertTriangle, ClipboardList, Heart, Calendar, Wheat, DollarSign,
  Activity,
} from 'lucide-react';
import { CalfIcon } from '@/components/icons/CalfIcon';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardGroup, CardRow } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';
import type { PageProps, DashboardKPIs, Alert, Animal } from '@/types';
import { formatKES } from '@/utils/format';
import { useAuth } from '@/hooks/useAuth';

interface DashboardProps extends PageProps {
  kpis: DashboardKPIs;
  active_alerts: Alert[];
  recent_animals: Animal[];
  today_date: string;
  today_report?: { id: string; status: string } | null;
  milk_trend?: { date: string; total: number }[];
  risk_summary?: DashboardRiskSummary;
}

interface DashboardRiskSummary {
  milk: {
    declining_count: number;
    improving_count: number;
    warning_count: number;
    critical_count: number;
    cow_trends: { animal_id: string; name: string | null; tag_number: string | null; today_litres: number; avg_7_day: number; percent_change_vs_7_day: number; status: string }[];
  };
  mastitis: { active_cases: number; severe_cases: number; cases_30d: number };
  bcs: { herd_avg: number | null; low_count: number; losing_count: number };
  combined: { animal_id: string; animal: string; risk_level: 'high' | 'watch'; recommendation: string; signals: string[] }[];
}

interface QuickAction {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  href: string;
  color: string;
  bg: string;
  badgeKey: keyof DashboardKPIs | null;
  managerOnly?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Daily Report',    icon: ClipboardList, href: '/reports/daily/new',   color: '#1B5E20', bg: 'rgba(27,94,32,0.10)',   badgeKey: null },
  { label: 'Record Milk',     icon: Milk,          href: '/milk-records/create', color: '#007AFF', bg: 'rgba(0,122,255,0.10)',  badgeKey: null },
  { label: 'Health Event',    icon: Heart,         href: '/health/create',       color: '#FF3B30', bg: 'rgba(255,59,48,0.10)',  badgeKey: null },
  { label: 'Breeding',        icon: Calendar,      href: '/breeding',            color: '#AF52DE', bg: 'rgba(175,82,222,0.10)', badgeKey: null },
  { label: 'Feed',            icon: Wheat,         href: '/feed',                color: '#FF9500', bg: 'rgba(255,149,0,0.10)',  badgeKey: null },
  { label: 'Finance',         icon: DollarSign,    href: '/finance',             color: '#34C759', bg: 'rgba(52,199,89,0.10)',  badgeKey: null, managerOnly: true },
  { label: 'Calf Management', icon: CalfIcon,      href: '/calf-management',     color: '#F9A825', bg: '#FFF9C4',              badgeKey: 'calves' },
];

export default function Dashboard() {
  const {
    kpis, active_alerts, recent_animals, today_date, auth, today_report, milk_trend, risk_summary,
  } = usePage<DashboardProps>().props;
  const { isManager } = useAuth();

  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const milkToday = kpis?.milk_today_litres ?? 0;
  const milkDelta = kpis?.milk_delta_percent ?? null;
  const milkDeltaLitres = kpis?.milk_delta_litres ?? 0;
  const isPositive = milkDeltaLitres >= 0;
  const isShowingToday = (kpis?.milk_display_label ?? 'Today') === 'Today';
  const hasMilkToday = milkToday > 0;
  const recordedCowCount = hasMilkToday ? kpis.cows_milked : 0;
  const milkActionText = hasMilkToday
    ? getMilkActionText(kpis.morning_litres, kpis.midday_litres, kpis.evening_litres)
    : 'Record today\'s milk';
  const comparisonText = milkDelta === null
    ? 'No earlier milk day to compare'
    : `${isPositive ? '+' : ''}${milkDelta.toFixed(1)}% (${isPositive ? '+' : ''}${milkDeltaLitres.toFixed(1)}L) vs previous milk day`;
  const milkStatusText = hasMilkToday
    ? `${recordedCowCount} of ${kpis.lactating_cows} milking cows recorded · ${milkActionText}`
    : 'No milk recorded today';
  const milkContextText = hasMilkToday
    ? comparisonText
    : isShowingToday
      ? 'No earlier milk day recorded'
      : `Latest: ${kpis.milk_display_litres.toFixed(1)}L on ${formatShortDate(kpis.milk_display_date)}`;
  const quickActions = QUICK_ACTIONS.filter(action => !action.managerOnly || isManager);

  // Guard: if kpis is missing don't crash
  if (!kpis) return <AppLayout title="Dashboard"><div className="p-8 text-center text-gray-500">Loading dashboard…</div></AppLayout>;

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
            style={{ background: 'rgba(120,120,128,0.12)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
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
        <button
          onClick={() => router.visit('/milk-records')}
          className="w-full text-left rounded-[12px] p-5 shadow-[0_4px_20px_rgba(27,94,32,0.30)]"
          style={{ background: '#1B5E20', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-brand-200">Milk Production</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[44px] font-bold tracking-[-1px] text-white leading-none">
                  {milkToday.toFixed(1)}
                </span>
                <span className="text-[22px] font-medium text-brand-300">L Today</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {hasMilkToday && milkDelta !== null && (
                  isPositive
                    ? <TrendingUp className="h-3.5 w-3.5 text-[#34C759]" />
                    : <TrendingDown className="h-3.5 w-3.5 text-[#FF6B6B]" />
                )}
                <span className={clsx('text-[13px] font-medium', isPositive ? 'text-[#34C759]' : 'text-[#FF6B6B]')}>
                  {milkContextText}
                </span>
              </div>
              <p className="text-[13px] text-brand-200 mt-1">{milkStatusText}</p>
            </div>

            <div className="text-right shrink-0 ml-3">
              <p className="text-[12px] font-semibold uppercase text-brand-200">MTD</p>
              <p className="text-[22px] font-bold text-white leading-tight">{kpis.milk_mtd_litres.toFixed(1)}L</p>
              <p className="text-[12px] text-brand-300 mt-1">
                {hasMilkToday ? `${kpis.avg_litres_per_cow.toFixed(1)}L/cow` : milkActionText}
              </p>
              {milk_trend && milk_trend.length > 1 && (
                <div className="mt-2 flex justify-end">
                  <MiniSparkline data={milk_trend} />
                </div>
              )}
            </div>
          </div>

          {/* Sub stats */}
          <div
            className="mt-4 pt-4 grid grid-cols-3 gap-0"
            style={{ borderTop: '0.5px solid rgba(255,255,255,0.15)' }}
          >
            {[
              { label: 'Morning', litres: kpis.morning_litres },
              { label: 'Midday',  litres: kpis.midday_litres },
              { label: 'Evening', litres: kpis.evening_litres },
            ].map((s, i) => (
              <SessionStat
                key={s.label}
                label={s.label}
                litres={s.litres}
                showPending
                className={clsx(i > 0 && 'border-l border-white/15')}
              />
            ))}
          </div>
        </button>

        {risk_summary && (
          <section aria-labelledby="risk-heading">
            <SectionHeader id="risk-heading" title="Risk Analytics" action="Open Analytics" onAction={() => router.visit('/analytics')} />
            <div className="grid grid-cols-2 gap-3">
              <RiskCard
                title="Milk Risk"
                value={risk_summary.milk.critical_count > 0 ? `${risk_summary.milk.critical_count} critical` : `${risk_summary.milk.declining_count} declining`}
                detail={`${risk_summary.milk.warning_count} warning · ${risk_summary.milk.improving_count} improving`}
                icon={<Milk className="h-5 w-5" />}
                tone={risk_summary.milk.critical_count > 0 ? 'red' : risk_summary.milk.warning_count > 0 ? 'amber' : 'green'}
                onClick={() => router.visit('/analytics')}
              />
              <RiskCard
                title="Herd Health"
                value={risk_summary.combined.length > 0 ? `${risk_summary.combined.length} watch` : `${risk_summary.mastitis.active_cases} mastitis`}
                detail={`BCS avg ${risk_summary.bcs.herd_avg ?? 'none'} · ${risk_summary.bcs.low_count} low`}
                icon={<Activity className="h-5 w-5" />}
                tone={risk_summary.combined.some(row => row.risk_level === 'high') || risk_summary.mastitis.severe_cases > 0 ? 'red' : risk_summary.combined.length > 0 || risk_summary.bcs.low_count > 0 ? 'amber' : 'green'}
                onClick={() => router.visit('/analytics')}
              />
            </div>
            {risk_summary.combined.length > 0 && (
              <button
                onClick={() => router.visit('/analytics')}
                className="mt-3 w-full rounded-[12px] bg-red-50 border border-red-200 px-4 py-3 text-left"
              >
                <p className="text-[14px] font-bold text-red-900">{risk_summary.combined[0].animal}</p>
                <p className="text-[12px] text-red-700 mt-0.5">{risk_summary.combined[0].recommendation}</p>
              </button>
            )}
          </section>
        )}

        {/* ── Secondary KPIs ── */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            label="Revenue MTD"
            value={formatKES(kpis.revenue_mtd_kes)}
            icon={<TrendingUp className="h-5 w-5" />}
            accentColor="#34C759"
            onClick={isManager ? () => router.visit('/finance') : undefined}
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
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
          >
            <div className="h-9 w-9 rounded-full bg-[rgba(255,149,0,0.12)] flex items-center justify-center shrink-0">
              <ClipboardList className="h-5 w-5 text-[#D97706]" />
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
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(action => {
              const Icon = action.icon;
              const badge = action.badgeKey ? (kpis[action.badgeKey] as number) : null;
              return (
                <a
                  key={action.href}
                  href={action.href}
                  onClick={(e) => { e.preventDefault(); router.visit(action.href); }}
                  className="flex flex-col items-center gap-2.5 rounded-[14px] py-5 active:opacity-60 transition-opacity select-none"
                  style={{
                    background: action.bg,
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
                    cursor: 'pointer',
                    minHeight: '88px',
                  }}
                >
                  <div className="relative h-12 w-12 rounded-full flex items-center justify-center"
                    style={{ background: action.bg, border: `1.5px solid ${action.color}30` }}>
                    <Icon className="h-7 w-7" style={{ color: action.color }} strokeWidth={1.8} />
                    {badge != null && badge > 0 && (
                      <span
                        className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-[#F9A825] text-white text-[11px] font-bold flex items-center justify-center"
                      >
                        {badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[14px] font-semibold text-center leading-tight px-2" style={{ color: action.color }}>
                    {action.label}
                  </span>
                </a>
              );
            })}
          </div>
        </section>

        {/* ── Active Alerts ── */}
        {(active_alerts ?? []).length > 0 && (
          <section aria-labelledby="alerts-heading">
            <SectionHeader
              id="alerts-heading"
              title="Alerts"
              action="See All"
              onAction={() => router.visit('/alerts')}
            />
            <CardGroup>
              {active_alerts.slice(0, 3).map(alert => (
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
        {(recent_animals ?? []).length > 0 && (
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

function RiskCard({
  title, value, detail, icon, tone, onClick,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: 'red' | 'amber' | 'green';
  onClick: () => void;
}) {
  const color = tone === 'red' ? '#FF3B30' : tone === 'amber' ? '#FF9500' : '#34C759';

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-[12px] p-4 text-left w-full shadow-[0_1px_3px_rgba(0,0,0,0.08)] active:bg-gray-50 transition-colors"
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: `${color}18`, color }}>
          {icon}
        </div>
        <ChevronRight className="h-4 w-4 mt-2" style={{ color: 'rgba(60,60,67,0.25)' }} />
      </div>
      <p className="text-[13px] mt-3" style={{ color: 'rgba(60,60,67,0.55)' }}>{title}</p>
      <p className="text-[20px] font-bold text-black tracking-[-0.3px]">{value}</p>
      <p className="text-[12px] font-medium mt-1" style={{ color }}>{detail}</p>
    </button>
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
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
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

function SessionStat({
  label, litres, showPending, className,
}: {
  label: string;
  litres: number;
  showPending?: boolean;
  className?: string;
}) {
  const isRecorded = litres > 0;

  return (
    <div className={clsx('text-center', className)}>
      <p className={clsx('text-[20px] font-semibold leading-tight', isRecorded ? 'text-white' : 'text-brand-200')}>
        {isRecorded ? `${litres.toFixed(1)}L` : showPending ? 'Pending' : '0.0L'}
      </p>
      <p className="text-[12px] text-brand-300 mt-0.5">{label}</p>
    </div>
  );
}

function getMilkActionText(morning: number, midday: number, evening: number): string {
  const pending = [
    ['Morning', morning],
    ['Midday', midday],
    ['Evening', evening],
  ].filter(([, litres]) => Number(litres) <= 0).map(([label]) => label);

  if (pending.length === 0) return 'Production complete';
  if (pending.length === 1) return `${pending[0]} pending`;
  return `${pending.length} sessions pending`;
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

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(date));
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

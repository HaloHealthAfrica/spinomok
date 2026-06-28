import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
  Plus, Heart, ShieldCheck, Pill as PillIcon, AlertTriangle,
  CheckCircle, Clock, ChevronRight, Syringe, Bug,
  Thermometer, Activity,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';
import type { PageProps, HealthKPIs, HealthEvent, Treatment, Vaccination, DewormingRecord } from '@/types';
import { formatDate, formatKES } from '@/utils/format';

interface HealthIndexProps extends PageProps {
  kpis: HealthKPIs;
  openCases: HealthEvent[];
  recentEvents: HealthEvent[];
  onWithdrawal: (Treatment & { animal?: { id: string; tag_number: string; name: string | null } })[];
  vacsDue: Vaccination[];
  dewormDue: DewormingRecord[];
  mastitis: { active_cases: number; severe_cases: number; cases_30d: number };
  bcs: { herd_avg: number | null; low_count: number; losing_count: number };
  combinedRisk: { animal_id: string; animal: string; risk_level: 'high' | 'watch'; recommendation: string; signals: string[] }[];
}

const TABS = ['Active', 'Vaccinations', 'Deworming', 'History'] as const;
type Tab = typeof TABS[number];

export default function HealthIndex() {
  const { kpis, openCases, recentEvents, onWithdrawal, vacsDue, dewormDue, mastitis, bcs, combinedRisk } = usePage<HealthIndexProps>().props;
  const [tab, setTab] = useState<Tab>('Active');

  return (
    <AppLayout title="Herd Health">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-4">
          <h1 className="text-white text-xl font-bold">Herd Health</h1>
          <button
            onClick={() => router.visit('/health/create')}
            className="flex items-center gap-1.5 bg-accent-500 text-white px-3 py-2 rounded-full text-sm font-medium"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Report
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-2">
          <KpiBox
            value={kpis.open_cases}
            label="Open Cases"
            icon="🏥"
            alert={kpis.open_cases > 0}
          />
          <KpiBox
            value={kpis.on_withdrawal}
            label="Withdrawal"
            icon="⚠️"
            alert={kpis.on_withdrawal > 0}
          />
          <KpiBox
            value={formatKES(kpis.mtd_vet_cost, 0)}
            label="Vet Cost MTD"
            icon="💊"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <HealthInsight
            label="Mastitis"
            value={mastitis.severe_cases > 0 ? `${mastitis.severe_cases} severe` : mastitis.active_cases}
            icon={<Thermometer className="h-4 w-4" />}
            alert={mastitis.active_cases > 0}
          />
          <HealthInsight
            label="BCS Risk"
            value={bcs.low_count}
            icon={<Activity className="h-4 w-4" />}
            alert={bcs.low_count > 0 || bcs.losing_count > 0}
          />
          <HealthInsight
            label="Combined"
            value={combinedRisk.length}
            icon={<AlertTriangle className="h-4 w-4" />}
            alert={combinedRisk.length > 0}
          />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex bg-white border-b border-gray-100 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              tab === t ? 'text-primary-900 border-primary-900' : 'text-gray-500 border-transparent',
            )}
          >
            {t}
            {t === 'Active' && kpis.open_cases > 0 && (
              <span className="ml-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] inline-flex items-center justify-center">
                {kpis.open_cases}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-4">
        {tab === 'Active'       && <ActiveTab openCases={openCases} onWithdrawal={onWithdrawal} />}
        {tab === 'Vaccinations' && <VaccinationsTab vacsDue={vacsDue} kpis={kpis} />}
        {tab === 'Deworming'    && <DewormingTab dewormDue={dewormDue} kpis={kpis} />}
        {tab === 'History'      && <HistoryTab events={recentEvents} />}
      </div>

      {/* Quick action strip */}
      <div className="sticky bottom-16 px-4 pb-3">
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 grid grid-cols-4 gap-2">
          {[
            { label: 'Health Event', icon: Heart,      href: '/health/create',              color: 'text-red-600 bg-red-50' },
            { label: 'Mastitis',     icon: Thermometer, href: '/health/mastitis/new',        color: 'text-orange-600 bg-orange-50' },
            { label: 'Vaccination',  icon: Syringe,    href: '/health/vaccinations/new',    color: 'text-blue-600 bg-blue-50' },
            { label: 'Deworming',    icon: Bug,        href: '/health/deworming/new',       color: 'text-green-600 bg-green-50' },
          ].map(a => {
            const Icon = a.icon;
            return (
              <button key={a.href} onClick={() => router.visit(a.href)}
                className={clsx('flex flex-col items-center gap-1 rounded-xl py-3 active:opacity-70', a.color)}>
                <Icon className="h-5 w-5" />
                <span className="text-xs font-semibold">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Active Cases Tab ────────────────────────────────────────────────────────

function ActiveTab({ openCases, onWithdrawal }: { openCases: HealthEvent[]; onWithdrawal: HealthIndexProps['onWithdrawal'] }) {
  return (
    <>
      {(onWithdrawal ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">⚠️ Milk Withdrawal Active</h2>
          <div className="space-y-2">
            {onWithdrawal.map(t => (
              <div key={t.id} className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-red-900">{t.animal?.name ?? t.animal?.tag_number}</p>
                  <p className="text-xs text-red-600">{t.medication?.name} · Clears {t.withdrawal_end_date ? formatDate(t.withdrawal_end_date) : '—'}</p>
                </div>
                <Badge variant="error" size="sm">Withheld</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">🏥 Open Cases</h2>
        {openCases.length === 0 ? (
          <Card className="text-center py-8">
            <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-800">All clear</p>
            <p className="text-xs text-gray-500 mt-1">No open health cases</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {openCases.map(ev => (
              <HealthEventCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function HealthEventCard({ event }: { event: HealthEvent }) {
  const severityColor = { severe: 'error', moderate: 'warning', mild: 'info' }[event.severity] as 'error' | 'warning' | 'info';

  return (
    <Card onClick={() => router.visit(`/health/${event.id}`)} className="flex items-start gap-3">
      <div className={clsx('h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
        event.severity === 'severe' ? 'bg-red-100' : event.severity === 'moderate' ? 'bg-amber-100' : 'bg-blue-100',
      )}>
        <Heart className={clsx('h-5 w-5', event.severity === 'severe' ? 'text-red-600' : event.severity === 'moderate' ? 'text-amber-600' : 'text-blue-600')} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{event.animal?.name ?? event.animal?.tag_number}</p>
          <Badge variant={severityColor} size="sm">{event.severity}</Badge>
        </div>
        <p className="text-xs text-gray-600 mt-0.5 truncate">{event.disease_type?.name ?? 'Undiagnosed'}</p>
        <p className="text-xs text-gray-400">{formatDate(event.observed_on)}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {(event.treatments?.length ?? 0) > 0 && (
          <PillIcon className="h-4 w-4 text-purple-400" />
        )}
        <ChevronRight className="h-4 w-4 text-gray-300" />
      </div>
    </Card>
  );
}

// ─── Vaccinations Tab ─────────────────────────────────────────────────────────

function VaccinationsTab({ vacsDue, kpis }: { vacsDue: Vaccination[]; kpis: HealthKPIs }) {
  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={() => router.visit('/health/vaccinations/new')}
          className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Syringe className="h-4 w-4" /> Record Vaccination
        </button>
        <button
          onClick={() => router.visit('/health/vaccinations/schedule')}
          className="flex-1 bg-white border border-gray-200 text-gray-700 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <ShieldCheck className="h-4 w-4" /> View Schedule
        </button>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Due in 14 Days</h2>
        {vacsDue.length === 0 ? (
          <Card className="text-center py-6">
            <ShieldCheck className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No vaccinations due</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {vacsDue.map(v => (
              <Card key={v.id} padding="sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Syringe className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{v.animal?.name ?? v.animal?.tag_number}</p>
                    <p className="text-xs text-gray-500">{v.vaccine_type?.name ?? 'Vaccination'}</p>
                  </div>
                  <Badge variant={v.next_due_date && new Date(v.next_due_date) < new Date() ? 'error' : 'warning'} size="sm">
                    {v.next_due_date ? formatDate(v.next_due_date) : 'Due'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

// ─── Deworming Tab ────────────────────────────────────────────────────────────

function DewormingTab({ dewormDue, kpis }: { dewormDue: DewormingRecord[]; kpis: HealthKPIs }) {
  return (
    <>
      <button
        onClick={() => router.visit('/health/deworming/new')}
        className="w-full bg-green-600 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
      >
        <Bug className="h-4 w-4" /> Record Deworming
      </button>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Due in 14 Days</h2>
        {dewormDue.length === 0 ? (
          <Card className="text-center py-6">
            <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No deworming due</p>
            <p className="text-xs text-gray-400 mt-1">Deworm every 90 days (3 times per year)</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {dewormDue.map(d => (
              <Card key={d.id} padding="sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Bug className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{d.animal?.name ?? d.animal?.tag_number}</p>
                    <p className="text-xs text-gray-500">{d.drug_name}</p>
                  </div>
                  <Badge variant={d.next_due_date && new Date(d.next_due_date) < new Date() ? 'error' : 'warning'} size="sm">
                    {d.next_due_date ? formatDate(d.next_due_date) : 'Due'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Card padding="md" className="bg-green-50 border-green-200">
        <p className="text-sm font-bold text-green-900 mb-1">Deworming Protocol</p>
        <p className="text-xs text-green-700">• Every 90 days (minimum 3× per year)</p>
        <p className="text-xs text-green-700">• Mandatory at dry-off and post-calving</p>
        <p className="text-xs text-green-700">• Rotate drug classes to prevent resistance</p>
      </Card>
    </>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ events }: { events: HealthEvent[] }) {
  if (events.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-3xl mb-2">📋</p>
        <p className="text-sm font-semibold text-gray-800">No health history yet</p>
        <p className="text-xs text-gray-500 mt-1">Records from the last 30 days will appear here</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {events.map(ev => (
        <Card key={ev.id} onClick={() => router.visit(`/health/${ev.id}`)} className="flex items-center gap-3">
          <div className={clsx('h-2 w-2 rounded-full flex-shrink-0', ev.is_recovered ? 'bg-green-500' : 'bg-amber-500')} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{ev.animal?.name ?? ev.animal?.tag_number}</p>
            <p className="text-xs text-gray-500">{ev.disease_type?.name ?? 'Undiagnosed'} · {formatDate(ev.observed_on)}</p>
          </div>
          <Badge variant={ev.is_recovered ? 'success' : 'warning'} size="sm">
            {ev.is_recovered ? 'Recovered' : 'Ongoing'}
          </Badge>
          <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
        </Card>
      ))}
    </div>
  );
}

// ─── KPI Box ──────────────────────────────────────────────────────────────────

function HealthInsight({ value, label, icon, alert }: { value: number | string; label: string; icon: React.ReactNode; alert?: boolean }) {
  return (
    <button
      onClick={() => router.visit('/analytics')}
      className={clsx('rounded-xl p-3 text-left', alert ? 'bg-red-500/20' : 'bg-white/10')}
    >
      <div className="flex items-center gap-1.5 text-primary-100 mb-1">
        {icon}
        <span className="text-[10px] font-semibold uppercase">{label}</span>
      </div>
      <p className="text-white text-lg font-bold leading-tight">{value}</p>
    </button>
  );
}

function KpiBox({ value, label, icon, alert }: { value: number | string; label: string; icon: string; alert?: boolean }) {
  return (
    <div className={clsx('rounded-xl p-3 text-center', alert ? 'bg-red-500/20' : 'bg-white/10')}>
      <p className="text-lg">{icon}</p>
      <p className="text-white text-lg font-bold leading-tight">{value}</p>
      <p className="text-primary-200 text-xs mt-0.5">{label}</p>
    </div>
  );
}

function Pill({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2h-2M9 3a2 2 0 002 2h2a2 2 0 002-2M9 3a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
}

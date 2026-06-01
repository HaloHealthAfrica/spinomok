import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
  Heart, Syringe, Search, Baby, Calendar, CheckCircle,
  Clock, AlertTriangle, ChevronRight, Plus, Flame,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';
import type { PageProps, BreedingKPIs, AIService, HeatEvent, SyncProgram } from '@/types';
import { formatDate } from '@/utils/format';

interface BreedingIndexProps extends PageProps {
  kpis: BreedingKPIs;
  upcomingCalvings: AIService[];
  duePDChecks: AIService[];
  pendingHeats: HeatEvent[];
  activeSync: SyncProgram[];
  recentServices: AIService[];
}

const TABS = ['Overview', 'Services', 'Sync'] as const;
type Tab = typeof TABS[number];

export default function BreedingIndex() {
  const { kpis, upcomingCalvings, duePDChecks, pendingHeats, activeSync, recentServices } = usePage<BreedingIndexProps>().props;
  const [tab, setTab] = useState<Tab>('Overview');

  return (
    <AppLayout title="Breeding">
      {/* Header */}
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-4">
          <h1 className="text-white text-xl font-bold">Breeding</h1>
          <button
            onClick={() => router.visit('/breeding/ai/new')}
            className="flex items-center gap-1.5 bg-accent-500 text-white px-3 py-2 rounded-full text-sm font-medium"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Record AI
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-2">
          <KpiBox label="Pregnant" value={kpis.confirmed_pregnant} icon="🤰" />
          <KpiBox
            label="Conception"
            value={`${kpis.conception_rate_90d}%`}
            icon="🎯"
            sub="last 90 days"
          />
          <KpiBox label="Calvings (14d)" value={kpis.upcoming_calvings_14d} icon="🐄" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex bg-white border-b border-gray-100">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
              tab === t ? 'text-primary-900 border-primary-900' : 'text-gray-500 border-transparent',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-5">
        {tab === 'Overview' && (
          <OverviewTab
            pendingHeats={pendingHeats}
            duePDChecks={duePDChecks}
            upcomingCalvings={upcomingCalvings}
            kpis={kpis}
          />
        )}
        {tab === 'Services' && <ServicesTab services={recentServices} />}
        {tab === 'Sync' && <SyncTab programs={activeSync} />}
      </div>

      {/* Quick action FAB strip */}
      <div className="sticky bottom-16 px-4 pb-3">
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 grid grid-cols-4 gap-2">
          {[
            { label: 'Heat', icon: Flame,    href: '/breeding/heat/new',    color: 'text-red-600 bg-red-50' },
            { label: 'AI',   icon: Syringe,  href: '/breeding/ai/new',      color: 'text-blue-600 bg-blue-50' },
            { label: 'PD',   icon: Search,   href: '/breeding/pd/new',      color: 'text-purple-600 bg-purple-50' },
            { label: 'Calving', icon: Baby,  href: '/breeding/calving/new', color: 'text-green-600 bg-green-50' },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.href}
                onClick={() => router.visit(a.href)}
                className={clsx('flex flex-col items-center gap-1 rounded-xl py-3 active:opacity-70 transition-opacity', a.color)}
              >
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

// ─── KPI Box ──────────────────────────────────────────────────────────────────

function KpiBox({ label, value, icon, sub }: { label: string; value: number | string; icon: string; sub?: string }) {
  return (
    <div className="bg-white/10 rounded-xl p-3 text-center">
      <p className="text-lg">{icon}</p>
      <p className="text-white text-lg font-bold leading-tight">{value}</p>
      <p className="text-primary-200 text-xs mt-0.5">{label}</p>
      {sub && <p className="text-primary-300 text-[10px]">{sub}</p>}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ pendingHeats, duePDChecks, upcomingCalvings, kpis }: {
  pendingHeats: HeatEvent[];
  duePDChecks: AIService[];
  upcomingCalvings: AIService[];
  kpis: BreedingKPIs;
}) {
  return (
    <>
      {/* Action needed cards */}
      {pendingHeats.length > 0 && (
        <Section title="🔥 Heat Detected — AI Due" action="Record AI" onAction={() => router.visit('/breeding/ai/new')}>
          {pendingHeats.map(h => (
            <ActionCard
              key={h.id}
              icon={<Flame className="h-5 w-5 text-red-500" />}
              title={h.animal?.name ?? h.animal?.tag_number ?? ''}
              sub={`Detected ${formatDate(h.observed_on)} · ${h.confidence}`}
              badge={{ label: 'AI Pending', variant: 'error' }}
              onClick={() => router.visit(`/breeding/ai/new?animal_id=${h.animal_id}`)}
            />
          ))}
        </Section>
      )}

      {duePDChecks.length > 0 && (
        <Section title="🔍 Pregnancy Checks Due" action="Record PD" onAction={() => router.visit('/breeding/pd/new')}>
          {duePDChecks.map(s => (
            <ActionCard
              key={s.id}
              icon={<Search className="h-5 w-5 text-purple-500" />}
              title={s.animal?.name ?? s.animal?.tag_number ?? ''}
              sub={`AI on ${formatDate(s.service_date)} · ${s.service_number}${s.service_number === 1 ? 'st' : 'nd'} service`}
              badge={{ label: 'PD Due', variant: 'warning' }}
              onClick={() => router.visit('/breeding/pd/new')}
            />
          ))}
        </Section>
      )}

      {upcomingCalvings.length > 0 && (
        <Section title="🐄 Upcoming Calvings" action="Record Calving" onAction={() => router.visit('/breeding/calving/new')}>
          {upcomingCalvings.map(s => (
            <ActionCard
              key={s.id}
              icon={<Baby className="h-5 w-5 text-green-500" />}
              title={s.animal?.name ?? s.animal?.tag_number ?? ''}
              sub={`Due ${s.expected_calving_date ? formatDate(s.expected_calving_date) : '—'} · Lactation ${(s.animal?.parity ?? 0) + 1}`}
              badge={{ label: daysUntil(s.expected_calving_date), variant: daysUntil(s.expected_calving_date).includes('Today') || daysUntil(s.expected_calving_date).includes('Tomorrow') ? 'error' : 'warning' }}
              onClick={() => router.visit('/breeding/calving/new')}
            />
          ))}
        </Section>
      )}

      {pendingHeats.length === 0 && duePDChecks.length === 0 && upcomingCalvings.length === 0 && (
        <Card className="text-center py-10">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-sm font-semibold text-gray-800">All clear</p>
          <p className="text-xs text-gray-500 mt-1">No immediate breeding actions needed</p>
        </Card>
      )}

      {/* Sync programs */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => router.visit('/breeding/sync/new')}
          className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-left"
        >
          <Calendar className="h-6 w-6 text-indigo-600 mb-2" />
          <p className="text-sm font-semibold text-indigo-900">Sync Program</p>
          <p className="text-xs text-indigo-600">Ovsynch / CIDR</p>
        </button>
        <button
          onClick={() => router.visit('/breeding/heat/new')}
          className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-left"
        >
          <Flame className="h-6 w-6 text-rose-600 mb-2" />
          <p className="text-sm font-semibold text-rose-900">Record Heat</p>
          <p className="text-xs text-rose-600">Standing heat detection</p>
        </button>
      </div>
    </>
  );
}

// ─── Services Tab ─────────────────────────────────────────────────────────────

function ServicesTab({ services }: { services: AIService[] }) {
  if (services.length === 0) {
    return (
      <Card className="text-center py-10">
        <p className="text-3xl mb-2">🐄</p>
        <p className="text-sm font-semibold text-gray-800">No AI services yet</p>
        <button onClick={() => router.visit('/breeding/ai/new')} className="mt-3 text-primary-900 text-sm font-medium underline">
          Record first AI service
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {services.map(s => {
        const resultColor = s.result === 'confirmed_pregnant' ? 'success' : s.result === 'not_pregnant' ? 'error' : s.result === 'repeat' ? 'warning' : 'neutral';
        const resultLabel = { pending: 'Pending PD', confirmed_pregnant: 'Pregnant ✓', not_pregnant: 'Not Pregnant', repeat: 'Repeat' }[s.result];

        return (
          <Card key={s.id} padding="sm">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Syringe className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{s.animal?.name ?? s.animal?.tag_number}</p>
                <p className="text-xs text-gray-500">{formatDate(s.service_date)} · Service #{s.service_number}</p>
                {s.expected_calving_date && s.result === 'confirmed_pregnant' && (
                  <p className="text-xs text-green-700 mt-0.5 font-medium">Due: {formatDate(s.expected_calving_date)}</p>
                )}
              </div>
              <Badge variant={resultColor as 'success' | 'error' | 'warning' | 'neutral'} size="sm">
                {resultLabel}
              </Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Sync Tab ─────────────────────────────────────────────────────────────────

function SyncTab({ programs }: { programs: SyncProgram[] }) {
  if (programs.length === 0) {
    return (
      <div className="space-y-3">
        <Card className="text-center py-8">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-sm font-semibold text-gray-800">No active programs</p>
          <button onClick={() => router.visit('/breeding/sync/new')} className="mt-3 text-primary-900 text-sm font-medium underline">
            Start Ovsynch or CIDR program
          </button>
        </Card>
        <Card padding="md" className="bg-blue-50 border-blue-200">
          <p className="text-sm font-bold text-blue-900 mb-2">Ovsynch Protocol</p>
          <div className="space-y-1 text-xs text-blue-700">
            {[
              'Day 0: GnRH injection',
              'Day 7: PGF2α injection',
              'Day 9: GnRH injection',
              'Day 10 AM: Timed AI',
            ].map(s => <p key={s}>• {s}</p>)}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {programs.map(p => (
        <Card key={p.id} padding="md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-900">{p.program_type}</p>
              <p className="text-xs text-gray-500">{p.animal?.name ?? p.animal?.tag_number} · Started {formatDate(p.start_date)}</p>
            </div>
            <Badge variant="info" size="sm">Active</Badge>
          </div>
          <div className="space-y-2">
            {p.steps?.map(step => (
              <div key={step.id} className="flex items-center gap-2">
                {step.is_completed
                  ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  : <Clock className="h-4 w-4 text-gray-300 flex-shrink-0" />
                }
                <div className="flex-1">
                  <p className={clsx('text-xs font-medium', step.is_completed ? 'text-gray-400 line-through' : 'text-gray-700')}>
                    {step.custom_label ?? step.event_type}
                  </p>
                  <p className="text-[10px] text-gray-400">{formatDate(step.scheduled_on)}</p>
                </div>
                {!step.is_completed && (
                  <Badge variant={new Date(step.scheduled_on) <= new Date() ? 'error' : 'neutral'} size="sm">
                    {new Date(step.scheduled_on) <= new Date() ? 'Due!' : 'Upcoming'}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Section({ title, action, onAction, children }: {
  title: string; action?: string; onAction?: () => void; children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        {action && (
          <button onClick={onAction} className="text-xs text-primary-900 font-medium">{action} →</button>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ActionCard({ icon, title, sub, badge, onClick }: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  badge: { label: string; variant: 'error' | 'warning' | 'success' | 'info' | 'neutral' };
  onClick: () => void;
}) {
  return (
    <Card onClick={onClick} className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 truncate">{sub}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
        <ChevronRight className="h-4 w-4 text-gray-300" />
      </div>
    </Card>
  );
}

function daysUntil(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return 'Today!';
  if (d === 1) return 'Tomorrow';
  return `${d} days`;
}

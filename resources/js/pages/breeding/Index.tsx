import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
  Heart, Syringe, Search, Baby, Calendar,
  CheckCircle, Clock, AlertTriangle, ChevronRight, Plus, Flame,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';
import type { PageProps, BreedingKPIs, AIService, HeatEvent, SyncProgram } from '@/types';
import { formatDate } from '@/utils/format';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BreedingIndex() {
  const { kpis, upcomingCalvings, duePDChecks, pendingHeats, activeSync, recentServices, auth } =
    usePage<BreedingIndexProps>().props;

  const isVetOrAbove = ['farm_owner', 'farm_manager', 'vet_officer'].includes(auth.role);

  const [tab, setTab] = useState<Tab>('Overview');

  return (
    <AppLayout title="Breeding">
      {/* ── Header ── */}
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-4">
          <h1 className="text-white text-xl font-bold">Breeding</h1>
          <button
            onClick={() => router.visit('/breeding/ai/new')}
            className="flex items-center gap-1.5 bg-blue-500 text-white px-3 py-2 rounded-full text-sm font-semibold active:opacity-80"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Record AI
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-2">
          <KpiBox
            label="Pregnant"
            value={kpis.confirmed_pregnant}
            icon="🤰"
            onClick={() => { setTab('Services'); }}
          />
          <KpiBox
            label="Conception"
            value={`${kpis.conception_rate_90d}%`}
            icon="🎯"
            sub="90 days"
            onClick={() => { setTab('Services'); }}
          />
          <KpiBox
            label="PD Due"
            value={kpis.pending_pd_checks}
            icon="🔍"
            onClick={() => router.visit('/breeding/pd/new')}
          />
          <KpiBox
            label="Calvings"
            value={kpis.upcoming_calvings_14d}
            icon="🐄"
            sub="14 days"
            onClick={() => { setTab('Overview'); }}
          />
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex bg-white border-b border-gray-100">
        {TABS.map(t => (
          <button
            key={t}
            type="button"
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

      {/* ── Tab content ── */}
      <div className="px-4 py-4 space-y-5 pb-32">
        {tab === 'Overview' && (
          <OverviewTab
            pendingHeats={pendingHeats}
            duePDChecks={duePDChecks}
            upcomingCalvings={upcomingCalvings}
            isVetOrAbove={isVetOrAbove}
          />
        )}
        {tab === 'Services' && <ServicesTab services={recentServices} />}
        {tab === 'Sync'     && <SyncTab programs={activeSync} isVetOrAbove={isVetOrAbove} />}
      </div>

      {/* ── Quick action bar ── */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-3 pointer-events-none">
        <div className={`bg-white border border-gray-200 rounded-xl shadow-lg p-3 grid gap-2 pointer-events-auto ${isVetOrAbove ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <QuickBtn label="Heat"    icon={<Flame className="h-5 w-5" />}   color="text-red-600 bg-red-50"       href="/breeding/heat/new" />
          <QuickBtn label="AI"      icon={<Syringe className="h-5 w-5" />} color="text-blue-600 bg-blue-50"     href="/breeding/ai/new" />
          {isVetOrAbove && (
            <QuickBtn label="PD"    icon={<Search className="h-5 w-5" />}  color="text-purple-600 bg-purple-50" href="/breeding/pd/new" />
          )}
          <QuickBtn label="Calving" icon={<Baby className="h-5 w-5" />}    color="text-green-600 bg-green-50"   href="/breeding/calving/new" />
        </div>
      </div>
    </AppLayout>
  );
}

function QuickBtn({ label, icon, color, href }: { label: string; icon: React.ReactNode; color: string; href: string }) {
  return (
    <button
      onClick={() => router.visit(href)}
      className={clsx('flex flex-col items-center gap-1 rounded-xl py-3 active:opacity-70', color)}
    >
      {icon}
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

function KpiBox({ label, value, icon, sub, onClick }: {
  label: string;
  value: number | string;
  icon: string;
  sub?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white/10 rounded-xl p-2 text-center active:bg-white/20 transition-colors"
    >
      <p className="text-base">{icon}</p>
      <p className="text-white text-base font-bold leading-tight">{value}</p>
      <p className="text-primary-200 text-[10px] mt-0.5">{label}</p>
      {sub && <p className="text-primary-300 text-[9px]">{sub}</p>}
    </button>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  pendingHeats, duePDChecks, upcomingCalvings, isVetOrAbove,
}: {
  pendingHeats: HeatEvent[];
  duePDChecks: AIService[];
  upcomingCalvings: AIService[];
  isVetOrAbove: boolean;
}) {
  const allClear = pendingHeats.length === 0 && duePDChecks.length === 0 && upcomingCalvings.length === 0;

  return (
    <>
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

      {duePDChecks.length > 0 && isVetOrAbove && (
        <Section title="🔍 Pregnancy Checks Due" action="Record PD" onAction={() => router.visit('/breeding/pd/new')}>
          {duePDChecks.map(s => (
            <ActionCard
              key={s.id}
              icon={<Search className="h-5 w-5 text-purple-500" />}
              title={s.animal?.name ?? s.animal?.tag_number ?? ''}
              sub={`AI on ${formatDate(s.service_date)} · Service #${s.service_number}`}
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
              badge={{ label: daysUntil(s.expected_calving_date), variant: 'warning' }}
              onClick={() => router.visit('/breeding/calving/new')}
            />
          ))}
        </Section>
      )}

      {allClear && (
        <Card className="text-center py-10">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-sm font-semibold text-gray-800">All clear</p>
          <p className="text-xs text-gray-500 mt-1">No immediate breeding actions needed</p>
        </Card>
      )}

      {/* Shortcut tiles */}
      <div className={`grid gap-3 ${isVetOrAbove ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {isVetOrAbove && (
          <button
            onClick={() => router.visit('/breeding/sync/new')}
            className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-left active:opacity-80"
          >
            <Calendar className="h-6 w-6 text-indigo-600 mb-2" />
            <p className="text-sm font-semibold text-indigo-900">Sync Program</p>
            <p className="text-xs text-indigo-600">Ovsynch / CIDR</p>
          </button>
        )}
        <button
          onClick={() => router.visit('/breeding/heat/new')}
          className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-left active:opacity-80"
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

const RESULT_LABELS: Record<string, string> = {
  pending:            'Pending PD',
  confirmed_pregnant: 'Pregnant',
  not_pregnant:       'Not Pregnant',
  repeat:             'Repeat',
};

const RESULT_VARIANTS: Record<string, 'success' | 'error' | 'warning' | 'neutral'> = {
  pending:            'neutral',
  confirmed_pregnant: 'success',
  not_pregnant:       'error',
  repeat:             'warning',
};

type ServiceFilter = 'all' | 'pending' | 'confirmed_pregnant' | 'not_pregnant';

const FILTER_OPTIONS: { value: ServiceFilter; label: string }[] = [
  { value: 'all',               label: 'All' },
  { value: 'pending',           label: 'Pending PD' },
  { value: 'confirmed_pregnant',label: 'Pregnant' },
  { value: 'not_pregnant',      label: 'Not Pregnant' },
];

function ServicesTab({ services }: { services: AIService[] }) {
  const [filter, setFilter] = React.useState<ServiceFilter>('all');

  const filtered = filter === 'all' ? services : services.filter(s => s.result === filter);

  if (services.length === 0) {
    return (
      <Card className="text-center py-10">
        <p className="text-3xl mb-2">🐄</p>
        <p className="text-sm font-semibold text-gray-800">No AI services yet</p>
        <button
          onClick={() => router.visit('/breeding/ai/new')}
          className="mt-3 text-primary-900 text-sm font-medium underline"
        >
          Record first AI service
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTER_OPTIONS.map(f => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={clsx(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
              filter === f.value
                ? 'bg-primary-900 text-white border-primary-900'
                : 'bg-white text-gray-600 border-gray-300',
            )}
          >
            {f.label}
            {f.value !== 'all' && (
              <span className="ml-1 opacity-70">
                ({services.filter(s => s.result === f.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-sm text-gray-500">No {RESULT_LABELS[filter] ?? filter} services</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <Card key={s.id} padding="sm">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Syringe className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {s.animal?.name ?? s.animal?.tag_number}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(s.service_date)} · Service #{s.service_number}</p>
                  {s.expected_calving_date && s.result === 'confirmed_pregnant' && (
                    <p className="text-xs text-green-700 mt-0.5 font-medium">
                      Due: {formatDate(s.expected_calving_date)}
                    </p>
                  )}
                </div>
                <Badge variant={RESULT_VARIANTS[s.result] ?? 'neutral'} size="sm">
                  {RESULT_LABELS[s.result] ?? s.result}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sync Tab ─────────────────────────────────────────────────────────────────

function SyncTab({ programs, isVetOrAbove }: { programs: SyncProgram[]; isVetOrAbove: boolean }) {
  const [completing, setCompleting] = React.useState<string | null>(null);

  const markStepComplete = (stepId: string) => {
    setCompleting(stepId);
    router.patch(
      `/breeding/sync-step/${stepId}/complete`,
      {},
      {
        preserveScroll: true,
        onSuccess: () => router.reload({ only: ['activeSync'] }),
        onFinish: () => setCompleting(null),
      },
    );
  };

  if (programs.length === 0) {
    return (
      <div className="space-y-3">
        <Card className="text-center py-8">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-sm font-semibold text-gray-800">No active programs</p>
          {isVetOrAbove && (
            <button
              onClick={() => router.visit('/breeding/sync/new')}
              className="mt-3 text-primary-900 text-sm font-medium underline"
            >
              Start Ovsynch or CIDR program
            </button>
          )}
        </Card>
        <Card padding="md" className="bg-blue-50 border border-blue-200">
          <p className="text-sm font-bold text-blue-900 mb-2">Ovsynch Protocol</p>
          <div className="space-y-1 text-xs text-blue-700">
            {['Day 0: GnRH injection', 'Day 7: PGF2a injection', 'Day 9: GnRH injection', 'Day 10 AM: Timed AI'].map(s => (
              <p key={s}>• {s}</p>
            ))}
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
              <p className="text-xs text-gray-500">
                {p.animal?.name ?? p.animal?.tag_number} · Started {formatDate(p.start_date)}
              </p>
            </div>
            <Badge variant="info" size="sm">Active</Badge>
          </div>
          <div className="space-y-2">
            {(p.steps ?? []).map(step => (
              <div key={step.id} className="flex items-center gap-2">
                {step.is_completed
                  ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  : <Clock className="h-4 w-4 text-gray-300 flex-shrink-0" />}
                <div className="flex-1">
                  <p className={clsx('text-xs font-medium', step.is_completed ? 'text-gray-400 line-through' : 'text-gray-700')}>
                    {step.custom_label ?? step.event_type}
                  </p>
                  <p className="text-[10px] text-gray-400">{formatDate(step.scheduled_on)}</p>
                </div>
                {!step.is_completed && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge variant={new Date(step.scheduled_on) <= new Date() ? 'error' : 'neutral'} size="sm">
                      {new Date(step.scheduled_on) <= new Date() ? 'Due!' : 'Upcoming'}
                    </Badge>
                    {isVetOrAbove && (
                      <button
                        onClick={() => markStepComplete(step.id)}
                        disabled={completing === step.id}
                        className="text-[10px] font-semibold text-primary-900 bg-primary-50 border border-primary-200 rounded-lg px-2 py-1 active:opacity-70 disabled:opacity-40"
                      >
                        {completing === step.id ? '...' : 'Done'}
                      </button>
                    )}
                  </div>
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
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        {action && (
          <button onClick={onAction} className="text-xs text-primary-900 font-medium">
            {action} →
          </button>
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

function daysUntil(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return 'Today!';
  if (d === 1) return 'Tomorrow';
  return `${d} days`;
}

import React, { useState } from 'react';
import { router, usePage, useForm } from '@inertiajs/react';
import {
  ChevronLeft, AlertTriangle, CheckCircle2, Circle,
  ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { clsx } from 'clsx';
import type { PageProps } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedLog {
  id: string; log_date: string; milk_litres: number;
  starter_kg: number; legends_grams: number; feed_type?: string; notes?: string;
}

interface WeightLog {
  id: string; weighed_date: string; weight_kg: number; notes?: string;
}

interface Vaccination {
  id: string; vaccine_name: string; due_date: string;
  completed_date?: string; administered_by?: string; notes?: string;
  is_overdue: boolean; is_due_soon: boolean;
}

interface HealthEvent {
  id: string; event_date: string; disease_name: string; symptoms: string[];
  severity: 'mild' | 'moderate' | 'severe'; action_taken?: string;
  vet_called: boolean; notes?: string;
}

interface Practice {
  id: string; practice_name: string; due_age_label: string;
  completed_date?: string; notes?: string;
}

interface Disease {
  name: string; risk_age: string; signs: string[]; treatment: string;
  products: { name: string; supplier: string; vet_rx: boolean }[];
}

interface FeedScheduleRow {
  phase: string; milk: string; starter: string; legends: string;
}

interface CalfDetail {
  id: string; name: string; tag_number: string; breed: string;
  sex: string; dam?: string; dob: string; age_label: string;
  phase: string; alert_count: number;
  alerts: { severity: string; message: string }[];
  birth_weight_kg?: number; housing_notes?: string;
  average_daily_gain?: number; current_weight_kg?: number;
  recommended_milk: string; recommended_starter: string; recommended_legends_g: number;
  feed_logs: FeedLog[]; weight_logs: WeightLog[]; vaccinations: Vaccination[];
  health_events: HealthEvent[]; practices: Practice[];
}

interface Props extends PageProps {
  calf: CalfDetail;
  disease_reference: Disease[];
  feeding_schedule: { all: FeedScheduleRow[]; current?: FeedScheduleRow };
}

// ─── Phase badge styling ───────────────────────────────────────────────────────

const PHASE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  colostrum:    { label: 'Colostrum',    bg: '#FFF8E1', text: '#F9A825' },
  early_milk:   { label: 'Early Milk',   bg: '#FFF3E0', text: '#FF6D00' },
  pre_weaning:  { label: 'Pre-Weaning',  bg: '#E3F2FD', text: '#1565C0' },
  post_weaning: { label: 'Post-Weaning', bg: '#E8F5E9', text: '#2E7D32' },
  growing:      { label: 'Growing',      bg: '#F5F5F5', text: '#616161' },
};

const TABS = ['Feeding', 'Growth', 'Health', 'Practices', 'Housing'] as const;
type Tab = typeof TABS[number];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalfManagementShow() {
  const { calf, disease_reference, feeding_schedule } = usePage<Props>().props;
  const [tab, setTab] = useState<Tab>('Feeding');
  const phase = PHASE_STYLES[calf.phase] ?? PHASE_STYLES.growing;

  return (
    <AppLayout title={calf.name}>
      {/* Green header */}
      <div className="bg-[#2E7D32] pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3 mb-3">
          <button
            onClick={() => router.visit('/calf-management')}
            className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center"
          >
            <ChevronLeft className="h-5 w-5 text-white" strokeWidth={2} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-[20px] font-bold truncate">{calf.name}</h1>
            <p className="text-white/70 text-[13px]">{calf.tag_number} · {calf.breed}</p>
          </div>
          <span
            className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: phase.bg, color: phase.text }}
          >
            {phase.label}
          </span>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-4 gap-2">
          <StatItem label="Age"    value={calf.age_label} />
          <StatItem label="Sex"    value={calf.sex} />
          <StatItem label="Dam"    value={calf.dam ?? '—'} />
          <StatItem label="Alerts" value={String(calf.alert_count)} warn={calf.alert_count > 0} />
        </div>
      </div>

      {/* Alert banner */}
      {calf.alerts.some(a => a.severity === 'critical') && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            {calf.alerts.filter(a => a.severity === 'critical').map((a, i) => (
              <p key={i} className="text-[13px] text-red-700">{a.message}</p>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex overflow-x-auto bg-white border-b border-gray-100 px-4 gap-4"
        style={{ scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'text-[14px] font-medium py-3 whitespace-nowrap border-b-2 transition-colors',
              tab === t
                ? 'border-[#2E7D32] text-[#2E7D32]'
                : 'border-transparent text-gray-500',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 py-4 pb-28 space-y-4">
        {tab === 'Feeding'   && <FeedingTab calf={calf} schedule={feeding_schedule} />}
        {tab === 'Growth'    && <GrowthTab calf={calf} />}
        {tab === 'Health'    && <HealthTab calf={calf} diseases={disease_reference} />}
        {tab === 'Practices' && <PracticesTab calf={calf} />}
        {tab === 'Housing'   && <HousingTab calf={calf} />}
      </div>
    </AppLayout>
  );
}

// ─── Tab: Feeding ─────────────────────────────────────────────────────────────

function FeedingTab({ calf, schedule }: { calf: CalfDetail; schedule: Props['feeding_schedule'] }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    log_date: new Date().toISOString().slice(0, 10),
    milk_litres: '',
    starter_kg: '',
    legends_grams: String(calf.recommended_legends_g),
    feed_type: '',
    notes: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(`/calf-management/${calf.id}/feed-logs`, { onSuccess: () => reset() });
  };

  return (
    <div className="space-y-4">
      {/* Recommended ration card */}
      {schedule.current && (
        <SectionCard title={`Recommended Ration — ${schedule.current.phase}`} accent="#F9A825">
          <div className="grid grid-cols-3 gap-2 mt-2">
            <RationCell label="Milk/Day" value={schedule.current.milk} />
            <RationCell label="Starter/Day" value={schedule.current.starter} />
            <RationCell label="CKL Legends" value={schedule.current.legends} />
          </div>
        </SectionCard>
      )}

      {/* Log form */}
      <SectionCard title="Log Today's Feeding" accent="#2E7D32">
        <form onSubmit={submit} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date" error={errors.log_date}>
              <input type="date" className="form-input text-sm" value={data.log_date}
                onChange={e => setData('log_date', e.target.value)} />
            </FormField>
            <FormField label="Milk (litres)" error={errors.milk_litres}>
              <input type="number" step="0.1" min="0" className="form-input text-sm"
                placeholder="e.g. 5.5" value={data.milk_litres}
                onChange={e => setData('milk_litres', e.target.value)} />
            </FormField>
            <FormField label="Starter (kg)" error={errors.starter_kg}>
              <input type="number" step="0.01" min="0" className="form-input text-sm"
                placeholder="e.g. 1.5" value={data.starter_kg}
                onChange={e => setData('starter_kg', e.target.value)} />
            </FormField>
            <FormField label="CKL Legends (g)" error={errors.legends_grams}>
              <input type="number" step="0.1" min="0" className="form-input text-sm"
                value={data.legends_grams}
                onChange={e => setData('legends_grams', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Notes" error={errors.notes}>
            <input type="text" className="form-input text-sm" placeholder="Optional"
              value={data.notes} onChange={e => setData('notes', e.target.value)} />
          </FormField>
          <SubmitBtn processing={processing} label="Save Feed Log" />
        </form>
      </SectionCard>

      {/* Last 7 logs */}
      {calf.feed_logs.length > 0 && (
        <SectionCard title="Last 7 Days">
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-1.5 font-medium">Date</th>
                  <th className="text-right pb-1.5 font-medium">Milk L</th>
                  <th className="text-right pb-1.5 font-medium">Starter kg</th>
                  <th className="text-right pb-1.5 font-medium">Legends g</th>
                </tr>
              </thead>
              <tbody>
                {calf.feed_logs.map(log => (
                  <tr key={log.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-1.5 text-gray-700">{log.log_date}</td>
                    <td className="py-1.5 text-right text-gray-700">{log.milk_litres.toFixed(1)}</td>
                    <td className="py-1.5 text-right text-gray-700">{log.starter_kg.toFixed(2)}</td>
                    <td className="py-1.5 text-right text-gray-700">{log.legends_grams.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Supplement card */}
      <SectionCard title="Supplement Guide" accent="#1565C0">
        {calf.recommended_legends_g > 0 ? (
          <p className="text-[14px] text-gray-700 mt-1">
            CKL Xtra Legends: <strong>{calf.recommended_legends_g}g/day</strong> for current age.
          </p>
        ) : (
          <p className="text-[14px] text-gray-700 mt-1">
            Switch to <strong>Maclik Plus 100g/day</strong> — calf is 6+ months old.
          </p>
        )}
      </SectionCard>

      {/* Kamboost tip */}
      {(calf.phase === 'pre_weaning' || calf.health_events?.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-[14px] font-semibold text-amber-800">Kamboost Tip</p>
          <p className="text-[13px] text-amber-700 mt-1">
            Administer Kamboost during weaning and after any health event to support immunity and recovery.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Growth ──────────────────────────────────────────────────────────────

function GrowthTab({ calf }: { calf: CalfDetail }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    weighed_date: new Date().toISOString().slice(0, 10),
    weight_kg: '',
    notes: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(`/calf-management/${calf.id}/weight-logs`, { onSuccess: () => reset() });
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Current Weight" value={calf.current_weight_kg ? `${calf.current_weight_kg} kg` : '—'} />
        <StatCard
          label="Avg Daily Gain"
          value={calf.average_daily_gain != null ? `${calf.average_daily_gain}g/day` : '—'}
          warn={calf.average_daily_gain != null && calf.average_daily_gain < 500}
        />
        <StatCard label="Birth Weight" value={calf.birth_weight_kg ? `${calf.birth_weight_kg} kg` : '—'} />
        <StatCard
          label="Weaning Status"
          value={calf.phase === 'post_weaning' || calf.phase === 'growing' ? 'Weaned' : 'Not yet weaned'}
        />
      </div>

      {/* Reference targets */}
      <SectionCard title="Reference Targets">
        <div className="flex gap-4 mt-2 text-[13px] text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#2E7D32]" />75 kg = Weaning target
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#1565C0]" />150 kg = 12-month target
          </span>
        </div>
        <p className="text-[12px] text-gray-400 mt-1">
          Weaning trigger: eating ≥ 2kg starter/day AND weight ~70–80kg
        </p>
      </SectionCard>

      {/* Weight chart (simple table-based) */}
      {calf.weight_logs.length > 0 && (
        <SectionCard title="Weight History">
          <SimpleWeightChart logs={calf.weight_logs} />
        </SectionCard>
      )}

      {/* Weight log form */}
      <SectionCard title="Record Weight" accent="#2E7D32">
        <form onSubmit={submit} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date" error={errors.weighed_date}>
              <input type="date" className="form-input text-sm" value={data.weighed_date}
                onChange={e => setData('weighed_date', e.target.value)} />
            </FormField>
            <FormField label="Weight (kg)" error={errors.weight_kg}>
              <input type="number" step="0.1" min="0" className="form-input text-sm"
                placeholder="e.g. 75.0" value={data.weight_kg}
                onChange={e => setData('weight_kg', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Notes" error={errors.notes}>
            <input type="text" className="form-input text-sm" placeholder="Optional"
              value={data.notes} onChange={e => setData('notes', e.target.value)} />
          </FormField>
          <SubmitBtn processing={processing} label="Save Weight" />
        </form>
      </SectionCard>
    </div>
  );
}

// ─── Tab: Health ──────────────────────────────────────────────────────────────

function HealthTab({ calf, diseases }: { calf: CalfDetail; diseases: Disease[] }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    event_date: new Date().toISOString().slice(0, 10),
    disease_name: '',
    symptoms: [] as string[],
    severity: 'mild',
    action_taken: '',
    vet_called: false,
    notes: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(`/calf-management/${calf.id}/health-events`, { onSuccess: () => reset() });
  };

  return (
    <div className="space-y-4">
      {/* Vaccination checklist */}
      <SectionCard title="Vaccination Schedule">
        <div className="space-y-2 mt-2">
          {calf.vaccinations.map(vax => (
            <VaccinationRow key={vax.id} vax={vax} calfId={calf.id} />
          ))}
        </div>
      </SectionCard>

      {/* Disease reference cards */}
      <SectionCard title="Disease Reference">
        <div className="space-y-2 mt-2">
          {diseases.map(disease => (
            <DiseaseCard key={disease.name} disease={disease} />
          ))}
        </div>
      </SectionCard>

      {/* Log health event */}
      <SectionCard title="Log Health Event" accent="#FF3B30">
        <form onSubmit={submit} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date" error={errors.event_date}>
              <input type="date" className="form-input text-sm" value={data.event_date}
                onChange={e => setData('event_date', e.target.value)} />
            </FormField>
            <FormField label="Disease/Condition" error={errors.disease_name}>
              <input type="text" className="form-input text-sm"
                placeholder="e.g. Scours" value={data.disease_name}
                onChange={e => setData('disease_name', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Severity" error={errors.severity}>
            <select className="form-input text-sm" value={data.severity}
              onChange={e => setData('severity', e.target.value)}>
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </FormField>
          <FormField label="Action Taken" error={errors.action_taken}>
            <textarea className="form-input text-sm min-h-[60px]"
              placeholder="Treatment given, vet contacted..."
              value={data.action_taken}
              onChange={e => setData('action_taken', e.target.value)} />
          </FormField>
          <label className="flex items-center gap-2 text-[14px] text-gray-700 cursor-pointer">
            <input type="checkbox" className="rounded"
              checked={data.vet_called}
              onChange={e => setData('vet_called', e.target.checked)} />
            Vet was called
          </label>
          {data.severity === 'severe' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-[12px] text-red-700">
              A critical alert will be pushed to the home screen for severe events.
            </div>
          )}
          <SubmitBtn processing={processing} label="Log Health Event" />
        </form>
      </SectionCard>

      {/* Past health events */}
      {calf.health_events.length > 0 && (
        <SectionCard title="Past Health Events">
          <div className="space-y-2 mt-2">
            {calf.health_events.map(evt => (
              <div key={evt.id} className="p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={evt.severity} />
                  <span className="text-[14px] font-semibold text-black">{evt.disease_name}</span>
                  <span className="text-[12px] text-gray-400 ml-auto">{evt.event_date}</span>
                </div>
                {evt.action_taken && (
                  <p className="text-[13px] text-gray-600 mt-1">{evt.action_taken}</p>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Tab: Practices ───────────────────────────────────────────────────────────

function PracticesTab({ calf }: { calf: CalfDetail }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Management Milestones">
        <div className="space-y-2 mt-2">
          {calf.practices.map(practice => (
            <PracticeRow key={practice.id} practice={practice} calfId={calf.id} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Tab: Housing ─────────────────────────────────────────────────────────────

function HousingTab({ calf }: { calf: CalfDetail }) {
  const { data, setData, patch, processing } = useForm({
    housing_notes: calf.housing_notes ?? '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    patch(`/calf-management/${calf.id}/housing`);
  };

  const tips = [
    'Ensure adequate ventilation (no draughts on calves)',
    'Use clean, dry bedding — change at least 2× per week',
    'Keep pen dry — damp conditions cause pneumonia and scours',
    'Isolate sick calves immediately',
    'Disinfect pens between calves',
    'Provide fresh water from 2 weeks of age',
    'Keep feeding equipment clean and sanitised daily',
  ];

  return (
    <div className="space-y-4">
      <SectionCard title="Housing Checklist">
        <ul className="space-y-2 mt-2">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-[14px] text-gray-700">
              <CheckCircle2 className="h-4 w-4 text-[#2E7D32] shrink-0 mt-0.5" strokeWidth={2} />
              {tip}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Housing Notes" accent="#2E7D32">
        <form onSubmit={submit} className="space-y-3 mt-2">
          <textarea
            className="form-input text-sm w-full min-h-[120px]"
            placeholder="Pen number, bedding type, special observations..."
            value={data.housing_notes}
            onChange={e => setData('housing_notes', e.target.value)}
          />
          <SubmitBtn processing={processing} label="Save Notes" />
        </form>
      </SectionCard>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VaccinationRow({ vax, calfId }: { vax: Vaccination; calfId: string }) {
  const [open, setOpen] = useState(false);
  const { data, setData, patch, processing } = useForm({
    completed_date: new Date().toISOString().slice(0, 10),
    administered_by: '',
    notes: '',
  });

  const markDone = (e: React.FormEvent) => {
    e.preventDefault();
    patch(`/calf-management/${calfId}/vaccinations/${vax.id}`, { onSuccess: () => setOpen(false) });
  };

  const borderColor = vax.completed_date ? '#2E7D32' : vax.is_overdue ? '#FF3B30' : vax.is_due_soon ? '#FF9500' : '#E0E0E0';

  return (
    <div className="rounded-xl border p-3" style={{ borderColor }}>
      <div className="flex items-center gap-3">
        {vax.completed_date
          ? <CheckCircle2 className="h-5 w-5 text-[#2E7D32] shrink-0" strokeWidth={2} />
          : <Circle className="h-5 w-5 text-gray-300 shrink-0" strokeWidth={1.5} />
        }
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-black">{vax.vaccine_name}</p>
          <p className="text-[12px] text-gray-500">
            Due: {vax.due_date}
            {vax.completed_date && ` · Done: ${vax.completed_date}`}
            {vax.is_overdue && <span className="text-red-600 font-medium"> · OVERDUE</span>}
            {vax.is_due_soon && !vax.is_overdue && <span className="text-amber-600 font-medium"> · Due soon</span>}
          </p>
        </div>
        {!vax.completed_date && (
          <button
            onClick={() => setOpen(!open)}
            className="text-[13px] font-medium text-[#2E7D32] shrink-0"
          >
            Mark Done
          </button>
        )}
      </div>
      {open && (
        <form onSubmit={markDone} className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Date administered">
              <input type="date" className="form-input text-sm" value={data.completed_date}
                onChange={e => setData('completed_date', e.target.value)} />
            </FormField>
            <FormField label="Administered by">
              <input type="text" className="form-input text-sm" placeholder="Name/vet"
                value={data.administered_by}
                onChange={e => setData('administered_by', e.target.value)} />
            </FormField>
          </div>
          <SubmitBtn processing={processing} label="Confirm" small />
        </form>
      )}
    </div>
  );
}

function PracticeRow({ practice, calfId }: { practice: Practice; calfId: string }) {
  const [open, setOpen] = useState(false);
  const { data, setData, patch, processing } = useForm({
    completed_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const markDone = (e: React.FormEvent) => {
    e.preventDefault();
    patch(`/calf-management/${calfId}/practices/${practice.id}`, { onSuccess: () => setOpen(false) });
  };

  return (
    <div className={clsx('rounded-xl border p-3', practice.completed_date ? 'border-[#2E7D32]/30' : 'border-gray-200')}>
      <div className="flex items-center gap-3">
        {practice.completed_date
          ? <CheckCircle2 className="h-5 w-5 text-[#2E7D32] shrink-0" strokeWidth={2} />
          : <Circle className="h-5 w-5 text-gray-300 shrink-0" strokeWidth={1.5} />
        }
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-black">{practice.practice_name}</p>
          <p className="text-[12px] text-gray-500">
            When: {practice.due_age_label}
            {practice.completed_date && ` · Done: ${practice.completed_date}`}
          </p>
        </div>
        {!practice.completed_date && (
          <button onClick={() => setOpen(!open)} className="text-[13px] font-medium text-[#2E7D32] shrink-0">
            Mark Done
          </button>
        )}
      </div>
      {open && (
        <form onSubmit={markDone} className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <FormField label="Completed date">
            <input type="date" className="form-input text-sm" value={data.completed_date}
              onChange={e => setData('completed_date', e.target.value)} />
          </FormField>
          <SubmitBtn processing={processing} label="Confirm" small />
        </form>
      )}
    </div>
  );
}

function DiseaseCard({ disease }: { disease: Disease }) {
  const [open, setOpen] = useState(false);

  const supplierLinks: Record<string, string> = {
    CKL:      'https://www.ckl.africa/contact-us/distributors',
    Atlantis: 'https://atlantislife.co.ke/contact/',
  };

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-white"
      >
        <div>
          <span className="text-[14px] font-semibold text-black">{disease.name}</span>
          <span className="text-[12px] text-gray-400 ml-2">Risk: {disease.risk_age}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-3 pb-3 bg-gray-50 space-y-2 border-t border-gray-100">
          <div>
            <p className="text-[12px] font-semibold text-gray-500 mt-2 mb-1">Signs:</p>
            <ul className="space-y-0.5">
              {disease.signs.map((s, i) => (
                <li key={i} className="text-[13px] text-gray-700 flex gap-1.5">
                  <span className="text-gray-400">·</span>{s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-gray-500 mb-1">Treatment:</p>
            <p className="text-[13px] text-gray-700">{disease.treatment}</p>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-gray-500 mb-1">Products:</p>
            <div className="space-y-1.5">
              {disease.products.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] text-gray-800 font-medium">{p.name}</span>
                    {p.vet_rx && (
                      <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded">
                        Vet Rx
                      </span>
                    )}
                  </div>
                  <a
                    href={supplierLinks[p.supplier] ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] text-[#1565C0] flex items-center gap-0.5"
                  >
                    {p.supplier} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-gray-400 italic border-t border-gray-200 pt-2">
            Always consult a licensed veterinarian before administering any treatment.
          </p>
        </div>
      )}
    </div>
  );
}

function SimpleWeightChart({ logs }: { logs: WeightLog[] }) {
  const max = Math.max(...logs.map(l => l.weight_kg), 1);
  const w = 300;
  const h = 120;
  const pad = 8;

  const points = logs.map((l, i) => {
    const x = pad + (i / Math.max(logs.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((l.weight_kg / max) * (h - pad * 2));
    return `${x},${y}`;
  }).join(' ');

  const ref75y  = h - pad - ((75  / max) * (h - pad * 2));
  const ref150y = h - pad - ((150 / max) * (h - pad * 2));

  return (
    <div className="overflow-x-auto mt-2">
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="max-w-full">
        {/* Reference lines */}
        {max >= 75  && <line x1={pad} y1={ref75y}  x2={w - pad} y2={ref75y}  stroke="#2E7D32" strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />}
        {max >= 150 && <line x1={pad} y1={ref150y} x2={w - pad} y2={ref150y} stroke="#1565C0" strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />}
        {/* Data line */}
        {logs.length > 1 && (
          <polyline points={points} stroke="#2E7D32" strokeWidth="2" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
        )}
        {/* Dots */}
        {logs.map((l, i) => {
          const x = pad + (i / Math.max(logs.length - 1, 1)) * (w - pad * 2);
          const y = h - pad - ((l.weight_kg / max) * (h - pad * 2));
          return <circle key={l.id} cx={x} cy={y} r="4" fill="#2E7D32" />;
        })}
      </svg>
      <div className="flex gap-4 mt-1 text-[12px] text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-[#2E7D32] opacity-50" style={{ border: '1px dashed #2E7D32' }} />75kg</span>
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-[#1565C0] opacity-50" style={{ border: '1px dashed #1565C0' }} />150kg</span>
      </div>
    </div>
  );
}

// ─── Primitive UI helpers ─────────────────────────────────────────────────────

function SectionCard({ title, children, accent }: {
  title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {accent && <div className="h-0.5" style={{ background: accent }} />}
      <div className="p-4">
        <p className="text-[15px] font-semibold text-black">{title}</p>
        {children}
      </div>
    </div>
  );
}

function StatItem({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="bg-white/10 rounded-lg p-2 text-center">
      <p className={clsx('text-[15px] font-bold truncate', warn ? 'text-[#FF6B6B]' : 'text-white')}>{value}</p>
      <p className="text-[11px] text-white/60 mt-0.5">{label}</p>
    </div>
  );
}

function StatCard({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className={clsx('text-[20px] font-bold', warn ? 'text-[#FF3B30]' : 'text-black')}>{value}</p>
      <p className="text-[13px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function RationCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-amber-50 rounded-lg p-2.5 text-center">
      <p className="text-[13px] font-semibold text-amber-900">{value}</p>
      <p className="text-[11px] text-amber-600 mt-0.5">{label}</p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    mild:     'bg-blue-100 text-blue-700',
    moderate: 'bg-amber-100 text-amber-700',
    severe:   'bg-red-100 text-red-700',
  };
  return (
    <span className={clsx('text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize', styles[severity] ?? styles.mild)}>
      {severity}
    </span>
  );
}

function FormField({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="text-[13px] font-medium text-gray-600 block mb-1">{label}</label>
      {children}
      {error && <p className="text-[11px] text-red-600 mt-0.5">{error}</p>}
    </div>
  );
}

function SubmitBtn({ processing, label, small = false }: { processing: boolean; label: string; small?: boolean }) {
  return (
    <button
      type="submit"
      disabled={processing}
      className={clsx(
        'w-full rounded-[12px] bg-[#2E7D32] text-white font-semibold disabled:opacity-50 active:opacity-80',
        small ? 'h-[38px] text-[14px]' : 'h-[48px] text-[15px]',
      )}
    >
      {processing ? 'Saving…' : label}
    </button>
  );
}

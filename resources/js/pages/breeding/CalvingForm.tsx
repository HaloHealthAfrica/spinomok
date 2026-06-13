import React from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Baby } from 'lucide-react';
import { clsx } from 'clsx';
import type { PageProps, Animal, AIService } from '@/types';
import { today, formatDate } from '@/utils/format';

interface CalvingFormProps extends PageProps {
  pregnant: Animal[];
  confirmedServices: AIService[];
}

const EASE_OPTIONS = [
  { value: 'easy',              label: '1 — Easy (no help)' },
  { value: 'slight_assistance', label: '2 — Slight help' },
  { value: 'major_assistance',  label: '3 — Major help' },
  { value: 'caesarean',         label: '4 — C-section' },
  { value: 'abnormal',          label: '5 — Abnormal' },
];

const OUTCOMES = [
  { value: 'alive',           label: 'Alive',      emoji: '✅', color: 'text-green-700 bg-green-50 border-green-300' },
  { value: 'stillborn',       label: 'Stillborn',  emoji: '💔', color: 'text-red-700 bg-red-50 border-red-300' },
  { value: 'died_within_24h', label: 'Died <24h',  emoji: '⚠️', color: 'text-amber-700 bg-amber-50 border-amber-300' },
];

export default function CalvingForm() {
  const { pregnant, confirmedServices } = usePage<CalvingFormProps>().props;

  const { data, setData, post, processing, errors } = useForm({
    dam_id:               '',
    calved_on:            today(),
    calved_at:            '',
    ease:                 'easy',
    calf_outcome:         'alive',
    calf_sex:             'female',
    calf_tag:             '',
    calf_birth_weight_kg: '',
    breeding_record_id:   '',
    is_twin:              false,
    placenta_passed:      false,
    colostrum_given:      false,
    complications:        '',
    notes:                '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/breeding/calving');
  };

  return (
    <AppLayout title="Record Calving" showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button
            onClick={() => router.visit('/breeding')}
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">Record Calving</h1>
            <p className="text-primary-300 text-xs">Dam + calf details</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="px-4 py-4 space-y-5 pb-8">

          {/* Dam selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Dam (Mother) <span className="text-red-500">*</span>
            </label>
            {pregnant.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                No confirmed pregnant cows found. Record a pregnancy check first.
              </div>
            ) : (
              <select
                value={data.dam_id}
                onChange={e => {
                  setData('dam_id', e.target.value);
                  const svc = confirmedServices.find(s => s.animal_id === e.target.value);
                  if (svc) setData('breeding_record_id', svc.id);
                }}
                required
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                <option value="">Select pregnant cow...</option>
                {pregnant.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name ?? a.tag_number} ({a.tag_number}) · Lactation {a.parity + 1}
                    {a.expected_calving_date ? ` · Due ${formatDate(a.expected_calving_date)}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Calving date and time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Calving Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={data.calved_on}
                max={today()}
                onChange={e => setData('calved_on', e.target.value)}
                required
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Time</label>
              <input
                type="time"
                value={data.calved_at}
                onChange={e => setData('calved_at', e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
          </div>

          {/* Calving ease */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Calving Ease</label>
            <div className="space-y-2">
              {EASE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setData('ease', opt.value)}
                  className={clsx(
                    'w-full py-2.5 px-4 rounded-xl border text-sm text-left transition-all',
                    data.ease === opt.value
                      ? 'bg-primary-900 text-white border-primary-900'
                      : 'bg-white text-gray-600 border-gray-200',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calf outcome */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Calf Outcome <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {OUTCOMES.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setData('calf_outcome', o.value)}
                  className={clsx(
                    'flex-1 py-3 rounded-xl border text-xs font-semibold text-center transition-all',
                    data.calf_outcome === o.value
                      ? o.color + ' ring-2 ring-offset-1 ring-primary-600'
                      : 'bg-white text-gray-500 border-gray-200',
                  )}
                >
                  {o.emoji} {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alive-only fields */}
          {data.calf_outcome === 'alive' && (
            <>
              {/* Calf sex */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Calf Sex <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  {[
                    { value: 'female', label: '♀ Heifer (Female)' },
                    { value: 'male',   label: '♂ Bull Calf (Male)' },
                  ].map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setData('calf_sex', s.value)}
                      className={clsx(
                        'flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all',
                        data.calf_sex === s.value
                          ? 'bg-primary-900 text-white border-primary-900'
                          : 'bg-white text-gray-600 border-gray-300',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Calf Tag Number"
                  placeholder="SPM-2026-009"
                  value={data.calf_tag}
                  onChange={e => setData('calf_tag', e.target.value)}
                  error={errors.calf_tag}
                />
                <Input
                  label="Birth Weight"
                  type="number"
                  min="15"
                  max="80"
                  step="0.5"
                  inputMode="decimal"
                  placeholder="35"
                  unit="kg"
                  value={data.calf_birth_weight_kg}
                  onChange={e => setData('calf_birth_weight_kg', e.target.value)}
                />
              </div>

              {/* Twin toggle */}
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <button
                  type="button"
                  onClick={() => setData('is_twin', !data.is_twin)}
                  className={clsx(
                    'h-6 w-11 rounded-full transition-all relative flex-shrink-0',
                    data.is_twin ? 'bg-primary-900' : 'bg-gray-300',
                  )}
                >
                  <span className={clsx(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                    data.is_twin ? 'left-[22px]' : 'left-0.5',
                  )} />
                </button>
                <span className="text-sm text-gray-700 font-medium">Twin birth</span>
              </div>
            </>
          )}

          {/* Placenta & colostrum */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">Post-Calving Checklist</label>
            {[
              { field: 'placenta_passed' as const, label: 'Placenta passed' },
              { field: 'colostrum_given' as const, label: 'Colostrum given to calf' },
            ].map(({ field, label }) => (
              <button
                key={field}
                type="button"
                onClick={() => setData(field, !data[field])}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm text-left transition-all',
                  data[field]
                    ? 'bg-green-50 border-green-400 text-green-900'
                    : 'bg-white border-gray-200 text-gray-700',
                )}
              >
                <div className={clsx(
                  'h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                  data[field] ? 'bg-green-600 border-green-600' : 'border-gray-300',
                )}>
                  {data[field] && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {label}
              </button>
            ))}
          </div>

          {/* Complications */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Complications</label>
            <textarea
              value={data.complications}
              onChange={e => setData('complications', e.target.value)}
              rows={2}
              placeholder="Retained placenta, dystocia details, vet intervention..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
            />
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={processing}
            disabled={!data.dam_id}
            leftIcon={<Baby className="h-5 w-5" />}
          >
            Record Calving
          </Button>

          {/* Colostrum reminder */}
          {data.calf_outcome === 'alive' && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3">
              <p className="text-sm font-bold text-amber-900">⚠️ Colostrum Reminder</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Feed 3–4 litres of colostrum to the calf <strong>within 1 hour</strong> of birth. Critical for immunity!
              </p>
            </div>
          )}
        </div>
      </form>
    </AppLayout>
  );
}

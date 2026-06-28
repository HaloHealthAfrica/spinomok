import React from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, ClipboardCheck, Milk, Thermometer, UserRoundCheck } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { clsx } from 'clsx';
import type { Animal, PageProps } from '@/types';
import { today } from '@/utils/format';

interface MastitisFormProps extends PageProps {
  animals: Animal[];
  disease: { id: string; name: string } | null;
  preAnimal: string | null;
}

const QUARTERS = ['LF', 'RF', 'LR', 'RR'] as const;
const SCORE_OPTIONS = [
  { value: 0, label: '0', text: 'Normal', tone: 'bg-green-50 border-green-300 text-green-800' },
  { value: 1, label: '1', text: 'Trace', tone: 'bg-blue-50 border-blue-300 text-blue-800' },
  { value: 2, label: '2', text: 'Mild', tone: 'bg-amber-50 border-amber-300 text-amber-800' },
  { value: 3, label: '3', text: 'Moderate', tone: 'bg-orange-50 border-orange-300 text-orange-800' },
  { value: 4, label: '4', text: 'Severe', tone: 'bg-red-50 border-red-300 text-red-800' },
];

export default function MastitisForm() {
  const { animals, preAnimal } = usePage<MastitisFormProps>().props;
  const { data, setData, post, processing, errors } = useForm({
    animal_id: preAnimal ?? '',
    observed_on: today(),
    quarter: 'LF',
    score: 0,
    temperature_c: '',
    treatment_started: false,
    milk_discarded: false,
    vet_notified: false,
    notes: '',
  });

  const selectedScore = SCORE_OPTIONS.find(option => option.value === Number(data.score)) ?? SCORE_OPTIONS[0];
  const needsAction = Number(data.score) >= 2 || data.vet_notified || data.treatment_started || data.milk_discarded;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    post('/health/mastitis');
  };

  return (
    <AppLayout title="Mastitis Score">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button onClick={() => router.visit('/health')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">Mastitis Scoring</h1>
            <p className="text-primary-300 text-xs">Quarter score and milk safety flags</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="px-4 py-4 space-y-5 pb-8">
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-red-700 mb-1">Please fix the highlighted fields.</p>
              {Object.values(errors).map((message, index) => (
                <p key={index} className="text-xs text-red-600">{message}</p>
              ))}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Cow</label>
            <select
              value={data.animal_id}
              onChange={event => setData('animal_id', event.target.value)}
              className={clsx('h-12 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600',
                errors.animal_id ? 'border-red-500 bg-red-50' : 'border-gray-300')}
            >
              <option value="">Select cow...</option>
              {animals.map(animal => (
                <option key={animal.id} value={animal.id}>
                  {animal.name ?? animal.tag_number} ({animal.tag_number}) - {animal.status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Date</label>
            <input
              type="date"
              value={data.observed_on}
              max={today()}
              onChange={event => setData('observed_on', event.target.value)}
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Quarter</label>
            <div className="grid grid-cols-4 gap-2">
              {QUARTERS.map(quarter => (
                <button
                  key={quarter}
                  type="button"
                  onClick={() => setData('quarter', quarter)}
                  className={clsx('h-11 rounded-xl border text-sm font-bold',
                    data.quarter === quarter ? 'border-primary-800 bg-primary-50 text-primary-900' : 'border-gray-200 bg-white text-gray-600')}
                >
                  {quarter}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Severity Score</label>
            <div className="grid grid-cols-5 gap-2">
              {SCORE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setData('score', option.value)}
                  className={clsx('rounded-xl border px-2 py-3 text-center transition-all',
                    Number(data.score) === option.value ? option.tone + ' ring-2 ring-primary-700' : 'border-gray-200 bg-white text-gray-500')}
                >
                  <span className="block text-lg font-black leading-none">{option.label}</span>
                  <span className="block text-[10px] font-semibold mt-1">{option.text}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={clsx('rounded-xl border px-4 py-3', needsAction ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200')}>
            <p className={clsx('text-sm font-bold', needsAction ? 'text-amber-900' : 'text-green-900')}>
              Score {selectedScore.label}: {selectedScore.text}
            </p>
            <p className={clsx('text-xs mt-1', needsAction ? 'text-amber-700' : 'text-green-700')}>
              {Number(data.score) >= 3
                ? 'Critical alert will be created. Discard milk and notify a vet.'
                : Number(data.score) >= 2
                  ? 'Warning alert will be created. Monitor closely and record treatment if started.'
                  : 'No urgent mastitis signal from this score.'}
            </p>
          </div>

          <Input
            label="Temperature"
            type="number"
            min="35"
            max="43"
            step="0.1"
            inputMode="decimal"
            placeholder="39.2"
            unit="C"
            value={data.temperature_c}
            onChange={event => setData('temperature_c', event.target.value)}
            error={errors.temperature_c}
          />

          <div className="space-y-2">
            <ToggleRow
              icon={<ClipboardCheck className="h-4 w-4" />}
              label="Treatment started"
              checked={data.treatment_started}
              onChange={() => setData('treatment_started', !data.treatment_started)}
            />
            <ToggleRow
              icon={<Milk className="h-4 w-4" />}
              label="Milk discarded"
              checked={data.milk_discarded}
              onChange={() => setData('milk_discarded', !data.milk_discarded)}
            />
            <ToggleRow
              icon={<UserRoundCheck className="h-4 w-4" />}
              label="Vet notified"
              checked={data.vet_notified}
              onChange={() => setData('vet_notified', !data.vet_notified)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea
              value={data.notes}
              onChange={event => setData('notes', event.target.value)}
              rows={3}
              placeholder="Clots, swelling, watery milk, appetite, treatment details..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
            />
          </div>

          <Button type="submit" fullWidth size="lg" loading={processing} disabled={!data.animal_id} leftIcon={<Thermometer className="h-5 w-5" />}>
            Save Mastitis Score
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

function ToggleRow({ icon, label, checked, onChange }: { icon: React.ReactNode; label: string; checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
      <span className={clsx('h-8 w-8 rounded-full flex items-center justify-center', checked ? 'bg-primary-100 text-primary-900' : 'bg-gray-100 text-gray-500')}>
        {icon}
      </span>
      <span className="flex-1 text-left text-sm font-medium text-gray-700">{label}</span>
      <span className={clsx('h-6 w-11 rounded-full transition-all relative flex-shrink-0', checked ? 'bg-primary-900' : 'bg-gray-300')}>
        <span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  );
}

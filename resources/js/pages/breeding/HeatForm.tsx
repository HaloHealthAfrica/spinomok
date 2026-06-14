import React, { useState } from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Flame } from 'lucide-react';
import { clsx } from 'clsx';
import type { PageProps, Animal } from '@/types';
import { today } from '@/utils/format';

interface HeatFormProps extends PageProps {
  animals: Animal[];
}

const SIGNS = [
  { key: 'standing_heat',   label: 'Standing heat (being mounted)' },
  { key: 'mounting_others', label: 'Mounting other animals' },
  { key: 'clear_discharge', label: 'Clear mucus discharge' },
  { key: 'swollen_vulva',   label: 'Swollen / red vulva' },
  { key: 'restless',        label: 'Restlessness / bellowing' },
  { key: 'reduced_milk',    label: 'Reduced milk yield' },
  { key: 'off_feed',        label: 'Reduced feed intake' },
];

export default function HeatForm() {
  const { animals } = usePage<HeatFormProps>().props;
  const [selectedSigns, setSelectedSigns] = useState<string[]>([]);

  const { data, setData, post, processing, errors } = useForm({
    animal_id:        '',
    observed_on:      today(),
    observed_at:      '',
    detection_method: 'visual',
    confidence:       'certain',
    signs_observed:   [] as string[],
    notes:            '',
  });

  const toggleSign = (key: string) => {
    const updated = selectedSigns.includes(key)
      ? selectedSigns.filter(s => s !== key)
      : [...selectedSigns, key];
    setSelectedSigns(updated);
    setData('signs_observed', updated);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/breeding/heat');
  };

  const aiWindow = (() => {
    if (!data.observed_at) return null;
    const base  = new Date(`${data.observed_on}T${data.observed_at}`);
    const start = new Date(base.getTime() + 12 * 3600000);
    const end   = new Date(base.getTime() + 18 * 3600000);
    const fmt   = (d: Date) => d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    return `${fmt(start)} — ${fmt(end)}`;
  })();

  return (
    <AppLayout title="Record Heat">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button
            onClick={() => router.visit('/breeding')}
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">Record Heat Detection</h1>
            <p className="text-primary-300 text-xs">Standing heat = AI within 12–18 hours</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="px-4 py-4 space-y-5 pb-8">

          {/* Animal */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Animal <span className="text-red-500">*</span>
            </label>
            <select
              value={data.animal_id}
              onChange={e => setData('animal_id', e.target.value)}
              required
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="">Select cow or heifer...</option>
              {animals.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name ?? a.tag_number} ({a.tag_number}) — {a.breed}
                </option>
              ))}
            </select>
            {errors.animal_id && <p className="text-xs text-red-600 mt-1">{errors.animal_id}</p>}
          </div>

          {/* Date and time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Date Observed <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={data.observed_on}
                max={today()}
                onChange={e => setData('observed_on', e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Time Observed</label>
              <input
                type="time"
                value={data.observed_at}
                onChange={e => setData('observed_at', e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
          </div>

          {/* AI window preview */}
          {aiWindow && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-sm font-bold text-amber-900">⏰ Optimal AI Window</p>
              <p className="text-lg font-bold text-amber-800">{aiWindow}</p>
              <p className="text-xs text-amber-600 mt-1">12–18 hours after standing heat detection</p>
            </div>
          )}

          {/* Confidence */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Heat Confidence</label>
            <div className="flex gap-2">
              {[
                { value: 'certain',   label: 'Certain',   color: 'text-green-700 bg-green-50 border-green-200' },
                { value: 'probable',  label: 'Probable',  color: 'text-amber-700 bg-amber-50 border-amber-200' },
                { value: 'suspected', label: 'Suspected', color: 'text-gray-700 bg-gray-50 border-gray-200' },
              ].map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setData('confidence', c.value)}
                  className={clsx(
                    'flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all',
                    data.confidence === c.value
                      ? c.color + ' ring-2 ring-offset-1 ring-primary-600'
                      : 'text-gray-400 bg-white border-gray-200',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Signs observed */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Signs Observed</label>
            <div className="space-y-2">
              {SIGNS.map(sign => {
                const selected = selectedSigns.includes(sign.key);
                return (
                  <button
                    key={sign.key}
                    type="button"
                    onClick={() => toggleSign(sign.key)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm text-left transition-all',
                      selected
                        ? 'bg-primary-50 border-primary-400 text-primary-900'
                        : 'bg-white border-gray-200 text-gray-700',
                    )}
                  >
                    <div className={clsx(
                      'h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                      selected ? 'bg-primary-900 border-primary-900' : 'border-gray-300',
                    )}>
                      {selected && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {sign.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detection method */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Detection Method</label>
            <select
              value={data.detection_method}
              onChange={e => setData('detection_method', e.target.value)}
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="visual">Visual observation</option>
              <option value="tail_paint">Tail paint / chalk</option>
              <option value="pedometer">Pedometer / activity monitor</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes (optional)</label>
            <textarea
              value={data.notes}
              onChange={e => setData('notes', e.target.value)}
              rows={2}
              placeholder="Additional observations..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
            />
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={processing}
            disabled={!data.animal_id}
            leftIcon={<Flame className="h-5 w-5" />}
          >
            Record Heat Event
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

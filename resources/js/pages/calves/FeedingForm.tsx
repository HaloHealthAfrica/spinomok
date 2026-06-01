import React from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Milk } from 'lucide-react';
import { clsx } from 'clsx';
import type { PageProps, Animal } from '@/types';
import { today } from '@/utils/format';

interface FeedingFormProps extends PageProps {
  calves: Animal[];
  lactatingCows: Animal[];
}

const FEED_TYPES = [
  { value: 'whole_milk',      label: '🥛 Whole Milk',       unit: 'litres' },
  { value: 'milk_replacer',   label: '🍼 Milk Replacer',    unit: 'litres' },
  { value: 'starter_pellets', label: '🌾 Calf Pellets',     unit: 'kg' },
  { value: 'hay',             label: '🌿 Hay / Roughage',   unit: 'kg' },
  { value: 'water',           label: '💧 Water',            unit: 'litres' },
  { value: 'other',           label: '🧪 Other',            unit: 'kg' },
];

export default function FeedingForm() {
  const { calves, lactatingCows } = usePage<FeedingFormProps>().props;

  const { data, setData, post, processing, errors } = useForm({
    animal_id:             '',
    fed_on:                today(),
    session:               'morning',
    feed_type:             'whole_milk',
    quantity:              '',
    unit:                  'litres',
    milk_source_animal_id: '',
    cost:                  '',
    notes:                 '',
  });

  const selectedFeedType = FEED_TYPES.find(f => f.value === data.feed_type);

  const handleFeedChange = (value: string) => {
    const ft = FEED_TYPES.find(f => f.value === value);
    setData(d => ({ ...d, feed_type: value, unit: ft?.unit ?? 'litres' }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/calf-feeding');
  };

  return (
    <AppLayout title="Calf Feeding" showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button onClick={() => router.visit('/calves')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">Record Calf Feeding</h1>
            <p className="text-primary-300 text-xs">Milk, pellets, hay, water</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="px-4 py-4 space-y-4">

          {/* Calf selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Calf <span className="text-red-500">*</span></label>
            {calves.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                No calves found. Calves are created when calvings are recorded.
              </div>
            ) : (
              <select value={data.animal_id} onChange={e => setData('animal_id', e.target.value)} required
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600">
                <option value="">Select calf...</option>
                {calves.map(a => {
                  const ageDays = a.birth_date
                    ? Math.floor((Date.now() - new Date(a.birth_date).getTime()) / 86400000)
                    : null;
                  return (
                    <option key={a.id} value={a.id}>
                      {a.name ?? a.tag_number} ({a.tag_number}){ageDays !== null ? ` · ${ageDays}d old` : ''}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Date and session */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Date</label>
              <input type="date" value={data.fed_on} max={today()} onChange={e => setData('fed_on', e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Session</label>
              <select value={data.session} onChange={e => setData('session', e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600">
                <option value="morning">🌅 Morning</option>
                <option value="midday">☀️ Midday</option>
                <option value="evening">🌆 Evening</option>
              </select>
            </div>
          </div>

          {/* Feed type */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Feed Type <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {FEED_TYPES.map(ft => (
                <button key={ft.value} type="button" onClick={() => handleFeedChange(ft.value)}
                  className={clsx('py-3 px-3 rounded-xl border text-sm font-medium text-left transition-all',
                    data.feed_type === ft.value
                      ? 'bg-primary-900 text-white border-primary-900'
                      : 'bg-white text-gray-700 border-gray-200')}>
                  {ft.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <Input
            label={`Quantity (${selectedFeedType?.unit ?? 'litres'})`}
            type="number" min="0.001" step="0.1" inputMode="decimal"
            placeholder="4" unit={selectedFeedType?.unit ?? 'litres'}
            value={data.quantity}
            onChange={e => setData('quantity', e.target.value)}
            error={errors.quantity}
            required
          />

          {/* Milk source (if whole milk) */}
          {data.feed_type === 'whole_milk' && lactatingCows.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Milk Source Cow (optional)</label>
              <select value={data.milk_source_animal_id} onChange={e => setData('milk_source_animal_id', e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600">
                <option value="">Not specified</option>
                {lactatingCows.map(c => (
                  <option key={c.id} value={c.id}>{c.name ?? c.tag_number} ({c.tag_number})</option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Cost"
            type="number" min="0" step="1" inputMode="decimal"
            placeholder="0" unit="KES"
            value={data.cost}
            onChange={e => setData('cost', e.target.value)}
          />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={2}
              placeholder="Any observations during feeding..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none" />
          </div>

          <Button type="submit" fullWidth size="lg" loading={processing}
            disabled={!data.animal_id || !data.quantity}
            leftIcon={<Milk className="h-5 w-5" />}>
            Record Feeding
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

import React from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Scale } from 'lucide-react';
import type { PageProps, Animal } from '@/types';
import { today } from '@/utils/format';

interface WeightFormProps extends PageProps {
  animals: Animal[];
  cows: Animal[];
  preAnimal: string | null;
}

export default function WeightForm() {
  const { animals, cows, preAnimal } = usePage<WeightFormProps>().props;
  const allAnimals = [...animals, ...cows];

  const { data, setData, processing, errors } = useForm({
    entries: [{
      animal_id:            preAnimal ?? '',
      measured_on:          today(),
      weight_kg:            '',
      body_condition_score: '',
      method:               'scale',
      notes:                '',
    }],
  });

  const updateEntry = (field: string, value: string) => {
    setData('entries', [{ ...data.entries[0], [field]: value }]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.post('/weight', { entries: data.entries });
  };

  const selectedAnimal = allAnimals.find(a => a.id === data.entries[0].animal_id);
  const ageDays = selectedAnimal?.birth_date
    ? Math.floor((Date.now() - new Date(selectedAnimal.birth_date).getTime()) / 86400000)
    : null;

  return (
    <AppLayout title="Record Weight" showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button
            onClick={() => router.visit('/calves')}
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-white text-lg font-bold">Record Weight</h1>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="px-4 py-4 space-y-4 pb-8">

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Animal <span className="text-red-500">*</span>
            </label>
            <select
              value={data.entries[0].animal_id}
              onChange={e => updateEntry('animal_id', e.target.value)}
              required
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="">Select animal...</option>
              <optgroup label="Calves & Heifers">
                {animals.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name ?? a.tag_number} ({a.tag_number}) · {a.status}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Cows (for BCS)">
                {cows.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name ?? a.tag_number} ({a.tag_number}) · {a.status}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {selectedAnimal && ageDays != null && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
              <p>
                <strong>{selectedAnimal.name ?? selectedAnimal.tag_number}</strong>
                {' · '}{ageDays} days old · {selectedAnimal.breed}
              </p>
              {selectedAnimal.weight_kg && (
                <p className="text-xs mt-0.5">Last recorded: {selectedAnimal.weight_kg} kg</p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Date Measured <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={data.entries[0].measured_on}
              max={today()}
              onChange={e => updateEntry('measured_on', e.target.value)}
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          <Input
            label="Weight"
            type="number"
            min="5"
            max="1200"
            step="0.5"
            inputMode="decimal"
            placeholder="45"
            unit="kg"
            required
            value={data.entries[0].weight_kg}
            onChange={e => updateEntry('weight_kg', e.target.value)}
            error={errors['entries.0.weight_kg']}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Body Condition Score
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.5"
                  inputMode="decimal"
                  placeholder="3.0"
                  value={data.entries[0].body_condition_score}
                  onChange={e => updateEntry('body_condition_score', e.target.value)}
                  className="h-12 w-full rounded-xl border border-gray-300 px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">/5</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">1=thin · 3=ideal · 5=obese</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Measurement Method
              </label>
              <select
                value={data.entries[0].method}
                onChange={e => updateEntry('method', e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                <option value="scale">Weighbridge / Scale</option>
                <option value="weigh_tape">Weigh Tape</option>
                <option value="estimate">Visual Estimate</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea
              value={data.entries[0].notes}
              onChange={e => updateEntry('notes', e.target.value)}
              rows={2}
              placeholder="Body condition, any observations..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
            />
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={processing}
            disabled={!data.entries[0].animal_id || !data.entries[0].weight_kg}
            leftIcon={<Scale className="h-5 w-5" />}
          >
            Save Weight Record
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

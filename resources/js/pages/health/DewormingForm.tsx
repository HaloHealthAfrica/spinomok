import React, { useState } from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Bug } from 'lucide-react';
import { clsx } from 'clsx';
import type { PageProps, Animal } from '@/types';
import { today } from '@/utils/format';
import { goBack } from '@/utils/navigation';

interface DewormProps extends PageProps {
  animals: Animal[];
  dewormDrugs: { name: string; ingredient: string; withdrawal: number }[];
}

export default function DewormingForm() {
  const { animals, dewormDrugs } = usePage<DewormProps>().props;
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const { data, setData, post, processing, errors } = useForm({
    animal_ids:  [] as string[],
    drug_name:   dewormDrugs[0]?.name ?? '',
    dose_amount: '',
    dose_unit:   'ml',
    route:       'oral',
    dewormed_on: today(),
    cost:        '',
    notes:       '',
  });

  const toggleAnimal = (id: string) => {
    const next = selectedAnimals.includes(id)
      ? selectedAnimals.filter(a => a !== id)
      : [...selectedAnimals, id];
    setSelectedAnimals(next);
    setData('animal_ids', next);
  };

  const toggleAll = () => {
    if (selectAll) {
      setSelectedAnimals([]);
      setData('animal_ids', []);
    } else {
      const all = animals.map(a => a.id);
      setSelectedAnimals(all);
      setData('animal_ids', all);
    }
    setSelectAll(!selectAll);
  };

  const selectedDrug = dewormDrugs.find(d => d.name === data.drug_name);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/health/deworming');
  };

  return (
    <AppLayout title="Record Deworming" showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button onClick={() => router.visit('/health')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">Record Deworming</h1>
            <p className="text-primary-300 text-xs">Select one or multiple animals</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="px-4 py-4 space-y-5">

          {/* Animal multi-select */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Animals <span className="text-red-500">*</span></label>
              <button type="button" onClick={toggleAll} className="text-xs text-primary-900 font-medium">
                {selectAll ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2">
              {animals.map(a => (
                <button key={a.id} type="button" onClick={() => toggleAnimal(a.id)}
                  className={clsx('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                    selectedAnimals.includes(a.id) ? 'bg-primary-50 text-primary-900' : 'bg-white text-gray-700')}>
                  <div className={clsx('h-4 w-4 rounded border-2 flex-shrink-0',
                    selectedAnimals.includes(a.id) ? 'bg-primary-900 border-primary-900' : 'border-gray-300')}>
                    {selectedAnimals.includes(a.id) && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span>{a.name ?? a.tag_number} ({a.tag_number}) â€” {a.breed}</span>
                </button>
              ))}
            </div>
            {selectedAnimals.length > 0 && (
              <p className="text-xs text-primary-900 font-medium mt-1">{selectedAnimals.length} animal{selectedAnimals.length !== 1 ? 's' : ''} selected</p>
            )}
          </div>

          {/* Drug selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Deworming Drug <span className="text-red-500">*</span></label>
            <select value={data.drug_name} onChange={e => setData('drug_name', e.target.value)}
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600">
              {dewormDrugs.map(d => <option key={d.name} value={d.name}>{d.name} (WD: {d.withdrawal}d)</option>)}
            </select>
            {selectedDrug && (
              <p className="text-xs text-gray-500 mt-1">Active: {selectedDrug.ingredient} Â· Milk withdrawal: {selectedDrug.withdrawal} days</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Date Given <span className="text-red-500">*</span></label>
            <input type="date" value={data.dewormed_on} max={today()} onChange={e => setData('dewormed_on', e.target.value)}
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
          </div>

          {/* Dose and route */}
          <div className="grid grid-cols-3 gap-3">
            <Input label="Dose" type="number" min="0.001" step="0.1" inputMode="decimal" placeholder="10"
              value={data.dose_amount} onChange={e => setData('dose_amount', e.target.value)} />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Unit</label>
              <select value={data.dose_unit} onChange={e => setData('dose_unit', e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600">
                <option value="ml">ml</option><option value="tablet">tablet</option><option value="g">g</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Route</label>
              <select value={data.route} onChange={e => setData('route', e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600">
                <option value="oral">Oral</option><option value="IM">IM</option><option value="SC">SC</option>
              </select>
            </div>
          </div>

          <Input label="Cost (per animal)" type="number" min="0" inputMode="decimal" placeholder="120" unit="KES"
            value={data.cost} onChange={e => setData('cost', e.target.value)} />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={2}
              placeholder="FEC count, body weight, batch..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none" />
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700">
            <p className="font-bold mb-1">âœ… Auto-schedule</p>
            <p>Next deworming alert will be created 83 days after today (alerting 7 days before the 90-day due date).</p>
          </div>

          <Button type="submit" fullWidth size="lg" loading={processing}
            disabled={selectedAnimals.length === 0 || !data.dose_amount}
            leftIcon={<Bug className="h-5 w-5" />}>
            Record for {selectedAnimals.length > 0 ? `${selectedAnimals.length} Animal${selectedAnimals.length !== 1 ? 's' : ''}` : 'Animals'}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

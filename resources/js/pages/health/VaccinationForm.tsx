import React from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Syringe } from 'lucide-react';
import type { PageProps, Animal, VaccineType } from '@/types';
import { today } from '@/utils/format';

interface VaccFormProps extends PageProps {
  animals: Animal[];
  types: VaccineType[];
}

export default function VaccinationForm() {
  const { animals, types } = usePage<VaccFormProps>().props;

  const { data, setData, post, processing, errors } = useForm({
    animal_id:       '',
    vaccinated_on:   today(),
    vaccine_type_id: types[0]?.id ?? '',
    batch_number:    '',
    dose_ml:         '',
    route:           'SC',
    next_due_date:   '',
    cost:            '',
    adverse_reaction:false,
    notes:           '',
  });

  const selectedType = types.find(t => t.id === data.vaccine_type_id);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/health/vaccinations');
  };

  return (
    <AppLayout title="Record Vaccination" showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button onClick={() => router.visit('/health')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-white text-lg font-bold">Record Vaccination</h1>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="px-4 py-4 space-y-4">

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Animal <span className="text-red-500">*</span></label>
            <select value={data.animal_id} onChange={e => setData('animal_id', e.target.value)} required
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600">
              <option value="">Select animal...</option>
              {animals.map(a => <option key={a.id} value={a.id}>{a.name ?? a.tag_number} ({a.tag_number})</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Vaccine <span className="text-red-500">*</span></label>
            <select value={data.vaccine_type_id} onChange={e => setData('vaccine_type_id', e.target.value)}
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600">
              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {selectedType?.disease_prevented && (
              <p className="text-xs text-blue-700 mt-1">Prevents: {selectedType.disease_prevented}
                {selectedType.booster_interval_days ? ` · Repeat every ${selectedType.booster_interval_days} days` : ' · One-time vaccination'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Date Given <span className="text-red-500">*</span></label>
              <input type="date" value={data.vaccinated_on} max={today()} onChange={e => setData('vaccinated_on', e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Next Due Date</label>
              <input type="date" value={data.next_due_date} min={today()} onChange={e => setData('next_due_date', e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Dose (ml)" type="number" min="0" step="0.1" inputMode="decimal" placeholder="2" unit="ml"
              value={data.dose_ml} onChange={e => setData('dose_ml', e.target.value)} />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Route</label>
              <select value={data.route} onChange={e => setData('route', e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600">
                <option value="SC">Subcutaneous (SC)</option>
                <option value="IM">Intramuscular (IM)</option>
                <option value="oral">Oral</option>
                <option value="IN">Intranasal</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Batch Number" placeholder="VAC-2026-001" value={data.batch_number} onChange={e => setData('batch_number', e.target.value)} />
            <Input label="Cost" type="number" min="0" inputMode="decimal" placeholder="300" unit="KES"
              value={data.cost} onChange={e => setData('cost', e.target.value)} />
          </div>

          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <button type="button" onClick={() => setData('adverse_reaction', !data.adverse_reaction)}
              className={`h-6 w-11 rounded-full transition-all relative flex-shrink-0 ${data.adverse_reaction ? 'bg-red-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${data.adverse_reaction ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
            <span className="text-sm font-medium text-gray-700">Adverse Reaction Observed</span>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={2}
              placeholder="Site, observations, reaction details..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none" />
          </div>

          <Button type="submit" fullWidth size="lg" loading={processing} disabled={!data.animal_id} leftIcon={<Syringe className="h-5 w-5" />}>
            Record Vaccination
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

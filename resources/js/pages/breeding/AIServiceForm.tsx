import React, { useEffect } from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Syringe } from 'lucide-react';
import type { PageProps, Animal, SemenInventory, HeatEvent } from '@/types';
import { today, formatDate } from '@/utils/format';

interface AIFormProps extends PageProps {
  animals: Animal[];          // controller passes as 'females' — fixed in controller
  semen: SemenInventory[];
  pendingHeats: HeatEvent[];
  preselectedAnimal: string | null;
}

const GESTATION_DAYS: Record<string, number> = {
  Friesian: 280, Ayrshire: 280, Jersey: 276,
  'Brown Swiss': 290, Sahiwal: 283, Crossbreed: 281,
};

export default function AIServiceForm() {
  const { animals, semen, pendingHeats, preselectedAnimal } = usePage<AIFormProps>().props;

  const { data, setData, post, processing, errors } = useForm({
    animal_id:          preselectedAnimal ?? '',
    service_date:       today(),
    service_time:       '',
    technician_name:    '',
    technician_phone:   '',
    semen_inventory_id: semen[0]?.id ?? '',
    heat_event_id:      '',
    service_cost:       '',
    notes:              '',
  });

  useEffect(() => {
    const heat = pendingHeats.find(h => h.animal_id === data.animal_id);
    if (heat) setData('heat_event_id', heat.id);
  }, [data.animal_id]);

  const selectedAnimal = animals.find(a => a.id === data.animal_id);
  const selectedSemen  = semen.find(s => s.id === data.semen_inventory_id);

  const expectedCalving = (() => {
    if (!data.service_date || !selectedAnimal) return null;
    const days = GESTATION_DAYS[selectedAnimal.breed] ?? 280;
    const d = new Date(data.service_date);
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/breeding/ai');
  };

  return (
    <AppLayout title="Record AI Service">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button
            onClick={() => router.visit('/breeding')}
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">Record AI Service</h1>
            <p className="text-primary-300 text-xs">Artificial Insemination</p>
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
                <option key={a.id} value={a.id} disabled={a.is_pregnant}>
                  {a.name ?? a.tag_number} ({a.tag_number}){a.is_pregnant ? ' — Already pregnant' : ''}
                </option>
              ))}
            </select>
            {errors.animal_id && <p className="text-xs text-red-600 mt-1">{errors.animal_id}</p>}
          </div>

          {/* Linked heat event */}
          {pendingHeats.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Linked Heat Event</label>
              <select
                value={data.heat_event_id}
                onChange={e => setData('heat_event_id', e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                <option value="">No linked heat event</option>
                {pendingHeats.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.animal?.name ?? h.animal?.tag_number} — Heat on {formatDate(h.observed_on)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Service date and time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Service Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={data.service_date}
                max={today()}
                onChange={e => setData('service_date', e.target.value)}
                required
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
              {errors.service_date && <p className="text-xs text-red-600 mt-1">{errors.service_date}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Time</label>
              <input
                type="time"
                value={data.service_time}
                onChange={e => setData('service_time', e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
          </div>

          {/* Expected calving preview */}
          {expectedCalving && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-xs text-green-700 font-medium">Expected Calving Date</p>
              <p className="text-lg font-bold text-green-900">{expectedCalving}</p>
              <p className="text-xs text-green-600">
                Based on {selectedAnimal?.breed ?? ''} gestation ({GESTATION_DAYS[selectedAnimal?.breed ?? ''] ?? 280} days)
              </p>
            </div>
          )}

          {/* Semen */}
          {semen.length > 0 ? (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Semen</label>
              <select
                value={data.semen_inventory_id}
                onChange={e => setData('semen_inventory_id', e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                <option value="">No semen selected</option>
                {semen.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.bull_name}
                    {s.batch_number ? ` · #${s.batch_number}` : ''}
                    {' · '}{s.semen_type === 'sexed' ? 'Sexed' : 'Conventional'}
                    {' · '}{s.straws_remaining} straws
                  </option>
                ))}
              </select>
              {selectedSemen && (
                <p className={`text-xs mt-1 ${selectedSemen.straws_remaining <= 2 ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                  {selectedSemen.straws_remaining} straw{selectedSemen.straws_remaining !== 1 ? 's' : ''} remaining
                  {selectedSemen.straws_remaining <= 2 ? ' — running low!' : ''}
                  {selectedSemen.inseminator ? ` · ${selectedSemen.inseminator}` : ''}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              No semen in inventory. The service will be recorded without a semen link.{' '}
              <button
                type="button"
                onClick={() => router.visit('/semen/new')}
                className="underline font-medium"
              >
                Add batch
              </button>
            </div>
          )}

          {/* Technician */}
          <Input
            label="AI Technician Name"
            placeholder="e.g. John Kamau"
            value={data.technician_name}
            onChange={e => setData('technician_name', e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Technician Phone"
              type="tel"
              placeholder="+254..."
              value={data.technician_phone}
              onChange={e => setData('technician_phone', e.target.value)}
            />
            <Input
              label="Service Cost"
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="500"
              unit="KES"
              value={data.service_cost}
              onChange={e => setData('service_cost', e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea
              value={data.notes}
              onChange={e => setData('notes', e.target.value)}
              rows={2}
              placeholder="Any observations..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
            />
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={processing}
            disabled={!data.animal_id}
            leftIcon={<Syringe className="h-5 w-5" />}
          >
            Record AI Service
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

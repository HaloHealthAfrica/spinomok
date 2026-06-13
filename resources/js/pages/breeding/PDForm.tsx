import React from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Search } from 'lucide-react';
import { clsx } from 'clsx';
import type { PageProps, Animal, AIService } from '@/types';
import { today, formatDate } from '@/utils/format';

interface PDFormProps extends PageProps {
  animals: Animal[];           // controller passes as 'females' — fixed in controller
  pendingServices: AIService[];
}

const RESULTS = [
  { value: 'pregnant',     label: 'Pregnant',     emoji: '✅', color: 'text-green-700 bg-green-50 border-green-300' },
  { value: 'not_pregnant', label: 'Not Pregnant', emoji: '❌', color: 'text-red-700 bg-red-50 border-red-300' },
  { value: 'inconclusive', label: 'Inconclusive', emoji: '❓', color: 'text-amber-700 bg-amber-50 border-amber-300' },
];

export default function PDForm() {
  const { animals, pendingServices } = usePage<PDFormProps>().props;

  const { data, setData, post, processing, errors } = useForm({
    animal_id:     '',
    checked_on:    today(),
    method:        'rectal_palpation',
    result:        '',
    ai_service_id: '',
    checked_by:    '',
    cost:          '',
    notes:         '',
  });

  const selectedService = pendingServices.find(s => s.id === data.ai_service_id);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/breeding/pd');
  };

  return (
    <AppLayout title="Pregnancy Check" showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button
            onClick={() => router.visit('/breeding')}
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">Pregnancy Check (PD)</h1>
            <p className="text-primary-300 text-xs">Record diagnosis result</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="px-4 py-4 space-y-5 pb-8">

          {/* Pending services quick-select */}
          {pendingServices.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Select AI Service</label>
              <select
                value={data.ai_service_id}
                onChange={e => {
                  setData('ai_service_id', e.target.value);
                  const svc = pendingServices.find(s => s.id === e.target.value);
                  if (svc) setData('animal_id', svc.animal_id);
                }}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                <option value="">Select animal / AI service...</option>
                {pendingServices.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.animal?.name ?? s.animal?.tag_number} — AI on {formatDate(s.service_date)}
                  </option>
                ))}
              </select>
              {selectedService && (
                <p className="text-xs text-gray-500 mt-1">
                  Service date: {formatDate(selectedService.service_date)} · Service #{selectedService.service_number}
                </p>
              )}
              {errors.ai_service_id && <p className="text-xs text-red-600 mt-1">{errors.ai_service_id}</p>}
            </div>
          )}

          {/* Manual animal if no pending services */}
          {pendingServices.length === 0 && (
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
                <option value="">Select animal...</option>
                {animals.map(a => (
                  <option key={a.id} value={a.id}>{a.name ?? a.tag_number} ({a.tag_number})</option>
                ))}
              </select>
              {errors.animal_id && <p className="text-xs text-red-600 mt-1">{errors.animal_id}</p>}
            </div>
          )}

          {/* Check date */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Date of PD Check <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={data.checked_on}
              max={today()}
              onChange={e => setData('checked_on', e.target.value)}
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
            {errors.checked_on && <p className="text-xs text-red-600 mt-1">{errors.checked_on}</p>}
          </div>

          {/* Diagnosis method */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Diagnosis Method</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'rectal_palpation', label: 'Rectal Palpation' },
                { value: 'ultrasound',       label: 'Ultrasound' },
                { value: 'blood_test',       label: 'Blood Test' },
                { value: 'visual',           label: 'Visual / Other' },
              ].map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setData('method', m.value)}
                  className={clsx(
                    'py-2.5 px-3 rounded-xl border text-xs font-medium transition-all text-center',
                    data.method === m.value
                      ? 'bg-primary-900 text-white border-primary-900'
                      : 'bg-white text-gray-600 border-gray-300',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Result */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Result <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {RESULTS.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setData('result', r.value)}
                  className={clsx(
                    'w-full py-3 px-4 rounded-xl border text-sm font-semibold text-left transition-all',
                    data.result === r.value
                      ? r.color + ' ring-2 ring-offset-1 ring-primary-600'
                      : 'bg-white text-gray-600 border-gray-300',
                  )}
                >
                  {r.emoji} {r.label}
                </button>
              ))}
            </div>
            {errors.result && <p className="text-xs text-red-600 mt-1">{errors.result}</p>}
          </div>

          {/* Vet / cost */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Checked By (Vet)"
              placeholder="Dr. Otieno"
              value={data.checked_by}
              onChange={e => setData('checked_by', e.target.value)}
            />
            <Input
              label="PD Cost"
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="500"
              unit="KES"
              value={data.cost}
              onChange={e => setData('cost', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea
              value={data.notes}
              onChange={e => setData('notes', e.target.value)}
              rows={2}
              placeholder="Additional findings..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
            />
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={processing}
            disabled={!data.result || (!data.animal_id && !data.ai_service_id)}
            leftIcon={<Search className="h-5 w-5" />}
          >
            Record PD Result
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

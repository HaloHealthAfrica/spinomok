import React from 'react';
import { useForm, router } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { clsx } from 'clsx';
import { today } from '@/utils/format';

export default function SemenCreateForm() {
  const { data, setData, post, processing, errors } = useForm({
    bull_name:       '',
    batch_number:    '',
    semen_type:      'conventional' as 'conventional' | 'sexed',
    cost_per_straw:  '',
    inseminator:     '',
    straws_received: '1',
    received_on:     today(),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/semen');
  };

  return (
    <AppLayout title="Add Semen" showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button
            onClick={() => router.visit('/semen')}
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">Add Semen</h1>
            <p className="text-primary-300 text-xs">Record straw for AI services</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="px-4 py-4 space-y-5 pb-8">

          {/* Bull Name */}
          <Input
            label="Bull Name"
            placeholder="e.g. Mpendwa 123"
            required
            value={data.bull_name}
            onChange={e => setData('bull_name', e.target.value)}
            error={errors.bull_name}
          />

          {/* Straw # */}
          <Input
            label="Straw #"
            placeholder="e.g. FR-2024-001"
            value={data.batch_number}
            onChange={e => setData('batch_number', e.target.value)}
            error={errors.batch_number}
          />

          {/* Sexed or Conventional */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Semen Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {[
                { value: 'conventional', label: 'Conventional', sub: 'Mixed sex' },
                { value: 'sexed',        label: 'Sexed',         sub: 'Female-sorted' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setData('semen_type', opt.value as 'conventional' | 'sexed')}
                  className={clsx(
                    'flex-1 py-3 px-4 rounded-xl border-2 text-left transition-all',
                    data.semen_type === opt.value
                      ? 'bg-primary-900 text-white border-primary-900'
                      : 'bg-white text-gray-700 border-gray-200',
                  )}
                >
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className={clsx('text-xs mt-0.5', data.semen_type === opt.value ? 'text-primary-200' : 'text-gray-400')}>
                    {opt.sub}
                  </p>
                </button>
              ))}
            </div>
            {errors.semen_type && <p className="text-xs text-red-600 mt-1">{errors.semen_type}</p>}
          </div>

          {/* Cost */}
          <Input
            label="Cost per Straw"
            type="number"
            min="0"
            inputMode="decimal"
            placeholder="500"
            unit="KES"
            value={data.cost_per_straw}
            onChange={e => setData('cost_per_straw', e.target.value)}
            error={errors.cost_per_straw}
          />

          {/* Inseminator */}
          <Input
            label="Inseminator"
            placeholder="e.g. John Kamau"
            value={data.inseminator}
            onChange={e => setData('inseminator', e.target.value)}
            error={errors.inseminator}
          />

          {/* Quantity — secondary, defaults to 1 */}
          <Input
            label="Number of Straws"
            type="number"
            min="1"
            required
            placeholder="1"
            value={data.straws_received}
            onChange={e => setData('straws_received', e.target.value)}
            error={errors.straws_received}
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={processing}
            disabled={!data.bull_name || !data.straws_received}
            leftIcon={<FlaskConical className="h-5 w-5" />}
          >
            Save Semen
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

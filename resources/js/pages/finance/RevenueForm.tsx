import React from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import type { PageProps, Animal } from '@/types';
import { today } from '@/utils/format';

interface RevenueFormProps extends PageProps {
  animals: Animal[];
}

const CATEGORIES = [
  { value: 'milk_sales',    label: '🥛 Milk Sales',     desc: 'Direct milk revenue (use if not using Milk Sales module)' },
  { value: 'animal_sales',  label: '🐄 Animal Sales',   desc: 'Calf, heifer, bull, cow sold' },
  { value: 'manure_sales',  label: '♻️ Manure',          desc: 'Compost, fresh manure sold' },
  { value: 'crop_sales',    label: '🌿 Crop / Fodder',  desc: 'Surplus napier, hay, silage sold' },
  { value: 'subsidy',       label: '🏛️ Subsidy / Grant', desc: 'Government, NGO support' },
  { value: 'other',         label: '💰 Other',           desc: 'Insurance claim, miscellaneous' },
];

export default function RevenueForm() {
  const { animals } = usePage<RevenueFormProps>().props;

  const { data, setData, post, processing, errors } = useForm({
    category:             'animal_sales',
    revenue_date:         today(),
    description:          '',
    amount:               '',
    buyer_name:           '',
    receipt_number:       '',
    payment_method:       'cash',
    reference_animal_id:  '',
    notes:                '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/finance/revenue');
  };

  return (
    <AppLayout title="Record Revenue">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button onClick={() => router.visit('/finance')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-white text-lg font-bold">Record Revenue</h1>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="px-4 py-4 space-y-5">

          {/* Category */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Revenue Type <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.value} type="button" onClick={() => setData('category', cat.value)}
                  className={clsx('py-2.5 px-3 rounded-xl border text-sm text-left transition-all',
                    data.category === cat.value
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-200')}>
                  <p className="font-medium">{cat.label}</p>
                  <p className={clsx('text-[10px] mt-0.5', data.category === cat.value ? 'text-green-100' : 'text-gray-400')}>{cat.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Date <span className="text-red-500">*</span></label>
            <input type="date" value={data.revenue_date} max={today()} onChange={e => setData('revenue_date', e.target.value)}
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
          </div>

          <Input label="Description" placeholder="e.g. Bull calf sold to market" required
            value={data.description} onChange={e => setData('description', e.target.value)} error={errors.description} />

          <Input label="Amount" type="number" min="0.01" step="0.5" inputMode="decimal"
            placeholder="22000" unit="KES" required
            value={data.amount} onChange={e => setData('amount', e.target.value)} error={errors.amount} />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Buyer Name" placeholder="e.g. Githunguri Market"
              value={data.buyer_name} onChange={e => setData('buyer_name', e.target.value)} />
            <Input label="Receipt #" placeholder="RCT-001"
              value={data.receipt_number} onChange={e => setData('receipt_number', e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Payment Method</label>
            <div className="flex gap-2">
              {['cash', 'mpesa', 'bank', 'credit'].map(m => (
                <button key={m} type="button" onClick={() => setData('payment_method', m)}
                  className={clsx('flex-1 py-2 rounded-xl border text-xs font-medium capitalize',
                    data.payment_method === m ? 'bg-primary-900 text-white border-primary-900' : 'bg-white text-gray-600 border-gray-200')}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {(data.category === 'animal_sales') && animals.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Animal Sold (optional)</label>
              <select value={data.reference_animal_id} onChange={e => setData('reference_animal_id', e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600">
                <option value="">Select animal...</option>
                {animals.map(a => <option key={a.id} value={a.id}>{a.name ?? a.tag_number} ({a.tag_number})</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={2}
              placeholder="Additional details..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none" />
          </div>

          <Button type="submit" fullWidth size="lg" loading={processing}
            disabled={!data.description || !data.amount}
            className="bg-green-600 hover:bg-green-700">
            Record Revenue {data.amount ? `— KES ${parseFloat(data.amount || '0').toLocaleString()}` : ''}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

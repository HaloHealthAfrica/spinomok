import React from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Truck } from 'lucide-react';
import { clsx } from 'clsx';
import type { PageProps, FeedType } from '@/types';
import { today } from '@/utils/format';

interface ReceiveFormProps extends PageProps {
  feedTypes: FeedType[];
  existing: Record<string, { avg_cost_per_kg: number | null }>;
}

export default function ReceiveForm() {
  const { feedTypes, existing } = usePage<ReceiveFormProps>().props;

  const { data, setData, post, processing, errors } = useForm({
    feed_type_id:     feedTypes[0]?.id ?? '',
    quantity_kg:      '',
    unit_cost:        '',
    transaction_type: 'purchase',
    transaction_date: today(),
    supplier:         '',
    reference_number: '',
    notes:            '',
  });

  const handleFeedChange = (id: string) => {
    const lastCost = existing[id]?.avg_cost_per_kg;
    setData(d => ({ ...d, feed_type_id: id, unit_cost: lastCost ? lastCost.toString() : d.unit_cost }));
  };

  const selectedType = feedTypes.find(f => f.id === data.feed_type_id);
  const totalCost = data.quantity_kg && data.unit_cost
    ? (parseFloat(data.quantity_kg) * parseFloat(data.unit_cost)).toFixed(2)
    : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/feed/receive');
  };

  return (
    <AppLayout title="Receive Feed Stock" showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button onClick={() => router.visit('/feed')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">Receive Feed Stock</h1>
            <p className="text-primary-300 text-xs">Purchase or harvest delivery</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="px-4 py-4 space-y-4">

          {/* Type */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Transaction Type</label>
            <div className="flex gap-2">
              {[
                { value: 'purchase', label: '🛒 Purchase' },
                { value: 'harvest',  label: '🌿 Harvest' },
              ].map(t => (
                <button key={t.value} type="button" onClick={() => setData('transaction_type', t.value)}
                  className={clsx('flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all',
                    data.transaction_type === t.value ? 'bg-primary-900 text-white border-primary-900' : 'bg-white text-gray-600 border-gray-300')}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feed type */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Feed Type <span className="text-red-500">*</span></label>
            <select value={data.feed_type_id} onChange={e => handleFeedChange(e.target.value)} required
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600">
              {['roughage', 'concentrate', 'silage', 'hay', 'mineral', 'supplement'].map(cat => {
                const catFeeds = feedTypes.filter(f => f.category === cat);
                if (catFeeds.length === 0) return null;
                return (
                  <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                    {catFeeds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </optgroup>
                );
              })}
            </select>
            {selectedType?.description && (
              <p className="text-xs text-gray-500 mt-1">{selectedType.description}</p>
            )}
          </div>

          {/* Quantity and cost */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Quantity" type="number" min="0.001" step="10" inputMode="decimal"
              placeholder="500" unit="kg" required
              value={data.quantity_kg}
              onChange={e => setData('quantity_kg', e.target.value)}
              error={errors.quantity_kg} />
            <Input label="Unit Cost" type="number" min="0" step="0.5" inputMode="decimal"
              placeholder="52" unit="KES/kg"
              value={data.unit_cost}
              onChange={e => setData('unit_cost', e.target.value)} />
          </div>

          {/* Total cost preview */}
          {totalCost && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-sm font-bold text-green-900">Total Value: KES {parseFloat(totalCost).toLocaleString()}</p>
              <p className="text-xs text-green-600">{data.quantity_kg} kg × KES {data.unit_cost}/kg</p>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Date Received <span className="text-red-500">*</span></label>
            <input type="date" value={data.transaction_date} max={today()} onChange={e => setData('transaction_date', e.target.value)}
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
          </div>

          {/* Supplier + invoice (purchase only) */}
          {data.transaction_type === 'purchase' && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Supplier / Source" placeholder="e.g. Nakuru Feeds Ltd"
                value={data.supplier} onChange={e => setData('supplier', e.target.value)} />
              <Input label="Invoice / LPO No." placeholder="INV-2026-001"
                value={data.reference_number} onChange={e => setData('reference_number', e.target.value)} />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={2}
              placeholder="Quality notes, batch number, delivery details..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none" />
          </div>

          <Button type="submit" fullWidth size="lg" loading={processing}
            disabled={!data.feed_type_id || !data.quantity_kg}
            leftIcon={<Truck className="h-5 w-5" />}>
            Record {data.transaction_type === 'purchase' ? 'Purchase' : 'Harvest'}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, TrendingDown, Plus, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { PageProps, FeedType, FeedInventoryItem } from '@/types';
import { today, formatKES } from '@/utils/format';

interface ConsumeFormProps extends PageProps {
  feedTypes: FeedType[];
  inventory: FeedInventoryItem[];
}

interface ConsumeEntry {
  feed_type_id: string;
  quantity_kg: string;
  animal_group: string;
  transaction_date: string;
  notes: string;
}

export default function ConsumeForm() {
  const { feedTypes, inventory } = usePage<ConsumeFormProps>().props;

  const [date, setDate] = useState(today());
  const [group, setGroup] = useState('all');
  const [entries, setEntries] = useState<ConsumeEntry[]>([
    {
      feed_type_id:     inventory[0]?.feed_type_id ?? feedTypes[0]?.id ?? '',
      quantity_kg:      '',
      animal_group:     'all',
      transaction_date: today(),
      notes:            '',
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRow = () => {
    const nextFeed = feedTypes.find(f => !entries.some(e => e.feed_type_id === f.id));
    setEntries(prev => [
      ...prev,
      {
        feed_type_id:     nextFeed?.id ?? feedTypes[0]?.id ?? '',
        quantity_kg:      '',
        animal_group:     group,
        transaction_date: date,
        notes:            '',
      },
    ]);
  };

  const updateRow = (i: number, field: keyof ConsumeEntry, value: string) => {
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  };

  const removeRow = (i: number) => setEntries(prev => prev.filter((_, idx) => idx !== i));

  const totalCost = entries.reduce((sum, e) => {
    const inv = inventory.find(i => i.feed_type_id === e.feed_type_id);
    return sum + ((parseFloat(e.quantity_kg) || 0) * (inv?.avg_cost_per_kg ?? 0));
  }, 0);

  const filledEntries = entries.filter(e => e.feed_type_id && parseFloat(e.quantity_kg) > 0);

  const save = async () => {
    if (filledEntries.length === 0) return;
    setError(null);
    setSaving(true);

    const payload = filledEntries.map(e => ({
      feed_type_id:     e.feed_type_id,
      quantity_kg:      parseFloat(e.quantity_kg),
      animal_group:     group,
      transaction_date: date,
      notes:            e.notes,
    }));

    try {
      const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
      const res = await fetch('/feed/consume', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken, 'Accept': 'application/json' },
        body:    JSON.stringify({ entries: payload }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => router.visit('/feed'), 1200);
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.message ?? 'Failed to save. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Record Consumption">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button
            onClick={() => router.visit('/feed')}
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-white text-lg font-bold">Record Feed Consumption</h1>
            <p className="text-primary-300 text-xs">
              {filledEntries.length} feed type{filledEntries.length !== 1 ? 's' : ''} entered
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-8">
        {/* Date and group */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Date</label>
            <input
              type="date"
              value={date}
              max={today()}
              onChange={e => setDate(e.target.value)}
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Animal Group</label>
            <select
              value={group}
              onChange={e => setGroup(e.target.value)}
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="all">All Animals</option>
              <option value="lactating">Lactating Cows</option>
              <option value="dry">Dry Cows</option>
              <option value="heifers">Heifers</option>
              <option value="calves">Calves</option>
            </select>
          </div>
        </div>

        {/* Cost preview */}
        {totalCost > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex justify-between items-center">
            <span className="text-sm text-amber-700">Estimated feed cost</span>
            <span className="text-sm font-bold text-amber-900">{formatKES(totalCost)}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Feed entries */}
        <div className="space-y-3">
          {entries.map((entry, i) => {
            const inv = inventory.find(inv => inv.feed_type_id === entry.feed_type_id);
            const cost = inv?.avg_cost_per_kg && entry.quantity_kg
              ? parseFloat(entry.quantity_kg) * inv.avg_cost_per_kg
              : 0;

            return (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-600">Feed {i + 1}</p>
                  {entries.length > 1 && (
                    <button type="button" onClick={() => removeRow(i)} className="text-red-400 p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <select
                  value={entry.feed_type_id}
                  onChange={e => updateRow(i, 'feed_type_id', e.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  {feedTypes.map(f => {
                    const stockItem = inventory.find(inv => inv.feed_type_id === f.id);
                    return (
                      <option key={f.id} value={f.id}>
                        {f.name}{stockItem ? ` (${Number(stockItem.quantity_kg).toFixed(0)} kg)` : ''}
                      </option>
                    );
                  })}
                </select>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0.001"
                    step="1"
                    inputMode="decimal"
                    placeholder="Quantity (kg)"
                    value={entry.quantity_kg}
                    onChange={e => updateRow(i, 'quantity_kg', e.target.value)}
                    className={clsx(
                      'h-11 flex-1 rounded-xl border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary-600',
                      entry.quantity_kg && parseFloat(entry.quantity_kg) > 0
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-gray-200',
                    )}
                  />
                  <span className="text-sm text-gray-500 flex-shrink-0">kg</span>
                </div>

                {cost > 0 && (
                  <p className="text-xs text-gray-500">Estimated cost: {formatKES(cost)}</p>
                )}

                {inv?.is_low && entry.quantity_kg && parseFloat(entry.quantity_kg) > 0 && (
                  <p className="text-xs text-amber-600">
                    ⚠️ This feed is at low stock ({Number(inv.quantity_kg).toFixed(0)} kg remaining)
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Add another */}
        <button
          type="button"
          onClick={addRow}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 flex items-center justify-center gap-2 active:opacity-70"
        >
          <Plus className="h-4 w-4" /> Add Another Feed Type
        </button>

        <Button
          fullWidth
          size="lg"
          loading={saving}
          disabled={filledEntries.length === 0 || saved}
          onClick={save}
          leftIcon={<TrendingDown className="h-5 w-5" />}
        >
          {saved
            ? 'Saved! ✓'
            : `Record ${filledEntries.length > 0 ? filledEntries.length + ' Feed Type' + (filledEntries.length !== 1 ? 's' : '') : 'Consumption'}`}
        </Button>
      </div>
    </AppLayout>
  );
}

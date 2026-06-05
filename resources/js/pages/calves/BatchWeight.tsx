import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Save } from 'lucide-react';
import { clsx } from 'clsx';
import type { PageProps, Animal, WeightRecord } from '@/types';
import { today, formatDate } from '@/utils/format';

interface BatchProps extends PageProps {
  animals: Animal[];
  latestWeights: Record<string, WeightRecord>;
}

interface Entry {
  animal_id: string;
  measured_on: string;
  weight_kg: string;
  body_condition_score: string;
  method: string;
}

export default function BatchWeight() {
  const { animals, latestWeights } = usePage<BatchProps>().props;
  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState<Record<string, Entry>>(
    Object.fromEntries(animals.map(a => [a.id, {
      animal_id: a.id, measured_on: today(), weight_kg: '', body_condition_score: '', method: 'scale',
    }]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateEntry = (animalId: string, field: keyof Entry, value: string) => {
    setEntries(prev => ({ ...prev, [animalId]: { ...prev[animalId], [field]: value } }));
  };

  const filledCount = Object.values(entries).filter(e => e.weight_kg && parseFloat(e.weight_kg) > 0).length;

  const save = async () => {
    const payload = Object.values(entries)
      .filter(e => e.weight_kg && parseFloat(e.weight_kg) > 0)
      .map(e => ({ ...e, measured_on: date }));

    if (payload.length === 0) return;
    setError(null);
    setSaving(true);

    try {
      const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
      const res = await fetch('/weight', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken, 'Accept': 'application/json' },
        body:    JSON.stringify({ entries: payload }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => router.visit('/calves'), 1500);
      } else {
        setError('Failed to save. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Batch Weighing" showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3 mb-4">
          <button
            onClick={() => router.visit('/calves')}
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-white text-lg font-bold">Monthly Weighing</h1>
            <p className="text-primary-300 text-xs">{filledCount} of {animals.length} entered</p>
          </div>
        </div>

        <div className="bg-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
          <span className="text-primary-200 text-sm">Date:</span>
          <input
            type="date"
            value={date}
            max={today()}
            onChange={e => setDate(e.target.value)}
            className="bg-transparent text-white text-sm font-medium focus:outline-none flex-1"
          />
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="px-4 pt-3 pb-1">
        <div className="grid grid-cols-[1fr_90px_70px] gap-2 text-xs font-semibold text-gray-500 uppercase">
          <span>Animal</span>
          <span className="text-center">Weight (kg)</span>
          <span className="text-center">BCS</span>
        </div>
      </div>

      <div className="px-4 space-y-2 pb-32">
        {animals.map(animal => {
          const entry   = entries[animal.id];
          const lastRec = latestWeights[animal.id];
          const ageDays = animal.birth_date
            ? Math.floor((Date.now() - new Date(animal.birth_date).getTime()) / 86400000)
            : null;

          return (
            <div key={animal.id} className="bg-white border border-gray-100 rounded-xl p-3">
              <div className="grid grid-cols-[1fr_90px_70px] gap-2 items-center">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {animal.name ?? animal.tag_number}
                  </p>
                  <p className="text-xs text-gray-400">
                    {ageDays != null ? `${ageDays}d` : ''} · {animal.breed}
                  </p>
                  {lastRec && (
                    <p className="text-xs text-gray-400">
                      {lastRec.weight_kg} kg on {formatDate(lastRec.measured_on)}
                    </p>
                  )}
                </div>

                <input
                  type="number"
                  min="5"
                  max="1200"
                  step="0.5"
                  inputMode="decimal"
                  placeholder={lastRec ? String(lastRec.weight_kg) : '0'}
                  value={entry?.weight_kg ?? ''}
                  onChange={e => updateEntry(animal.id, 'weight_kg', e.target.value)}
                  className={clsx(
                    'h-11 w-full rounded-lg border text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-600',
                    entry?.weight_kg && parseFloat(entry.weight_kg) > 0
                      ? 'border-primary-300 bg-primary-50 text-primary-900'
                      : 'border-gray-200 bg-gray-50 text-gray-700',
                  )}
                />

                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.5"
                  inputMode="decimal"
                  placeholder="3.0"
                  value={entry?.body_condition_score ?? ''}
                  onChange={e => updateEntry(animal.id, 'body_condition_score', e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              {entry?.weight_kg && lastRec && parseFloat(entry.weight_kg) > 0 && lastRec.measured_on && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <AdgPreview
                    newWeight={parseFloat(entry.weight_kg)}
                    oldWeight={parseFloat(String(lastRec.weight_kg))}
                    oldDate={lastRec.measured_on}
                    newDate={date}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-4 pb-4 pt-3">
        <Button
          fullWidth
          size="lg"
          loading={saving}
          disabled={filledCount === 0 || saved}
          onClick={save}
          leftIcon={<Save className="h-5 w-5" />}
        >
          {saved ? 'Saved! ✓' : `Save ${filledCount} Weight Record${filledCount !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </AppLayout>
  );
}

function AdgPreview({ newWeight, oldWeight, oldDate, newDate }: {
  newWeight: number; oldWeight: number; oldDate: string; newDate: string;
}) {
  const days = Math.max(1, Math.floor((new Date(newDate).getTime() - new Date(oldDate).getTime()) / 86400000));
  const adg  = (newWeight - oldWeight) / days;
  const good = adg >= 0.5;

  return (
    <p className={clsx('text-xs font-medium', good ? 'text-green-600' : adg < 0 ? 'text-red-600' : 'text-amber-600')}>
      ADG: {adg >= 0 ? '+' : ''}{adg.toFixed(2)} kg/day over {days} days
      {good ? ' ✓' : adg < 0 ? ' ↓' : ' ⚠️ Below 0.5 target'}
    </p>
  );
}

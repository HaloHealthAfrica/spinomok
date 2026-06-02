import React, { useState, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Save, Milk, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { PageProps, AnimalMilkRecord } from '@/types';
import { formatDate } from '@/utils/format';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { enqueueOperation } from '@/lib/sync/SyncService';
import { db } from '@/lib/db/database';
import axios from 'axios';

interface MilkCreateProps extends PageProps {
  date: string;
  animal_records: AnimalMilkRecord[];
}

type SessionKey = 'morning' | 'midday' | 'evening';
type EntryMap = Record<string, Record<SessionKey, string>>;

const SESSIONS: { key: SessionKey; label: string; emoji: string }[] = [
  { key: 'morning', label: 'AM', emoji: '🌅' },
  { key: 'midday',  label: 'MD', emoji: '☀️' },
  { key: 'evening', label: 'PM', emoji: '🌆' },
];

export default function MilkCreate() {
  const { date, animal_records } = usePage<MilkCreateProps>().props;
  const isOnline = useOnlineStatus();

  // Initialize entries from existing records
  const initialEntries = animal_records.reduce<EntryMap>((acc, ar) => {
    acc[ar.animal_id] = {
      morning: ar.morning?.litres.toString() ?? '',
      midday:  ar.midday?.litres.toString()  ?? '',
      evening: ar.evening?.litres.toString() ?? '',
    };
    return acc;
  }, {});

  const [entries, setEntries] = useState<EntryMap>(initialEntries);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setEntry = useCallback((animalId: string, session: SessionKey, value: string) => {
    setEntries(prev => ({
      ...prev,
      [animalId]: { ...(prev[animalId] ?? { morning: '', midday: '', evening: '' }), [session]: value },
    }));
  }, []);

  const getTodayTotal = (): number => {
    return Object.values(entries).reduce((sum, sessions) => {
      return sum + (parseFloat(sessions.morning) || 0)
                 + (parseFloat(sessions.midday) || 0)
                 + (parseFloat(sessions.evening) || 0);
    }, 0);
  };

  const save = async () => {
    setSaving(true);
    setError(null);

    const payload: { animal_id: string; session: SessionKey; litres: number }[] = [];

    for (const [animalId, sessions] of Object.entries(entries)) {
      for (const session of ['morning', 'midday', 'evening'] as SessionKey[]) {
        const val = parseFloat(sessions[session]);
        if (!isNaN(val) && val >= 0) {
          payload.push({ animal_id: animalId, session, litres: val });
        }
      }
    }

    if (payload.length === 0) {
      setError('Please enter at least one yield value.');
      setSaving(false);
      return;
    }

    const queueEntries = async () => {
      for (const entry of payload) {
        const recordId = crypto.randomUUID();
        await db.milkRecords.put({
          id: recordId,
          farm_id: '',
          animal_id: entry.animal_id,
          milked_on: date,
          session: entry.session,
          quantity_litres: entry.litres,
          fat_percentage: null,
          somatic_cell_count: null,
          milked_by: null,
          notes: null,
          created_at: new Date().toISOString(),
          syncStatus: 'pending',
          locallyModifiedAt: new Date().toISOString(),
        });
        await enqueueOperation('milk_records', recordId, 'CREATE', { ...entry, date });
      }
    };

    if (!isOnline) {
      await queueEntries();
      setSaved(true);
      setSaving(false);
      return;
    }

    try {
      await axios.post('/milk-records', { date, entries: payload });
      setSaved(true);
    } catch (err: unknown) {
      await queueEntries();
      setError('Failed to save online. Your data is saved on this device and queued for sync.');
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const todayTotal = getTodayTotal();

  return (
    <AppLayout title="Record Milk">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button
            onClick={() => router.visit('/milk-records')}
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">Record Milk</h1>
            <p className="text-primary-300 text-xs">{formatDate(date)}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-primary-200 text-xs">Running total</p>
            <p className="text-white text-lg font-bold">{todayTotal.toFixed(1)} L</p>
          </div>
        </div>
      </div>

      {saved && (
        <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-700 text-sm">
          <span>✓</span>
          <span>Milk records saved{!isOnline ? ' locally — will sync when connected' : ''}.</span>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isOnline && (
        <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs">
          You're offline. Entries will be saved locally and synced when connected.
        </div>
      )}

      {/* Session headers */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-[1fr_72px_72px_72px] gap-2 mb-2">
          <div className="text-xs font-medium text-gray-500 uppercase">Cow</div>
          {SESSIONS.map(s => (
            <div key={s.key} className="text-center text-xs font-medium text-gray-500 uppercase">
              {s.emoji} {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Animal rows */}
      <div className="px-4 space-y-2 pb-4">
        {animal_records.length === 0 ? (
          <Card className="text-center py-8">
            <Milk className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No lactating cows found.</p>
            <button
              onClick={() => router.visit('/animals/create')}
              className="mt-2 text-primary-900 text-sm font-medium underline"
            >
              Add an animal
            </button>
          </Card>
        ) : (
          animal_records.map((ar) => (
            <AnimalMilkRow
              key={ar.animal_id}
              record={ar}
              values={entries[ar.animal_id] ?? { morning: '', midday: '', evening: '' }}
              onChange={(session, value) => setEntry(ar.animal_id, session, value)}
            />
          ))
        )}
      </div>

      {/* Save button — sticky */}
      <div className="sticky bottom-16 px-4 pb-4 bg-gradient-to-t from-gray-50 pt-6">
        <Button
          fullWidth
          size="lg"
          loading={saving}
          onClick={save}
          leftIcon={<Save className="h-5 w-5" />}
          disabled={saved && isOnline}
        >
          {saved && isOnline ? 'Saved ✓' : `Save ${todayTotal.toFixed(1)} L`}
        </Button>
      </div>
    </AppLayout>
  );
}

function AnimalMilkRow({
  record,
  values,
  onChange,
}: {
  record: AnimalMilkRecord;
  values: Record<SessionKey, string>;
  onChange: (session: SessionKey, value: string) => void;
}) {
  const rowTotal = (parseFloat(values.morning) || 0)
    + (parseFloat(values.midday) || 0)
    + (parseFloat(values.evening) || 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
      <div className="grid grid-cols-[1fr_72px_72px_72px] gap-2 items-center">
        {/* Animal info */}
        <div>
          <p className="text-sm font-semibold text-gray-900 truncate">
            {record.name ?? record.tag_number}
          </p>
          <p className="text-xs text-gray-400">{record.tag_number}</p>
          {rowTotal > 0 && (
            <p className="text-xs font-bold text-primary-900 mt-0.5">{rowTotal.toFixed(1)} L total</p>
          )}
        </div>

        {/* Session inputs */}
        {SESSIONS.map((s) => (
          <SessionInput
            key={s.key}
            value={values[s.key]}
            onChange={(v) => onChange(s.key, v)}
            ariaLabel={`${record.name ?? record.tag_number} ${s.label} yield`}
          />
        ))}
      </div>
    </div>
  );
}

function SessionInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        min="0"
        max="60"
        step="0.1"
        inputMode="decimal"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={clsx(
          'w-full h-11 rounded-lg border text-center text-sm font-medium',
          'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600',
          value && parseFloat(value) > 0
            ? 'border-primary-300 bg-primary-50 text-primary-900'
            : 'border-gray-200 bg-gray-50 text-gray-700',
        )}
      />
      {value && parseFloat(value) > 0 && (
        <span className="absolute -bottom-1 left-0 right-0 text-center text-[10px] text-primary-600 font-medium">L</span>
      )}
    </div>
  );
}

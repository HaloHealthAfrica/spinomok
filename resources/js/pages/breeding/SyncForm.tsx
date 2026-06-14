import React from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import type { PageProps, Animal } from '@/types';
import { today } from '@/utils/format';
import { Card } from '@/components/ui/Card';

interface SyncFormProps extends PageProps {
  animals: Animal[];
}

const PROGRAMS = [
  {
    type:        'Ovsynch',
    description: 'GnRH → PGF2a → GnRH → Timed AI (10 days)',
    steps:       ['Day 0: GnRH injection', 'Day 7: PGF2a injection', 'Day 9: GnRH injection', 'Day 10 AM: Timed AI'],
    offsets:     [0, 7, 9, 10],
    color:       'text-blue-700 bg-blue-50 border-blue-300',
  },
  {
    type:        'CIDR',
    description: 'CIDR insert → PGF2a → GnRH → Timed AI (10 days)',
    steps:       ['Day 0: Insert CIDR', 'Day 7: PGF2a + Remove CIDR', 'Day 9: GnRH injection', 'Day 10: Timed AI'],
    offsets:     [0, 7, 9, 10],
    color:       'text-purple-700 bg-purple-50 border-purple-300',
  },
];

export default function SyncForm() {
  const { animals } = usePage<SyncFormProps>().props;

  const { data, setData, post, processing, errors } = useForm({
    animal_id:    '',
    program_type: 'Ovsynch',
    start_date:   today(),
    notes:        '',
  });

  const selectedProgram = PROGRAMS.find(p => p.type === data.program_type);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/breeding/sync');
  };

  return (
    <AppLayout title="Synchronization Program">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button
            onClick={() => router.visit('/breeding')}
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">Sync Program</h1>
            <p className="text-primary-300 text-xs">Ovsynch or CIDR protocol</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="px-4 py-4 space-y-5 pb-8">

          {/* Protocol */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Protocol <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {PROGRAMS.map(p => (
                <button
                  key={p.type}
                  type="button"
                  onClick={() => setData('program_type', p.type)}
                  className={clsx(
                    'w-full px-4 py-3 rounded-xl border text-left transition-all',
                    data.program_type === p.type
                      ? p.color + ' ring-2 ring-offset-1 ring-primary-600'
                      : 'bg-white border-gray-200',
                  )}
                >
                  <p className="text-sm font-bold">{p.type}</p>
                  <p className="text-xs opacity-70 mt-0.5">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

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
                <option key={a.id} value={a.id}>
                  {a.name ?? a.tag_number} ({a.tag_number}) — {a.breed}
                </option>
              ))}
            </select>
            {errors.animal_id && <p className="text-xs text-red-600 mt-1">{errors.animal_id}</p>}
          </div>

          {/* Start date */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Start Date (Day 0) <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={data.start_date}
              onChange={e => setData('start_date', e.target.value)}
              required
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
            {errors.start_date && <p className="text-xs text-red-600 mt-1">{errors.start_date}</p>}
          </div>

          {/* Schedule preview */}
          {selectedProgram && data.start_date && (
            <Card padding="md" className="bg-gray-50">
              <p className="text-sm font-bold text-gray-800 mb-3">📅 Schedule Preview</p>
              <div className="space-y-2">
                {selectedProgram.offsets.map((offset, i) => {
                  const d = new Date(data.start_date);
                  d.setDate(d.getDate() + offset);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary-900 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                        {offset}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-800">{selectedProgram.steps[i]}</p>
                        <p className="text-xs text-gray-500">
                          {d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea
              value={data.notes}
              onChange={e => setData('notes', e.target.value)}
              rows={2}
              placeholder="Reason for synchronization, special instructions..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
            />
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={processing}
            disabled={!data.animal_id}
            leftIcon={<Calendar className="h-5 w-5" />}
          >
            Start {data.program_type} Program
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

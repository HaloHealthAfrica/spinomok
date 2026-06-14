import React from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, CheckCircle, Pill } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { PageProps, HealthEvent } from '@/types';
import { formatDate, formatKES } from '@/utils/format';
import { clsx } from 'clsx';
import { goBack } from '@/utils/navigation';

interface ShowProps extends PageProps {
  event: HealthEvent & {
    reported_by?: { id: string; name: string };
  };
}

export default function HealthShow() {
  const { event } = usePage<ShowProps>().props;

  const { data, setData, patch, processing } = useForm({
    outcome:       'recovered',
    recovery_date: new Date().toISOString().split('T')[0],
  });

  const closeCase = (e: React.FormEvent) => {
    e.preventDefault();
    patch(`/health/${event.id}/close`);
  };

  const severityBadge = { severe: 'error', moderate: 'warning', mild: 'info' }[event.severity] as 'error' | 'warning' | 'info';

  return (
    <AppLayout title="Health Event">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button onClick={() => router.visit('/health')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">{event.animal?.name ?? event.animal?.tag_number}</h1>
            <p className="text-primary-300 text-xs">{event.disease_type?.name ?? 'Health Observation'} Â· {formatDate(event.observed_on)}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Status */}
        <div className={clsx('rounded-xl p-4 flex items-center gap-3',
          event.is_recovered ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200')}>
          <CheckCircle className={clsx('h-8 w-8 flex-shrink-0', event.is_recovered ? 'text-green-600' : 'text-amber-500')} />
          <div>
            <p className={clsx('text-sm font-bold', event.is_recovered ? 'text-green-900' : 'text-amber-900')}>
              {event.is_recovered ? `Recovered â€” ${event.recovery_date ? formatDate(event.recovery_date) : ''}` : 'Case Open'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={severityBadge} size="sm">{event.severity}</Badge>
              {event.outcome && <Badge variant="neutral" size="sm">{event.outcome}</Badge>}
            </div>
          </div>
        </div>

        {/* Details */}
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">Event Details</p>
          <div className="space-y-2">
            {[
              { label: 'Animal',      value: `${event.animal?.name ?? event.animal?.tag_number} (${event.animal?.tag_number})` },
              { label: 'Condition',   value: event.disease_type?.name ?? 'Undiagnosed' },
              { label: 'Date',        value: formatDate(event.observed_on) },
              { label: 'Reported by', value: event.reported_by?.name ?? 'â€”' },
              { label: 'Symptoms',    value: event.symptoms ?? 'â€”' },
              { label: 'Vet',         value: event.vet_consulted ? (event.vet_name ?? 'Yes') : 'No' },
              { label: 'Consult cost',value: event.consultation_cost ? formatKES(event.consultation_cost) : 'â€”' },
              { label: 'Notes',       value: event.notes ?? 'â€”' },
            ].filter(r => r.value !== 'â€”').map(r => (
              <div key={r.label} className="flex justify-between gap-2">
                <span className="text-xs text-gray-500 flex-shrink-0">{r.label}</span>
                <span className="text-xs font-medium text-gray-900 text-right">{r.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Treatments */}
        {(event.treatments?.length ?? 0) > 0 && (
          <Card padding="md">
            <p className="text-sm font-bold text-gray-900 mb-3">Treatments ({event.treatments!.length})</p>
            <div className="space-y-3">
              {event.treatments!.map(t => (
                <div key={t.id} className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                  <p className="text-sm font-semibold text-purple-900">{t.medication?.name ?? 'Unknown drug'}</p>
                  <p className="text-xs text-purple-600">{t.dose_amount} {t.dose_unit} Â· {t.route} Â· {formatDate(t.treated_on)}</p>
                  {t.withdrawal_end_date && (
                    <p className={clsx('text-xs font-medium mt-1',
                      t.is_in_withdrawal ? 'text-red-600' : 'text-green-600')}>
                      {t.is_in_withdrawal ? `âš ï¸ Withdrawal until ${formatDate(t.withdrawal_end_date)}` : `âœ“ Withdrawal cleared ${formatDate(t.withdrawal_end_date)}`}
                    </p>
                  )}
                  {t.cost && <p className="text-xs text-gray-500 mt-0.5">Cost: {formatKES(t.cost)}</p>}
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-700">Total drug cost</span>
                <span className="text-xs font-bold text-gray-900">{formatKES(event.treatment_cost ?? 0)}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Close case form */}
        {!event.is_recovered && (
          <Card padding="md">
            <p className="text-sm font-bold text-gray-900 mb-3">Close Case</p>
            <form onSubmit={closeCase} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Outcome</label>
                <div className="flex gap-2">
                  {['recovered', 'culled', 'died', 'ongoing'].map(o => (
                    <button key={o} type="button" onClick={() => setData('outcome', o)}
                      className={clsx('flex-1 py-2 rounded-lg border text-xs font-medium capitalize transition-all',
                        data.outcome === o ? 'bg-primary-900 text-white border-primary-900' : 'bg-white text-gray-600 border-gray-300')}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Recovery Date</label>
                <input type="date" value={data.recovery_date}
                  onChange={e => setData('recovery_date', e.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
              </div>
              <Button type="submit" fullWidth loading={processing} leftIcon={<CheckCircle className="h-4 w-4" />}>
                Close Case
              </Button>
            </form>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

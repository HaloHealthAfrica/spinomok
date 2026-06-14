import React from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, Syringe, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { PageProps, Vaccination } from '@/types';
import { formatDate } from '@/utils/format';
import { goBack } from '@/utils/navigation';

interface ScheduleProps extends PageProps {
  upcoming: Vaccination[];
  overdue: Vaccination[];
  recent: Vaccination[];
}

export default function VaccinationSchedule() {
  const { upcoming, overdue, recent } = usePage<ScheduleProps>().props;

  return (
    <AppLayout title="Vaccination Schedule">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.visit('/health')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-white text-lg font-bold">Vaccination Calendar</h1>
          </div>
          <button onClick={() => router.visit('/health/vaccinations/new')}
            className="bg-accent-500 text-white px-3 py-2 rounded-full text-sm font-medium flex items-center gap-1.5">
            <Syringe className="h-4 w-4" /> Record
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">

        {/* Kenya standard schedule reference */}
        <Card padding="md" className="bg-blue-50 border-blue-200">
          <p className="text-sm font-bold text-blue-900 mb-2">ðŸ‡°ðŸ‡ª Kenya Standard Schedule</p>
          <div className="space-y-1 text-xs text-blue-700">
            <p>â€¢ <strong>FMD</strong> â€” Every 6 months (Mar + Aug)</p>
            <p>â€¢ <strong>LSD / Sheeppox</strong> â€” Annually (Feb, before rains)</p>
            <p>â€¢ <strong>Anthrax</strong> â€” Annually (endemic areas only)</p>
            <p>â€¢ <strong>Brucellosis S19</strong> â€” Heifers 4â€“8 months (once only)</p>
            <p>â€¢ <strong>ECF-ITM</strong> â€” Once per lifetime</p>
            <p>â€¢ <strong>Blackleg</strong> â€” Annually, young stock</p>
          </div>
        </Card>

        {/* Overdue */}
        {overdue.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Overdue ({overdue.length})
            </h2>
            <div className="space-y-2">
              {overdue.map(v => <VaccRow key={v.id} vacc={v} status="overdue" />)}
            </div>
          </section>
        )}

        {/* Upcoming (60 days) */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Due in 60 Days ({upcoming.length})
          </h2>
          {upcoming.length === 0 ? (
            <Card className="text-center py-6">
              <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No vaccinations due in the next 60 days</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {upcoming.map(v => <VaccRow key={v.id} vacc={v} status="upcoming" />)}
            </div>
          )}
        </section>

        {/* Recent (30 days) */}
        {recent.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Recent (Last 30 Days)
            </h2>
            <div className="space-y-2">
              {recent.map(v => <VaccRow key={v.id} vacc={v} status="done" />)}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}

function VaccRow({ vacc, status }: { vacc: Vaccination; status: 'overdue' | 'upcoming' | 'done' }) {
  const dueDate    = status === 'done' ? vacc.vaccinated_on : vacc.next_due_date;
  const badgeProps = {
    overdue:  { variant: 'error' as const,   label: 'Overdue' },
    upcoming: { variant: 'warning' as const, label: dueDate ? formatDate(dueDate) : 'Due' },
    done:     { variant: 'success' as const, label: 'Done âœ“' },
  }[status];

  return (
    <Card padding="sm">
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
          status === 'overdue' ? 'bg-red-100' : status === 'upcoming' ? 'bg-amber-100' : 'bg-green-100'
        }`}>
          <Syringe className={`h-4 w-4 ${
            status === 'overdue' ? 'text-red-600' : status === 'upcoming' ? 'text-amber-600' : 'text-green-600'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{vacc.animal?.name ?? vacc.animal?.tag_number}</p>
          <p className="text-xs text-gray-500 truncate">{vacc.vaccine_type?.name ?? 'Vaccination'}</p>
          {vacc.vaccine_type?.disease_prevented && (
            <p className="text-[10px] text-gray-400">{vacc.vaccine_type.disease_prevented}</p>
          )}
        </div>
        <Badge variant={badgeProps.variant} size="sm">{badgeProps.label}</Badge>
      </div>
    </Card>
  );
}

import React from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, Bell, Calendar, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge, getSeverityVariant } from '@/components/ui/Badge';
import { CardGroup, CardRow } from '@/components/ui/Card';
import type { Alert, PageProps } from '@/types';
import { formatDate } from '@/utils/format';

interface AlertsPageProps extends PageProps {
  alerts: Alert[];
}

export default function AlertsIndex() {
  const { alerts } = usePage<AlertsPageProps>().props;

  return (
    <AppLayout title="Alerts">
      <header className="px-4 pt-[env(safe-area-inset-top)] pt-3 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.visit('/dashboard')}
            aria-label="Back to dashboard"
            className="h-10 w-10 rounded-full bg-[rgba(120,120,128,0.12)] flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5 text-black" />
          </button>
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.3px] text-black">Alerts</h1>
            <p className="text-[14px] text-[rgba(60,60,67,0.55)]">
              {alerts.length} active {alerts.length === 1 ? 'alert' : 'alerts'}
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 pb-6">
        {alerts.length === 0 ? (
          <div className="mt-8 rounded-[12px] bg-white px-4 py-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <CheckCircle2 className="mx-auto h-10 w-10 text-[#34C759]" />
            <h2 className="mt-3 text-[17px] font-semibold text-black">No active alerts</h2>
            <p className="mt-1 text-[14px] text-[rgba(60,60,67,0.55)]">
              New health, breeding, and farm reminders will appear here.
            </p>
          </div>
        ) : (
          <CardGroup>
            {alerts.map(alert => (
              <CardRow key={alert.id}>
                <div className="h-10 w-10 rounded-full bg-[rgba(255,149,0,0.12)] flex items-center justify-center shrink-0">
                  <Bell className="h-5 w-5 text-[#D97706]" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[15px] font-semibold text-black">{alert.title}</p>
                    <Badge variant={getSeverityVariant(alert.severity)} size="sm">
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[13px] text-[rgba(60,60,67,0.55)]">
                    {alert.message}
                  </p>
                  {alert.due_on && (
                    <p className="mt-1 flex items-center gap-1 text-[12px] text-[rgba(60,60,67,0.45)]">
                      <Calendar className="h-3.5 w-3.5" />
                      Due {formatDate(alert.due_on)}
                    </p>
                  )}
                </div>
              </CardRow>
            ))}
          </CardGroup>
        )}
      </div>
    </AppLayout>
  );
}

import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, Edit2, Milk, Heart, Calendar, BarChart2, Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge, getStatusVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { clsx } from 'clsx';
import type { Animal, HealthEvent, PageProps } from '@/types';
import { formatDate, formatLitres } from '@/utils/format';

interface MilkTotal {
  milked_on: string;
  total_litres: number | string;
}

interface BreedingEvent {
  id: string;
  type: string;
  date: string | null;
  detail: string;
}

interface AnimalShowProps extends PageProps {
  animal: Animal & {
    dam: Animal | null;
    sire: Animal | null;
    days_in_milk: number | null;
    current_lactation_number?: number;
  };
  health_events: HealthEvent[];
  breeding_events: BreedingEvent[];
  milk_records: MilkTotal[];
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart2 },
  { id: 'health', label: 'Health', icon: Heart },
  { id: 'breeding', label: 'Breeding', icon: Calendar },
  { id: 'production', label: 'Production', icon: Milk },
] as const;

export default function AnimalsShow() {
  const { animal, health_events, breeding_events, milk_records } = usePage<AnimalShowProps>().props;
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('overview');

  const statusLabel: Record<string, string> = {
    lactating: 'Milking', dry: 'Dry', heifer: 'Heifer',
    calf: 'Calf', bull: 'Bull', culled: 'Culled', sold: 'Sold', dead: 'Dead',
  };

  return (
    <AppLayout title={animal.name ?? animal.tag_number}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-4">
          <button onClick={() => router.visit('/animals')} aria-label="Back to animals" className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button onClick={() => router.visit(`/animals/${animal.id}/edit`)} aria-label="Edit animal" className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <Edit2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {animal.photo_url ? (
              <img src={animal.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">{(animal.name ?? animal.tag_number).slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">{animal.name ?? animal.tag_number}</h1>
            <p className="text-primary-200 text-sm">{animal.breed} / {animal.tag_number}</p>
            <div className="mt-1">
              <Badge variant={getStatusVariant(animal.status)} size="sm">{statusLabel[animal.status] ?? animal.status}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 flex overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab.id ? 'text-primary-900 border-primary-900' : 'text-gray-500 border-transparent hover:text-gray-700',
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="px-4 py-4 space-y-3">
        {activeTab === 'overview' && <OverviewTab animal={animal} />}
        {activeTab === 'health' && <HealthTab animalId={animal.id} events={health_events} />}
        {activeTab === 'breeding' && <BreedingTab animalId={animal.id} events={breeding_events} />}
        {activeTab === 'production' && <ProductionTab animalId={animal.id} records={milk_records} />}
      </div>
    </AppLayout>
  );
}

function OverviewTab({ animal }: { animal: AnimalShowProps['animal'] }) {
  const rows = [
    { label: 'Tag Number', value: animal.tag_number },
    { label: 'Sex', value: animal.sex === 'female' ? 'Female' : 'Male' },
    { label: 'Breed', value: animal.breed },
    { label: 'Date of Birth', value: animal.birth_date ? formatDate(animal.birth_date) : '-' },
    { label: 'Current Weight', value: animal.weight_kg ? `${animal.weight_kg} kg` : '-' },
    { label: 'Parity', value: String(animal.parity ?? 0) },
    { label: 'Days in Milk', value: animal.days_in_milk != null ? `${animal.days_in_milk} days` : '-' },
    { label: 'Pregnant', value: animal.is_pregnant ? 'Yes' : 'No' },
    { label: 'Expected Calving', value: animal.expected_calving_date ? formatDate(animal.expected_calving_date) : '-' },
    { label: 'Last Calving', value: animal.last_calving_date ? formatDate(animal.last_calving_date) : '-' },
    { label: 'Dam', value: animal.dam?.name ?? animal.dam?.tag_number ?? '-' },
    { label: 'Sire', value: animal.sire?.name ?? animal.sire?.tag_number ?? '-' },
  ];

  return (
    <Card padding="none">
      <div className="divide-y divide-gray-100">
        {rows.map((row) => <DetailRow key={row.label} label={row.label} value={row.value} />)}
      </div>
    </Card>
  );
}

function HealthTab({ animalId, events }: { animalId: string; events: HealthEvent[] }) {
  return (
    <ListSection
      emptyTitle="No health records"
      emptyText="Record a health event, vaccination, or deworming when something happens."
      actionLabel="Add Health Event"
      onAction={() => router.visit(`/health/create?animal_id=${animalId}`)}
    >
      {events.map(event => (
        <Card key={event.id} className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-gray-900">{event.disease_type?.name ?? 'Health event'}</p>
            <Badge variant={event.is_recovered ? 'success' : 'warning'} size="sm">{event.is_recovered ? 'Recovered' : event.severity}</Badge>
          </div>
          <p className="text-sm text-gray-500">{formatDate(event.observed_on)}</p>
          {event.symptoms && <p className="text-sm text-gray-700">{event.symptoms}</p>}
        </Card>
      ))}
    </ListSection>
  );
}

function BreedingTab({ animalId, events }: { animalId: string; events: BreedingEvent[] }) {
  return (
    <ListSection
      emptyTitle="No breeding records"
      emptyText="Heat, AI, pregnancy checks, and calving events will appear here."
      actionLabel="Record Breeding"
      onAction={() => router.visit(`/breeding/ai/new?animal_id=${animalId}`)}
    >
      {events.map(event => (
        <Card key={`${event.type}-${event.id}`} className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-900">{event.type}</p>
            <p className="text-sm text-gray-500">{event.date ? formatDate(event.date) : 'No date'} / {event.detail}</p>
          </div>
          <Calendar className="h-5 w-5 text-gray-300" />
        </Card>
      ))}
    </ListSection>
  );
}

function ProductionTab({ animalId, records }: { animalId: string; records: MilkTotal[] }) {
  const total = records.reduce((sum, record) => sum + Number(record.total_litres ?? 0), 0);
  const average = records.length > 0 ? total / records.length : 0;

  return (
    <ListSection
      emptyTitle="No production records"
      emptyText="Daily milk totals will appear after this animal is milked."
      actionLabel="Record Milk"
      onAction={() => router.visit(`/milk-records/create?animal_id=${animalId}`)}
    >
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="14-day total" value={formatLitres(total)} />
        <SummaryCard label="Daily average" value={formatLitres(average)} />
      </div>
      {records.map(record => (
        <Card key={record.milked_on} className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{formatDate(record.milked_on)}</span>
          <span className="text-sm font-bold text-primary-900">{formatLitres(Number(record.total_litres))}</span>
        </Card>
      ))}
    </ListSection>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[55%]">{value}</span>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}

function ListSection({
  children,
  emptyTitle,
  emptyText,
  actionLabel,
  onAction,
}: {
  children: React.ReactNode[];
  emptyTitle: string;
  emptyText: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div className="space-y-3">
      <button onClick={onAction} className="w-full h-11 rounded-xl bg-primary-900 text-white text-sm font-semibold flex items-center justify-center gap-2">
        <Plus className="h-4 w-4" />
        {actionLabel}
      </button>
      {hasChildren ? children : (
        <div className="rounded-xl bg-white px-4 py-8 text-center">
          <h3 className="font-semibold text-gray-900">{emptyTitle}</h3>
          <p className="mt-1 text-sm text-gray-500">{emptyText}</p>
        </div>
      )}
    </div>
  );
}

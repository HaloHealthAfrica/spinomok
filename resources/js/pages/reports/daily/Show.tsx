import React from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, CheckCircle, Share2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import type { PageProps, DailyReport, AnimalMilkRecord, MilkSale, HealthEvent, FeedTransaction, Expense } from '@/types';
import { formatDate, formatKES, formatLitres } from '@/utils/format';

type NamedAnimal = { id: string; tag_number: string; name: string | null };
type NamedDisease = { id: string; name: string };

interface ShowProps extends PageProps {
  report: DailyReport & { submitted_by?: { id: string; name: string } };
  milk_records: AnimalMilkRecord[];
  milk_summary: { total_litres: number; morning_litres: number; midday_litres: number; evening_litres: number; cows_milked: number };
  sales: (MilkSale & { buyer: { name: string; buyer_type: string } })[];
  health_events: (HealthEvent & { animal?: NamedAnimal; disease_type?: NamedDisease })[];
  feed_transactions: FeedTransaction[];
  expenses: Expense[];
}

export default function DailyReportShow() {
  const {
    report, milk_summary, milk_records, sales, health_events, feed_transactions, expenses,
  } = usePage<ShowProps>().props;

  const milkRows = milk_records.filter(record => record.daily_total > 0);
  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount ?? 0), 0);
  const feedUsage = feed_transactions.filter(txn => txn.transaction_type === 'consumption');
  const feedReceived = feed_transactions.filter(txn => txn.transaction_type === 'purchase' || txn.transaction_type === 'harvest');
  const totalFeedCost = feedUsage.reduce((sum, txn) => sum + Number(txn.total_cost ?? 0), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);

  const whatsAppMessage = encodeURIComponent(buildDailyReportMessage({
    report,
    milkSummary: milk_summary,
    milkRows,
    sales,
    totalRevenue,
    healthEvents: health_events,
    feedUsage,
    feedReceived,
    totalFeedCost,
    expenses,
    totalExpenses,
  }));

  return (
    <AppLayout title="Daily Report">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button onClick={() => router.visit('/reports')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">Daily Report</h1>
            <p className="text-primary-300 text-xs">{formatDate(report.report_date)}</p>
          </div>
          <a
            href={`https://wa.me/?text=${whatsAppMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 bg-green-500 text-white px-3 py-2 rounded-full text-sm font-medium"
          >
            <Share2 className="h-4 w-4" />
            WhatsApp
          </a>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-green-900">Report Submitted</p>
            <p className="text-xs text-green-600">
              by {report.submitted_by?.name ?? 'Unknown'} {report.submitted_at ? `at ${new Date(report.submitted_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}` : ''}
            </p>
          </div>
        </div>

        <Section title="Milk Production">
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Total" value={formatLitres(milk_summary.total_litres)} highlight />
            <StatBox label="Cows" value={`${milk_summary.cows_milked}`} />
            <StatBox label="Morning" value={formatLitres(milk_summary.morning_litres)} />
            <StatBox label="Evening" value={formatLitres(milk_summary.evening_litres)} />
          </div>
          <ListOrEmpty empty="No cow milk records for this date.">
            {milkRows.map(record => (
              <DetailRow
                key={record.animal_id}
                title={record.name ?? record.tag_number}
                detail={`Morning ${sessionLitres(record, 'morning')} L, Midday ${sessionLitres(record, 'midday')} L, Evening ${sessionLitres(record, 'evening')} L`}
                value={`${record.daily_total.toFixed(1)} L`}
              />
            ))}
          </ListOrEmpty>
        </Section>

        <Section title="Milk Sales">
          <ListOrEmpty empty="No sales recorded.">
            {sales.map(sale => (
              <DetailRow
                key={sale.id}
                title={sale.buyer?.name ?? 'Milk buyer'}
                detail={`${Number(sale.quantity_litres).toFixed(1)} L at ${formatKES(Number(sale.price_per_litre))}/L${sale.payment_method ? ` via ${sale.payment_method}` : ''}`}
                value={formatKES(Number(sale.total_amount))}
              />
            ))}
          </ListOrEmpty>
          {sales.length > 0 && <TotalRow label="Total Revenue" value={formatKES(totalRevenue)} />}
        </Section>

        <Section title="Health Summary">
          <ListOrEmpty empty="No health events recorded.">
            {health_events.map(event => (
              <DetailRow
                key={event.id}
                title={event.animal?.name ?? event.animal?.tag_number ?? 'Animal'}
                detail={`${event.severity} - ${event.disease_type?.name ?? event.symptoms ?? 'Health event'}${event.vet_name ? `; Vet: ${event.vet_name}` : ''}`}
                value={event.is_recovered ? 'Recovered' : 'Open'}
              />
            ))}
          </ListOrEmpty>
        </Section>

        <Section title="Feed">
          <ListOrEmpty empty="No feed movements recorded.">
            {feedReceived.map(txn => (
              <DetailRow
                key={txn.id}
                title={`Received ${txn.feed_type?.name ?? 'Feed'}`}
                detail={`${Number(txn.quantity_kg).toFixed(1)} kg${txn.supplier ? ` from ${txn.supplier}` : ''}`}
                value={formatKES(Number(txn.total_cost ?? 0))}
              />
            ))}
            {feedUsage.map(txn => (
              <DetailRow
                key={txn.id}
                title={`Consumed ${txn.feed_type?.name ?? 'Feed'}`}
                detail={`${Math.abs(Number(txn.quantity_kg)).toFixed(1)} kg${txn.animal_group ? ` for ${txn.animal_group}` : ''}`}
                value={formatKES(Number(txn.total_cost ?? 0))}
              />
            ))}
          </ListOrEmpty>
          {feedUsage.length > 0 && <TotalRow label="Feed Usage Cost" value={formatKES(totalFeedCost)} />}
        </Section>

        <Section title="Expenses">
          <ListOrEmpty empty="No expenses recorded.">
            {expenses.map(expense => (
              <DetailRow
                key={expense.id}
                title={expense.description}
                detail={`${expense.category}${expense.supplier ? ` - ${expense.supplier}` : ''}`}
                value={formatKES(Number(expense.amount))}
              />
            ))}
          </ListOrEmpty>
          {expenses.length > 0 && <TotalRow label="Total Expenses" value={formatKES(totalExpenses)} />}
        </Section>

        {report.manager_notes && (
          <Section title="Manager Notes">
            <p className="text-sm text-gray-700">{report.manager_notes}</p>
          </Section>
        )}
      </div>
    </AppLayout>
  );
}

function buildDailyReportMessage({
  report,
  milkSummary,
  milkRows,
  sales,
  totalRevenue,
  healthEvents,
  feedUsage,
  feedReceived,
  totalFeedCost,
  expenses,
  totalExpenses,
}: {
  report: DailyReport;
  milkSummary: ShowProps['milk_summary'];
  milkRows: AnimalMilkRecord[];
  sales: ShowProps['sales'];
  totalRevenue: number;
  healthEvents: ShowProps['health_events'];
  feedUsage: FeedTransaction[];
  feedReceived: FeedTransaction[];
  totalFeedCost: number;
  expenses: Expense[];
  totalExpenses: number;
}) {
  const lines = [
    `*DAILY FARM REPORT* - ${formatDate(report.report_date)}`,
    '',
    `*MILK*: ${milkSummary.total_litres.toFixed(1)} L (${milkSummary.cows_milked} cows)`,
    ...milkRows.map(record => `- ${record.name ?? record.tag_number}: ${record.daily_total.toFixed(1)} L (AM ${sessionLitres(record, 'morning')}, Mid ${sessionLitres(record, 'midday')}, PM ${sessionLitres(record, 'evening')})`),
    '',
    `*SALES*: ${formatKES(totalRevenue)}`,
    ...(sales.length ? sales.map(sale => `- ${sale.buyer?.name ?? 'Buyer'}: ${Number(sale.quantity_litres).toFixed(1)} L x ${formatKES(Number(sale.price_per_litre))} = ${formatKES(Number(sale.total_amount))}`) : ['- None recorded']),
    '',
    '*HEALTH*',
    ...(healthEvents.length ? healthEvents.map(event => `- ${event.animal?.name ?? event.animal?.tag_number ?? 'Animal'}: ${event.severity} - ${event.disease_type?.name ?? event.symptoms ?? 'Health event'}`) : ['- No health events recorded']),
    '',
    `*FEED*: ${formatKES(totalFeedCost)} usage cost`,
    ...(feedReceived.length ? feedReceived.map(txn => `- Received ${txn.feed_type?.name ?? 'Feed'}: ${Number(txn.quantity_kg).toFixed(1)} kg`) : []),
    ...(feedUsage.length ? feedUsage.map(txn => `- Used ${txn.feed_type?.name ?? 'Feed'}: ${Math.abs(Number(txn.quantity_kg)).toFixed(1)} kg${txn.animal_group ? ` (${txn.animal_group})` : ''}`) : ['- No feed usage recorded']),
    '',
    `*EXPENSES*: ${formatKES(totalExpenses)}`,
    ...(expenses.length ? expenses.map(expense => `- ${expense.description}: ${formatKES(Number(expense.amount))}`) : ['- None recorded']),
  ];

  if (report.weather) lines.push('', `Weather: ${report.weather}`);
  if (report.manager_notes) lines.push('', `Notes: ${report.manager_notes}`);
  lines.push('', '_SpinoMok FarmOps_');

  return lines.join('\n');
}

function sessionLitres(record: AnimalMilkRecord, session: 'morning' | 'midday' | 'evening') {
  return (record[session]?.litres ?? 0).toFixed(1);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card padding="md">
      <p className="text-sm font-semibold text-gray-900 mb-3">{title}</p>
      {children}
    </Card>
  );
}

function ListOrEmpty({ empty, children }: { empty: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (items.length === 0) return <p className="text-sm text-gray-500">{empty}</p>;
  return <div className="mt-3 space-y-1.5">{items}</div>;
}

function DetailRow({ title, detail, value }: { title: string; detail: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{detail}</p>
      </div>
      <p className="text-sm font-bold text-primary-900 shrink-0">{value}</p>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between pt-2 mt-2 border-t border-gray-200">
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      <p className="text-sm font-bold text-green-700">{value}</p>
    </div>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-base font-bold ${highlight ? 'text-primary-900' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

import React from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, CheckCircle, Share2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import type { PageProps, DailyReport, AnimalMilkRecord, MilkSale } from '@/types';
import { formatDate, formatKES, formatLitres } from '@/utils/format';
import { goBack } from '@/utils/navigation';

interface ShowProps extends PageProps {
  report: DailyReport & { submitted_by?: { id: string; name: string } };
  milk_records: AnimalMilkRecord[];
  milk_summary: { total_litres: number; morning_litres: number; midday_litres: number; evening_litres: number; cows_milked: number };
  sales: (MilkSale & { buyer: { name: string; buyer_type: string } })[];
}

export default function DailyReportShow() {
  const { report, milk_summary, milk_records, sales } = usePage<ShowProps>().props;

  const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);

  const whatsAppMessage = encodeURIComponent(
    `ðŸ„ *DAILY FARM REPORT* â€” ${formatDate(report.report_date)}\n\n` +
    `ðŸ¥› *MILK*: ${milk_summary.total_litres.toFixed(1)} L (${milk_summary.cows_milked} cows)\n` +
    `ðŸ’° *REVENUE*: ${formatKES(totalRevenue)}\n` +
    (report.manager_notes ? `ðŸ“ *NOTES*: ${report.manager_notes}\n` : '') +
    `\n_SpinoMok FarmOps_`
  );

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
        {/* Submitted banner */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-green-900">Report Submitted âœ“</p>
            <p className="text-xs text-green-600">
              by {report.submitted_by?.name ?? 'Unknown'} Â· {report.submitted_at ? new Date(report.submitted_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : ''}
            </p>
          </div>
        </div>

        {/* Milk summary */}
        <Section title="ðŸ¥› Milk Production">
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Total" value={formatLitres(milk_summary.total_litres)} highlight />
            <StatBox label="Cows" value={`${milk_summary.cows_milked}`} />
            <StatBox label="Morning" value={formatLitres(milk_summary.morning_litres)} />
            <StatBox label="Evening" value={formatLitres(milk_summary.evening_litres)} />
          </div>
          {milk_records.filter(r => r.daily_total > 0).length > 0 && (
            <div className="mt-3 space-y-1.5">
              {milk_records.filter(r => r.daily_total > 0).map(ar => (
                <div key={ar.animal_id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-600">{ar.name ?? ar.tag_number}</span>
                  <span className="text-sm font-bold text-primary-900">{ar.daily_total.toFixed(1)} L</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Sales */}
        <Section title="ðŸ’° Milk Sales">
          {sales.length === 0 ? (
            <p className="text-sm text-gray-500">No sales recorded.</p>
          ) : (
            <>
              {sales.map(sale => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sale.buyer?.name}</p>
                    <p className="text-xs text-gray-500">{sale.quantity_litres.toFixed(1)} L @ {formatKES(sale.price_per_litre)}/L</p>
                  </div>
                  <p className="text-sm font-bold text-green-700">{formatKES(sale.total_amount)}</p>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700">Total Revenue</p>
                <p className="text-sm font-bold text-green-700">{formatKES(totalRevenue)}</p>
              </div>
            </>
          )}
        </Section>

        {/* Manager notes */}
        {report.manager_notes && (
          <Section title="ðŸ“ Manager Notes">
            <p className="text-sm text-gray-700">{report.manager_notes}</p>
          </Section>
        )}
      </div>
    </AppLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card padding="md">
      <p className="text-sm font-semibold text-gray-900 mb-3">{title}</p>
      {children}
    </Card>
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

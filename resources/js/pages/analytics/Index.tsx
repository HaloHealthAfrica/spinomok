import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
  TrendingUp, TrendingDown, Milk, Heart, Calendar, DollarSign,
  MessageSquare, ChevronRight, Wheat,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { clsx } from 'clsx';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, ComposedChart, Legend,
} from 'recharts';
import type { PageProps } from '@/types';
import { formatKES } from '@/utils/format';

interface AnalyticsProps extends PageProps {
  period: string;
  milkTrend: { date: string; total: number; cows: number; avg: number }[];
  herd: { total: number; lactating: number; dry: number; heifer: number; calf: number; bull: number; pregnant: number; utilisation_rate: number };
  breeding: {
    total_services_90d: number;
    confirmed_90d: number;
    pending_pd_check: number;
    conception_rate_90d: number;
    services_per_conception: number | null;
    avg_days_open: number | null;
    pregnant_cows: number;
    upcoming_calvings_30d: number;
    monthly_trend: { month: string; total_services: number; confirmed: number; conception_rate: number }[];
  };
  health: {
    total_events: number;
    by_disease: { disease: string; count: number }[];
    total_treatment_cost: number;
    vaccinations_due_30d: number;
    deworming_due_30d: number;
    monthly_trend: { month: string; events: number; cost: number }[];
  };
  feed: {
    monthly_trend: { month: string; feed_cost: number; milk_litres: number; cost_per_litre: number | null }[];
    top_feeds_30d: { feed: string; cost: number; qty: number }[];
  };
  financial: {
    trend: { month: string; revenue: number; expenses: number; net_profit: number; cost_per_litre: number | null }[];
    channel_breakdown: { channel: string; revenue: number; litres: number; price: number }[];
  };
  perCow: { animal_id: string; tag_number: string; name: string | null; breed: string; total_litres: number; avg_per_day: number }[];
}

const PERIOD_OPTIONS = [
  { value: '7',  label: '7 Days' },
  { value: '14', label: '14 Days' },
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days' },
];

const TABS = ['Production', 'Breeding', 'Health', 'Finance', 'Feed'] as const;
type Tab = typeof TABS[number];

const HERD_COLORS = ['#1B5E20', '#43A047', '#FFA000', '#1565C0', '#6D4C41', '#37474F'];

export default function AnalyticsIndex() {
  const { period, milkTrend, herd, breeding, health, feed, financial, perCow } = usePage<AnalyticsProps>().props;
  const [tab, setTab] = useState<Tab>('Production');

  const navigatePeriod = (p: string) => {
    router.get('/analytics', { period: p }, { preserveState: true, only: ['period', 'milkTrend', 'perCow'] });
  };

  const herdPieData = [
    { name: 'Lactating', value: herd.lactating },
    { name: 'Dry', value: herd.dry },
    { name: 'Heifer', value: herd.heifer },
    { name: 'Calves', value: herd.calf },
    { name: 'Bulls', value: herd.bull },
  ].filter(d => d.value > 0);

  return (
    <AppLayout title="Analytics">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-3">
          <h1 className="text-white text-xl font-bold">Farm Analytics</h1>
          <button
            onClick={() => router.visit('/analytics/whatsapp/daily')}
            className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-2 rounded-full text-sm font-medium"
          >
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </button>
        </div>

        {/* Period selector */}
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map(p => (
            <button key={p.value} onClick={() => navigatePeriod(p.value)}
              className={clsx('flex-1 py-1.5 rounded-full text-xs font-medium transition-all',
                period === p.value ? 'bg-white text-primary-900' : 'bg-white/20 text-white')}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Herd summary strip */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <HerdKpi label="Total" value={herd.total} />
          <HerdKpi label="Milking" value={herd.lactating} />
          <HerdKpi label="Pregnant" value={herd.pregnant} />
          <HerdKpi label="Utilisation" value={`${herd.utilisation_rate}%`} />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex bg-white border-b border-gray-100 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
              tab === t ? 'text-primary-900 border-primary-900' : 'text-gray-500 border-transparent')}>
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-4">
        {tab === 'Production' && <ProductionTab milkTrend={milkTrend} perCow={perCow} herd={herd} herdPieData={herdPieData} period={period} />}
        {tab === 'Breeding'   && <BreedingTab breeding={breeding} />}
        {tab === 'Health'     && <HealthTab health={health} />}
        {tab === 'Finance'    && <FinanceTab financial={financial} />}
        {tab === 'Feed'       && <FeedTab feed={feed} />}
      </div>
    </AppLayout>
  );
}

// ─── Production Tab ───────────────────────────────────────────────────────────

function ProductionTab({ milkTrend, perCow, herd, herdPieData, period }: {
  milkTrend: AnalyticsProps['milkTrend'];
  perCow: AnalyticsProps['perCow'];
  herd: AnalyticsProps['herd'];
  herdPieData: { name: string; value: number }[];
  period: string;
}) {
  const totalLitres = milkTrend.reduce((s, d) => s + d.total, 0);
  const avgDaily    = milkTrend.length > 0 ? totalLitres / milkTrend.length : 0;

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card padding="md">
          <p className="text-xs text-gray-500">{period}-Day Total</p>
          <p className="text-xl font-bold text-primary-900">{totalLitres.toFixed(0)} L</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500">Daily Average</p>
          <p className="text-xl font-bold text-primary-900">{avgDaily.toFixed(1)} L</p>
        </Card>
      </div>

      {/* Milk trend line chart */}
      {milkTrend.length > 1 && (
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">🥛 Milk Production Trend</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={milkTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v: number) => [`${v} L`, 'Milk']} labelFormatter={l => `Date: ${l}`} />
              <Line type="monotone" dataKey="total" stroke="#1B5E20" strokeWidth={2.5} dot={false} name="Total Litres" />
              <Line type="monotone" dataKey="avg" stroke="#43A047" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="Avg/Cow" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Herd composition donut */}
      {herdPieData.length > 0 && (
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-2">🐄 Herd Composition</p>
          <div className="flex items-center gap-4">
            <PieChart width={100} height={100}>
              <Pie data={herdPieData} cx={50} cy={50} innerRadius={28} outerRadius={46} dataKey="value" paddingAngle={2}>
                {herdPieData.map((_, i) => <Cell key={i} fill={HERD_COLORS[i % HERD_COLORS.length]} />)}
              </Pie>
            </PieChart>
            <div className="flex-1 space-y-1">
              {herdPieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: HERD_COLORS[i] }} />
                  <span className="text-xs text-gray-600 flex-1">{d.name}</span>
                  <span className="text-xs font-bold text-gray-900">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Per-cow ranking */}
      {perCow.length > 0 && (
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-900">🏆 Top Producers</p>
            <span className="text-xs text-gray-400">{period} days</span>
          </div>
          <div className="space-y-2">
            {perCow.slice(0, 8).map((cow, i) => {
              const maxTotal = perCow[0].total_litres;
              const pct = maxTotal > 0 ? (cow.total_litres / maxTotal) * 100 : 0;
              return (
                <div key={cow.animal_id}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                      <span className="text-xs font-medium text-gray-900">{cow.name ?? cow.tag_number}</span>
                      <span className="text-[10px] text-gray-400">{cow.breed}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-primary-900">{cow.total_litres.toFixed(0)} L</span>
                      <span className="text-[10px] text-gray-400 ml-1">({cow.avg_per_day.toFixed(1)}/d)</span>
                    </div>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}

// ─── Breeding Tab ─────────────────────────────────────────────────────────────

function BreedingTab({ breeding }: { breeding: AnalyticsProps['breeding'] }) {
  const crColor = breeding.conception_rate_90d >= 50 ? 'text-green-700' : breeding.conception_rate_90d >= 40 ? 'text-amber-700' : 'text-red-700';

  return (
    <>
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card padding="md" className={breeding.conception_rate_90d >= 50 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}>
          <p className="text-xs text-gray-500">Conception Rate</p>
          <p className={clsx('text-2xl font-bold', crColor)}>{breeding.conception_rate_90d}%</p>
          <p className="text-xs text-gray-400">Target: &gt;50% · Last 90 days</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500">Services/Conception</p>
          <p className="text-xl font-bold text-gray-900">{breeding.services_per_conception ?? '—'}</p>
          <p className="text-xs text-gray-400">Target: &lt;2.0</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500">Pregnant Cows</p>
          <p className="text-xl font-bold text-primary-900">{breeding.pregnant_cows}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500">Calvings (30 days)</p>
          <p className="text-xl font-bold text-primary-900">{breeding.upcoming_calvings_30d}</p>
        </Card>
      </div>

      {breeding.avg_days_open !== null && (
        <Card padding="md" className={breeding.avg_days_open <= 120 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}>
          <p className="text-xs text-gray-500">Average Days Open</p>
          <p className={clsx('text-xl font-bold', breeding.avg_days_open <= 120 ? 'text-green-700' : 'text-amber-700')}>
            {breeding.avg_days_open} days
          </p>
          <p className="text-xs text-gray-400">Target: &lt;120 days</p>
        </Card>
      )}

      {/* Monthly conception rate chart */}
      {breeding.monthly_trend.length > 1 && (
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">Conception Rate Trend</p>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={breeding.monthly_trend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 9 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} unit="%" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="total_services" fill="#93c5fd" name="Services" radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="conception_rate" stroke="#1B5E20" strokeWidth={2} dot={{ r: 3 }} name="CR %" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Pending checks */}
      {breeding.pending_pd_check > 0 && (
        <Card padding="md" className="bg-amber-50 border-amber-200">
          <p className="text-sm font-bold text-amber-900">⚠️ {breeding.pending_pd_check} AI Services Awaiting PD Check</p>
          <p className="text-xs text-amber-700 mt-1">Animals served 28–90 days ago without a pregnancy result</p>
          <button onClick={() => router.visit('/breeding/pd/new')} className="mt-2 text-xs text-amber-900 font-medium underline">
            Record PD checks →
          </button>
        </Card>
      )}
    </>
  );
}

// ─── Health Tab ───────────────────────────────────────────────────────────────

function HealthTab({ health }: { health: AnalyticsProps['health'] }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Card padding="md">
          <p className="text-xs text-gray-500">Health Events (3 months)</p>
          <p className="text-xl font-bold text-gray-900">{health.total_events}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500">Treatment Cost</p>
          <p className="text-xl font-bold text-red-700">{formatKES(health.total_treatment_cost)}</p>
        </Card>
        <Card padding="md" className={health.vaccinations_due_30d > 0 ? 'bg-amber-50 border-amber-200' : ''}>
          <p className="text-xs text-gray-500">Vaccinations Due</p>
          <p className={clsx('text-xl font-bold', health.vaccinations_due_30d > 0 ? 'text-amber-700' : 'text-gray-900')}>
            {health.vaccinations_due_30d}
          </p>
          <p className="text-xs text-gray-400">next 30 days</p>
        </Card>
        <Card padding="md" className={health.deworming_due_30d > 0 ? 'bg-blue-50 border-blue-200' : ''}>
          <p className="text-xs text-gray-500">Deworming Due</p>
          <p className={clsx('text-xl font-bold', health.deworming_due_30d > 0 ? 'text-blue-700' : 'text-gray-900')}>
            {health.deworming_due_30d}
          </p>
          <p className="text-xs text-gray-400">next 30 days</p>
        </Card>
      </div>

      {/* Disease frequency */}
      {health.by_disease.length > 0 && (
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">Disease Frequency</p>
          <div className="space-y-2">
            {health.by_disease.map(d => {
              const max = health.by_disease[0].count;
              return (
                <div key={d.disease}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700">{d.disease}</span>
                    <span className="font-bold text-gray-900">{d.count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${(d.count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Monthly trend */}
      {health.monthly_trend.length > 1 && (
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">Monthly Health Events & Cost</p>
          <ResponsiveContainer width="100%" height={150}>
            <ComposedChart data={health.monthly_trend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 9 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar yAxisId="left" dataKey="events" fill="#fca5a5" name="Events" radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#dc2626" strokeWidth={2} dot={false} name="Cost (KES)" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      )}
    </>
  );
}

// ─── Finance Tab ──────────────────────────────────────────────────────────────

function FinanceTab({ financial }: { financial: AnalyticsProps['financial'] }) {
  return (
    <>
      {/* Revenue/Expenses trend */}
      {financial.trend.length > 1 && (
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">Revenue vs Expenses Trend</p>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={financial.trend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatKES(v)} />
              <Bar dataKey="revenue" fill="#16a34a" opacity={0.8} name="Revenue" radius={[2, 2, 0, 0]} />
              <Bar dataKey="expenses" fill="#dc2626" opacity={0.7} name="Expenses" radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="net_profit" stroke="#1B5E20" strokeWidth={2.5} dot={{ r: 3 }} name="Net Profit" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Revenue by channel */}
      {financial.channel_breakdown.length > 0 && (
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">Revenue by Sales Channel (30 days)</p>
          <div className="space-y-2">
            {financial.channel_breakdown.map(c => {
              const total = financial.channel_breakdown.reduce((s, x) => s + x.revenue, 0);
              const pct   = total > 0 ? Math.round((c.revenue / total) * 100) : 0;
              return (
                <div key={c.channel}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700">{c.channel}</span>
                    <div className="flex gap-2">
                      <span className="text-gray-400">{c.litres.toFixed(0)}L @ KES{c.price}</span>
                      <span className="font-bold text-green-700">{formatKES(c.revenue)} ({pct}%)</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">💡 Direct consumer sales (KES 55–80/L) yield 40–60% more than cooperative</p>
        </Card>
      )}

      {/* Cost per litre trend */}
      {financial.trend.some(t => t.cost_per_litre !== null) && (
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">Cost per Litre Trend</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={financial.trend.filter(t => t.cost_per_litre !== null)} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `KES${v}`} />
              <Tooltip formatter={(v: number) => [`KES ${v}`, 'Cost/L']} />
              <Line type="monotone" dataKey="cost_per_litre" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Kenya target: KES 25–35/L</span>
            <button onClick={() => router.visit('/finance')} className="text-primary-900 font-medium">View P&L →</button>
          </div>
        </Card>
      )}
    </>
  );
}

// ─── Feed Tab ─────────────────────────────────────────────────────────────────

function FeedTab({ feed }: { feed: AnalyticsProps['feed'] }) {
  return (
    <>
      {/* Feed cost trend */}
      {feed.monthly_trend.length > 1 && (
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">Feed Cost & Cost per Litre</p>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={feed.monthly_trend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} tickFormatter={v => `${v}`} />
              <Tooltip />
              <Bar yAxisId="left" dataKey="feed_cost" fill="#f59e0b" name="Feed Cost (KES)" radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="cost_per_litre" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} name="Cost/L (KES)" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Top feeds by cost */}
      {feed.top_feeds_30d.length > 0 && (
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">Top Feed Costs (30 days)</p>
          <div className="space-y-2">
            {feed.top_feeds_30d.map(f => {
              const total = feed.top_feeds_30d.reduce((s, x) => s + x.cost, 0);
              const pct   = total > 0 ? Math.round((f.cost / total) * 100) : 0;
              return (
                <div key={f.feed}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700">{f.feed}</span>
                    <span className="font-medium text-gray-900">{formatKES(f.cost)} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function HerdKpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white/10 rounded-xl p-2 text-center">
      <p className="text-white text-base font-bold">{value}</p>
      <p className="text-primary-200 text-[10px]">{label}</p>
    </div>
  );
}

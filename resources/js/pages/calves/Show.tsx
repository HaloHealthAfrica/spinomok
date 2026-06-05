import React from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, Scale, TrendingUp, TrendingDown } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { goBack } from '@/utils/navigation';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import type { PageProps, CalfGrowthData, CalfFeedingRecord } from '@/types';
import { formatDate, formatKES } from '@/utils/format';
import { clsx } from 'clsx';

interface ShowProps extends PageProps {
  growth: CalfGrowthData;
  feedings: CalfFeedingRecord[];
}

export default function CalfShow() {
  const { growth, feedings } = usePage<ShowProps>().props;
  const { animal, actual, targets, current_adg, latest_weight, latest_age_days, target_adg, projected_calving } = growth;

  const adgGood = current_adg !== null && current_adg >= target_adg;

  const ageLabel = latest_age_days !== null
    ? latest_age_days < 60
      ? `${latest_age_days} days old`
      : latest_age_days < 365
      ? `${Math.floor(latest_age_days / 7)} weeks old`
      : `${(latest_age_days / 365).toFixed(1)} years old`
    : 'Age unknown';

  // Merge actual and target data for chart
  const chartData: { age: number; actual?: number; target?: number }[] = [];
  const maxAge = Math.max(
    ...(actual.map(a => a.age_days ?? 0)),
    ...(targets.map(t => t.age_days)),
    0,
  );

  targets.forEach(t => {
    chartData.push({ age: t.age_days, target: t.weight_kg });
  });
  actual.forEach(a => {
    if (a.age_days !== null) {
      const existing = chartData.find(d => d.age === a.age_days);
      if (existing) existing.actual = a.weight_kg;
      else chartData.push({ age: a.age_days, actual: a.weight_kg });
    }
  });
  chartData.sort((a, b) => a.age - b.age);

  return (
    <AppLayout title={animal.name ?? animal.tag_number} showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.visit('/calves')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-white text-lg font-bold">{animal.name ?? animal.tag_number}</h1>
              <p className="text-primary-300 text-xs">{animal.breed} Â· {ageLabel}</p>
            </div>
          </div>
          <button
            onClick={() => router.visit(`/weight/record?animal_id=${animal.id}`)}
            className="bg-accent-500 text-white px-3 py-2 rounded-full text-sm font-medium flex items-center gap-1.5"
          >
            <Scale className="h-4 w-4" /> Weigh
          </button>
        </div>

        {/* Weight KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-primary-200 text-xs">Current Weight</p>
            <p className="text-white text-lg font-bold">{latest_weight?.toFixed(1) ?? 'â€”'} kg</p>
          </div>
          <div className={clsx('rounded-xl p-3 text-center', adgGood ? 'bg-green-500/20' : current_adg !== null ? 'bg-red-500/20' : 'bg-white/10')}>
            <p className="text-primary-200 text-xs">ADG</p>
            <div className="flex items-center justify-center gap-1">
              {current_adg !== null && (adgGood ? <TrendingUp className="h-4 w-4 text-green-300" /> : <TrendingDown className="h-4 w-4 text-red-300" />)}
              <p className="text-white text-lg font-bold">
                {current_adg !== null ? `${current_adg >= 0 ? '+' : ''}${current_adg.toFixed(2)}` : 'â€”'}
              </p>
            </div>
            <p className="text-primary-200 text-[10px]">kg/day Â· target {target_adg}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-primary-200 text-xs">Weighings</p>
            <p className="text-white text-lg font-bold">{growth.record_count}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Projected calving */}
        {projected_calving && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-purple-800">ðŸ„ Projected First Calving (at current ADG)</p>
            <p className="text-sm font-bold text-purple-900 mt-0.5">{projected_calving}</p>
            <p className="text-xs text-purple-600">Based on reaching 340 kg breeding weight + 280 day gestation</p>
          </div>
        )}

        {/* Growth Chart */}
        {chartData.length > 1 ? (
          <Card padding="md">
            <p className="text-sm font-bold text-gray-900 mb-3">Growth Chart</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="age" tick={{ fontSize: 10 }} tickFormatter={d => `${d}d`} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}kg`} />
                <Tooltip formatter={(val, name) => [`${val} kg`, name === 'actual' ? 'Actual' : 'Target']} labelFormatter={l => `Age: ${l} days`} />
                <Line type="monotone" dataKey="target" stroke="#d1d5db" strokeDasharray="5 5" strokeWidth={2} dot={false} name="target" />
                <Line type="monotone" dataKey="actual" stroke="#1B5E20" strokeWidth={2.5} dot={{ r: 4, fill: '#1B5E20' }} name="actual" />
                {/* Target ADG reference line at 0.5 kg/day â€” shown as note, not a line */}
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="h-2 w-6 bg-primary-900 rounded-full inline-block"></span>Actual</span>
              <span className="flex items-center gap-1"><span className="h-2 w-6 border-t-2 border-dashed border-gray-400 inline-block"></span>Breed target</span>
            </div>
          </Card>
        ) : (
          <Card className="text-center py-6">
            <p className="text-gray-500 text-sm">Record at least 2 weights to see the growth chart</p>
            <button onClick={() => router.visit(`/weight/record?animal_id=${animal.id}`)}
              className="mt-2 text-primary-900 text-sm font-medium underline">Record weight now</button>
          </Card>
        )}

        {/* Weight history */}
        {actual.length > 0 && (
          <Card padding="md">
            <p className="text-sm font-bold text-gray-900 mb-3">Weight History</p>
            <div className="space-y-2">
              {[...actual].reverse().map((rec, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatDate(rec.date)}</p>
                    <p className="text-xs text-gray-500">Age: {rec.age_days} days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{rec.weight_kg.toFixed(1)} kg</p>
                    {rec.adg !== null && (
                      <p className={clsx('text-xs font-medium', rec.adg >= 0.5 ? 'text-green-600' : rec.adg < 0 ? 'text-red-600' : 'text-amber-600')}>
                        {rec.adg >= 0 ? '+' : ''}{rec.adg.toFixed(2)} kg/d
                      </p>
                    )}
                    {rec.bcs && <p className="text-xs text-gray-400">BCS: {rec.bcs}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Calf feeding summary */}
        {feedings.length > 0 && (
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">Recent Feedings</p>
              <button onClick={() => router.visit('/calf-feeding/new')} className="text-xs text-primary-900 font-medium">+ Add</button>
            </div>
            <div className="space-y-1.5">
              {feedings.slice(0, 5).map(f => (
                <div key={f.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-700 capitalize">{f.feed_type.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-400">{formatDate(f.fed_on)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-700">{f.quantity} {f.unit}</p>
                    {f.cost && <p className="text-xs text-gray-400">{formatKES(f.cost)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Kenya protocol reference */}
        <Card padding="md" className="bg-green-50 border-green-200">
          <p className="text-sm font-bold text-green-900 mb-2">ðŸ‡°ðŸ‡ª Calf Feeding Protocol</p>
          <div className="space-y-1 text-xs text-green-700">
            <p>â€¢ <strong>Days 1â€“3:</strong> Colostrum (3â€“4 L/day)</p>
            <p>â€¢ <strong>Days 4â€“60:</strong> Whole milk 4â€“6 L/day (AM + PM)</p>
            <p>â€¢ <strong>Day 14+:</strong> Introduce calf pellets (starter)</p>
            <p>â€¢ <strong>Day 60â€“90:</strong> Wean (reduce milk by 1L every 5 days)</p>
            <p>â€¢ <strong>Target weaning weight:</strong> 70â€“80 kg</p>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

import React from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, Scale, TrendingUp, TrendingDown } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { clsx } from 'clsx';
import type { PageProps, CalfGrowthData, CalfFeedingRecord } from '@/types';
import { formatDate, formatKES } from '@/utils/format';

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

  return (
    <AppLayout title={animal.name ?? animal.tag_number} showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.visit('/calves')}
              className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-white text-lg font-bold">{animal.name ?? animal.tag_number}</h1>
              <p className="text-primary-300 text-xs">{animal.breed} · {ageLabel}</p>
            </div>
          </div>
          <button
            onClick={() => router.visit(`/weight/record?animal_id=${animal.id}`)}
            className="bg-green-500 text-white px-3 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 active:opacity-80"
          >
            <Scale className="h-4 w-4" /> Weigh
          </button>
        </div>

        {/* Weight KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-primary-200 text-xs">Current Weight</p>
            <p className="text-white text-lg font-bold">{latest_weight != null ? `${latest_weight.toFixed(1)} kg` : '—'}</p>
          </div>
          <div className={clsx('rounded-xl p-3 text-center', adgGood ? 'bg-green-500/20' : current_adg !== null ? 'bg-red-500/20' : 'bg-white/10')}>
            <p className="text-primary-200 text-xs">ADG</p>
            <div className="flex items-center justify-center gap-1">
              {current_adg !== null && (
                adgGood
                  ? <TrendingUp className="h-4 w-4 text-green-300" />
                  : <TrendingDown className="h-4 w-4 text-red-300" />
              )}
              <p className="text-white text-lg font-bold">
                {current_adg != null ? `${current_adg >= 0 ? '+' : ''}${current_adg.toFixed(2)}` : '—'}
              </p>
            </div>
            <p className="text-primary-200 text-[10px]">kg/day · target {target_adg}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-primary-200 text-xs">Weighings</p>
            <p className="text-white text-lg font-bold">{growth.record_count}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-8">

        {/* Projected calving */}
        {projected_calving && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-purple-800">🐄 Projected First Calving (at current ADG)</p>
            <p className="text-sm font-bold text-purple-900 mt-0.5">{projected_calving}</p>
            <p className="text-xs text-purple-600">Based on reaching 340 kg breeding weight + 280 day gestation</p>
          </div>
        )}

        {/* Growth chart (CSS-based, no Recharts) */}
        {actual.length >= 2 ? (
          <Card padding="md">
            <p className="text-sm font-bold text-gray-900 mb-4">Growth Chart</p>
            <GrowthChart actual={actual} targets={targets} />
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-5 bg-primary-900 rounded-full inline-block" />
                Actual
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-5 border-t-2 border-dashed border-gray-400 inline-block" />
                Target
              </span>
            </div>
          </Card>
        ) : (
          <Card className="text-center py-6">
            <p className="text-gray-500 text-sm">Record at least 2 weights to see the growth chart</p>
            <button
              onClick={() => router.visit(`/weight/record?animal_id=${animal.id}`)}
              className="mt-2 text-primary-900 text-sm font-medium underline"
            >
              Record weight now
            </button>
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
                    {rec.age_days != null && (
                      <p className="text-xs text-gray-500">Age: {rec.age_days} days</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{rec.weight_kg.toFixed(1)} kg</p>
                    {rec.adg != null && (
                      <p className={clsx(
                        'text-xs font-medium',
                        rec.adg >= 0.5 ? 'text-green-600' : rec.adg < 0 ? 'text-red-600' : 'text-amber-600',
                      )}>
                        {rec.adg >= 0 ? '+' : ''}{rec.adg.toFixed(2)} kg/d
                      </p>
                    )}
                    {rec.bcs != null && <p className="text-xs text-gray-400">BCS: {rec.bcs}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Feeding summary */}
        {feedings.length > 0 && (
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">Recent Feedings</p>
              <button
                onClick={() => router.visit('/calf-feeding/new')}
                className="text-xs text-primary-900 font-medium"
              >
                + Add
              </button>
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
                    {f.cost != null && <p className="text-xs text-gray-400">{formatKES(f.cost)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Kenya protocol */}
        <Card padding="md" className="bg-green-50 border border-green-200">
          <p className="text-sm font-bold text-green-900 mb-2">🇰🇪 Calf Feeding Protocol</p>
          <div className="space-y-1 text-xs text-green-700">
            <p>• <strong>Days 1–3:</strong> Colostrum (3–4 L/day)</p>
            <p>• <strong>Days 4–60:</strong> Whole milk 4–6 L/day (AM + PM)</p>
            <p>• <strong>Day 14+:</strong> Introduce calf pellets (starter)</p>
            <p>• <strong>Day 60–90:</strong> Wean (reduce milk by 1L every 5 days)</p>
            <p>• <strong>Target weaning weight:</strong> 70–80 kg</p>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

// ─── CSS Growth Chart (no Recharts) ──────────────────────────────────────────

function GrowthChart({
  actual,
  targets,
}: {
  actual: CalfGrowthData['actual'];
  targets: CalfGrowthData['targets'];
}) {
  // Merge data points and sort by age
  const allPoints: { age: number; actual?: number; target?: number }[] = [];

  targets.forEach(t => allPoints.push({ age: t.age_days, target: t.weight_kg }));
  actual.forEach(a => {
    if (a.age_days == null) return;
    const existing = allPoints.find(p => p.age === a.age_days);
    if (existing) existing.actual = a.weight_kg;
    else allPoints.push({ age: a.age_days, actual: a.weight_kg });
  });
  allPoints.sort((a, b) => a.age - b.age);

  const maxAge    = Math.max(...allPoints.map(p => p.age), 1);
  const maxWeight = Math.max(...allPoints.map(p => Math.max(p.actual ?? 0, p.target ?? 0)), 1);
  const height    = 160;
  const width     = 300;

  const toX = (age: number)    => (age / maxAge) * width;
  const toY = (weight: number) => height - (weight / maxWeight) * height;

  const actualPoints = allPoints.filter(p => p.actual != null) as { age: number; actual: number }[];
  const targetPoints = allPoints.filter(p => p.target != null) as { age: number; target: number }[];

  const polyActual = actualPoints.map(p => `${toX(p.age)},${toY(p.actual)}`).join(' ');
  const polyTarget = targetPoints.map(p => `${toX(p.age)},${toY(p.target)}`).join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: 160 }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={0} y1={height * (1 - f)} x2={width} y2={height * (1 - f)}
            stroke="#f0f0f0" strokeWidth={1} />
        ))}

        {/* Target line (dashed) */}
        {targetPoints.length >= 2 && (
          <polyline points={polyTarget} fill="none" stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="4 4" />
        )}

        {/* Actual line */}
        {actualPoints.length >= 2 && (
          <polyline points={polyActual} fill="none" stroke="#1B5E20" strokeWidth={2.5} />
        )}

        {/* Actual dots */}
        {actualPoints.map((p, i) => (
          <circle key={i} cx={toX(p.age)} cy={toY(p.actual)} r={4} fill="#1B5E20" />
        ))}
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between text-[9px] text-gray-400 mt-1 px-1">
        {[0, Math.round(maxAge * 0.25), Math.round(maxAge * 0.5), Math.round(maxAge * 0.75), maxAge].map(d => (
          <span key={d}>{d}d</span>
        ))}
      </div>
    </div>
  );
}

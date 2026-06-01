import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Leaf, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import axios from 'axios';
import type { PageProps, MealFormula, RationCalculation } from '@/types';
import { formatKES, today } from '@/utils/format';

interface RationProps extends PageProps {
  formulas: MealFormula[];
}

const GROUP_OPTIONS = [
  { value: 'lactating', label: '🥛 Lactating Cows', hint: 'High-producing cows · target CP 16–18%' },
  { value: 'dry',       label: '🌿 Dry Cows',       hint: 'Pre-calving · no concentrates' },
  { value: 'heifer',    label: '🐄 Heifers',         hint: 'Growing animals · target CP 14–16%' },
  { value: 'calf',      label: '🐮 Calves',          hint: 'Starter phase · target CP 18–20%' },
];

export default function RationPlanner() {
  const { formulas } = usePage<RationProps>().props;

  const [animalGroup, setAnimalGroup] = useState('lactating');
  const [milkYield, setMilkYield] = useState('20');
  const [liveWeight, setLiveWeight] = useState('500');
  const [headCount, setHeadCount] = useState('10');
  const [ration, setRation] = useState<RationCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, setData, post, processing, errors } = useForm({
    name:               '',
    animal_group:       'lactating',
    production_level:   'medium',
    head_count:         10,
    target_milk_yield_l: 20,
    animal_weight_kg:   500,
    valid_from:         today(),
    valid_until:        '',
    notes:              '',
  });

  const calculate = useCallback(async () => {
    setLoading(true);
    try {
      const { data: result } = await axios.post('/api/formulation/ration/calculate', {
        animal_group:        animalGroup,
        target_milk_yield_l: parseFloat(milkYield) || 15,
        animal_weight_kg:    parseFloat(liveWeight) || 500,
        head_count:          parseInt(headCount) || 1,
      });
      setRation(result);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [animalGroup, milkYield, liveWeight, headCount]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(calculate, 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [animalGroup, milkYield, liveWeight, headCount]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setData(d => ({
      ...d,
      animal_group: animalGroup,
      target_milk_yield_l: parseFloat(milkYield) || 15,
      animal_weight_kg: parseFloat(liveWeight) || 500,
      head_count: parseInt(headCount) || 1,
    }));
    post('/formulation/ration');
  };

  const selectedGroup = GROUP_OPTIONS.find(g => g.value === animalGroup);

  return (
    <AppLayout title="Ration Planner" showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3 mb-3">
          <button onClick={() => router.visit('/formulation')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-white text-lg font-bold">Ration Planner</h1>
            <p className="text-primary-300 text-xs">Daily feed plan by animal group</p>
          </div>
          {loading && <RefreshCw className="h-4 w-4 text-primary-300 animate-spin" />}
        </div>

        {/* Live summary if ration calculated */}
        {ration && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-xl p-2 text-center">
              <p className="text-primary-200 text-[10px]">CP%</p>
              <p className={clsx('text-sm font-bold', ration.computed_cp_percent >= (ration.cp_target?.cp_min ?? 0) ? 'text-white' : 'text-amber-300')}>
                {ration.computed_cp_percent}%
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-2 text-center">
              <p className="text-primary-200 text-[10px]">Cost/Head</p>
              <p className="text-sm font-bold text-white">{formatKES(ration.cost_per_head_per_day)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2 text-center">
              <p className="text-primary-200 text-[10px]">DM Intake</p>
              <p className="text-sm font-bold text-white">{ration.total_dm_kg_per_head} kg</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Animal group */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Animal Group</label>
          <div className="grid grid-cols-2 gap-2">
            {GROUP_OPTIONS.map(g => (
              <button key={g.value} type="button" onClick={() => setAnimalGroup(g.value)}
                className={clsx('py-3 px-3 rounded-xl border text-sm font-medium text-left transition-all',
                  animalGroup === g.value ? 'bg-primary-900 text-white border-primary-900' : 'bg-white text-gray-600 border-gray-200')}>
                <p>{g.label}</p>
                <p className={clsx('text-[10px] mt-0.5', animalGroup === g.value ? 'text-primary-200' : 'text-gray-400')}>{g.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-3 gap-3">
          {animalGroup === 'lactating' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Milk Yield</label>
              <div className="relative">
                <input type="number" min="0" max="60" step="1" inputMode="decimal" value={milkYield}
                  onChange={e => setMilkYield(e.target.value)}
                  className="h-12 w-full rounded-xl border border-gray-300 px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">L/d</span>
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Live Weight</label>
            <div className="relative">
              <input type="number" min="50" max="900" step="10" value={liveWeight}
                onChange={e => setLiveWeight(e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">kg</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Head Count</label>
            <input type="number" min="1" max="500" step="1" value={headCount}
              onChange={e => setHeadCount(e.target.value)}
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
          </div>
        </div>

        {/* Ration result */}
        {ration && (
          <div className="space-y-3">
            {/* Warnings */}
            {ration.warnings.length > 0 && (
              <div className="space-y-1">
                {ration.warnings.map((w, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700">
                    ⚠️ {w}
                  </div>
                ))}
              </div>
            )}

            {/* Feed components */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-bold text-green-900 mb-3">
                📋 Recommended Daily Ration — {selectedGroup?.label}
              </p>
              <div className="space-y-2">
                {ration.components.map((comp, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-green-100 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">{comp.component_name}</p>
                      <p className="text-xs text-green-600">
                        CP: {comp.cp_contribution_percent.toFixed(1)}% · ME: {comp.me_contribution.toFixed(1)} MJ
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-900">{comp.quantity_kg_per_head} kg</p>
                      <p className="text-xs text-green-600">{formatKES(comp.cost_per_head)}/head</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-green-300 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-green-600">Per Head / Day</p>
                  <p className="text-lg font-bold text-green-900">{formatKES(ration.cost_per_head_per_day)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-600">Total ({headCount} head)</p>
                  <p className="text-lg font-bold text-green-900">{formatKES(ration.total_daily_cost)}</p>
                </div>
              </div>
            </div>

            {/* Save plan form */}
            <form onSubmit={submit} className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Save as Ration Plan</p>
              <Input label="Plan Name" placeholder="e.g. Lactating Cows — High Yield" required
                value={data.name} onChange={e => setData('name', e.target.value)} error={errors.name} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Valid From</label>
                  <input type="date" value={data.valid_from} onChange={e => setData('valid_from', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Valid Until</label>
                  <input type="date" value={data.valid_until} onChange={e => setData('valid_until', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
                </div>
              </div>
              <Button type="submit" fullWidth loading={processing} disabled={!data.name}
                leftIcon={<Leaf className="h-5 w-5" />}>
                Save Ration Plan
              </Button>
            </form>
          </div>
        )}

        {!ration && loading && (
          <div className="text-center py-8 text-gray-400">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">Calculating ration...</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

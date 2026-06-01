import React, { useState, useCallback, useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, FlaskConical, Plus, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import axios from 'axios';
import type { PageProps, MealIngredient, MealFormula, FormulaCalculation } from '@/types';
import { formatKES } from '@/utils/format';

interface BuilderProps extends PageProps {
  ingredients: MealIngredient[];
  formula?: MealFormula;
}

interface RowEntry {
  meal_ingredient_id: string;
  inclusion_percent: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  energy: '⚡ Energy', protein: '💪 Protein', mineral: '🪨 Mineral', additive: '🧪 Additive',
};

export default function FormulaBuilder() {
  const { ingredients, formula } = usePage<BuilderProps>().props;
  const isEdit = !!formula;

  const [name, setName] = useState(formula?.name ?? '');
  const [description, setDescription] = useState(formula?.description ?? '');
  const [batchSize, setBatchSize] = useState(formula?.batch_size_kg?.toString() ?? '100');
  const [targetCp, setTargetCp] = useState(formula?.target_cp_percent?.toString() ?? '16');
  const [season, setSeason] = useState(formula?.season ?? 'general');

  // Initialize rows from existing formula or one empty row
  const initialRows: RowEntry[] = formula?.ingredients_with_details?.map(fi => ({
    meal_ingredient_id: fi.meal_ingredient_id,
    inclusion_percent: fi.inclusion_percent.toString(),
  })) ?? [{ meal_ingredient_id: ingredients[0]?.id ?? '', inclusion_percent: '' }];

  const [rows, setRows] = useState<RowEntry[]>(initialRows);
  const [calc, setCalc] = useState<FormulaCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalInclusion = rows.reduce((sum, r) => sum + (parseFloat(r.inclusion_percent) || 0), 0);
  const remaining = 100 - totalInclusion;

  // Auto-calculate when rows change (debounced 600ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => recalculate(), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [rows, batchSize]);

  const recalculate = useCallback(async () => {
    const validRows = rows.filter(r => r.meal_ingredient_id && parseFloat(r.inclusion_percent) > 0);
    if (validRows.length === 0) { setCalc(null); return; }

    setCalculating(true);
    try {
      const { data } = await axios.post('/api/formulation/calculate', {
        ingredients: validRows.map(r => ({
          meal_ingredient_id: r.meal_ingredient_id,
          inclusion_percent: parseFloat(r.inclusion_percent),
        })),
        batch_size_kg: parseFloat(batchSize) || 100,
      });
      setCalc(data);
    } catch {
      // silent
    } finally {
      setCalculating(false);
    }
  }, [rows, batchSize]);

  const addRow = () => {
    const used = rows.map(r => r.meal_ingredient_id);
    const next = ingredients.find(i => !used.includes(i.id));
    setRows(prev => [...prev, { meal_ingredient_id: next?.id ?? '', inclusion_percent: '' }]);
  };

  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const updateRow = (i: number, field: keyof RowEntry, value: string) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const save = async () => {
    if (!name) { alert('Please enter a formula name'); return; }
    const validRows = rows.filter(r => r.meal_ingredient_id && parseFloat(r.inclusion_percent) > 0);
    if (validRows.length < 2) { alert('Add at least 2 ingredients'); return; }

    setSaving(true);
    const payload = {
      name, description, batch_size_kg: parseFloat(batchSize), target_cp_percent: parseFloat(targetCp), season,
      ingredients: validRows.map(r => ({
        meal_ingredient_id: r.meal_ingredient_id,
        inclusion_percent: parseFloat(r.inclusion_percent),
      })),
    };

    try {
      if (isEdit && formula?.id) {
        await axios.put(`/formulation/formula/${formula.id}`, payload);
      } else {
        await axios.post('/formulation/formula', payload);
      }
      router.visit('/formulation', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Save failed. Please try again.';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const getIngredient = (id: string) => ingredients.find(i => i.id === id);

  return (
    <AppLayout title={isEdit ? 'Edit Formula' : 'Formula Builder'} showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button onClick={() => router.visit('/formulation')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-white text-lg font-bold">{isEdit ? 'Edit Formula' : 'Build Dairy Meal Formula'}</h1>
            <p className="text-primary-300 text-xs">Batch: {batchSize} kg · Target CP: {targetCp}%</p>
          </div>
          {calculating && <RefreshCw className="h-4 w-4 text-primary-300 animate-spin" />}
        </div>

        {/* Live CP/cost preview */}
        {calc && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <LiveStat
              label="CP%"
              value={`${calc.computed_cp_percent}%`}
              good={calc.computed_cp_percent >= 14 && calc.computed_cp_percent <= 20}
            />
            <LiveStat label="ME" value={`${calc.computed_me}`} good />
            <LiveStat label="KES/kg" value={`${calc.cost_per_kg}`} good />
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Formula details */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Formula Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Standard Dairy Meal 16% CP"
              className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Batch Size</label>
              <div className="relative">
                <input type="number" min="10" step="10" value={batchSize} onChange={e => setBatchSize(e.target.value)}
                  className="h-12 w-full rounded-xl border border-gray-300 px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kg</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Target CP%</label>
              <div className="relative">
                <input type="number" min="8" max="30" step="0.5" value={targetCp} onChange={e => setTargetCp(e.target.value)}
                  className="h-12 w-full rounded-xl border border-gray-300 px-4 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Season</label>
            <select value={season} onChange={e => setSeason(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600">
              <option value="general">General (Year-round)</option>
              <option value="wet_season">Wet Season (Mar–May, Oct–Dec)</option>
              <option value="dry_season">Dry Season (Jun–Sep, Jan–Feb)</option>
            </select>
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-semibold text-gray-800">Ingredients</p>
              <p className={clsx('text-xs', Math.abs(remaining) < 0.5 ? 'text-green-600' : 'text-amber-600')}>
                Total: {totalInclusion.toFixed(1)}% (remaining: {remaining.toFixed(1)}%)
              </p>
            </div>
            <button type="button" onClick={addRow}
              className="flex items-center gap-1 text-xs text-primary-900 font-medium">
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>

          <div className="space-y-2">
            {rows.map((row, i) => {
              const ing = getIngredient(row.meal_ingredient_id);
              const pct = parseFloat(row.inclusion_percent) || 0;
              const exceedsMax = ing?.max_inclusion_percent && pct > ing.max_inclusion_percent;

              return (
                <div key={i} className={clsx('bg-white border rounded-xl p-3', exceedsMax ? 'border-red-300 bg-red-50' : 'border-gray-200')}>
                  <div className="flex items-center gap-2">
                    <select value={row.meal_ingredient_id} onChange={e => updateRow(i, 'meal_ingredient_id', e.target.value)}
                      className="flex-1 h-10 rounded-lg border border-gray-300 px-2 text-sm focus:outline-none bg-white">
                      {['energy', 'protein', 'mineral', 'additive'].map(cat => {
                        const catIngs = ingredients.filter(ing => ing.category === cat);
                        return (
                          <optgroup key={cat} label={CATEGORY_LABELS[cat] ?? cat}>
                            {catIngs.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                          </optgroup>
                        );
                      })}
                    </select>
                    <div className="relative w-24 flex-shrink-0">
                      <input type="number" min="0" max="100" step="0.5" inputMode="decimal"
                        placeholder="0" value={row.inclusion_percent}
                        onChange={e => updateRow(i, 'inclusion_percent', e.target.value)}
                        className={clsx('h-10 w-full rounded-lg border px-3 pr-7 text-sm text-center font-bold focus:outline-none',
                          exceedsMax ? 'border-red-400 text-red-700 bg-red-50' :
                          pct > 0 ? 'border-primary-300 bg-primary-50 text-primary-900' : 'border-gray-200')} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                    </div>
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(i)} className="h-8 w-8 flex items-center justify-center text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {ing && pct > 0 && (
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                      <span>CP: {ing.crude_protein_percent}%</span>
                      <span>ME: {ing.metabolizable_energy}</span>
                      {ing.price_per_kg && <span>KES {ing.price_per_kg}/kg</span>}
                      {exceedsMax && <span className="text-red-600 font-medium flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" /> Max {ing.max_inclusion_percent}%</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Calculation results */}
        {calc && (
          <div className="space-y-3">
            {/* Warnings */}
            {calc.warnings.length > 0 && (
              <div className="space-y-1.5">
                {calc.warnings.map((w, i) => (
                  <div key={i} className={clsx('rounded-xl px-3 py-2 flex items-start gap-2 text-xs',
                    w.type === 'danger' ? 'bg-red-50 border border-red-200 text-red-700' :
                    w.type === 'error'  ? 'bg-red-50 border border-red-200 text-red-700' :
                                          'bg-amber-50 border border-amber-200 text-amber-700')}>
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>{w.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Nutrition results */}
            <Card padding="md" className="bg-blue-50 border-blue-200">
              <p className="text-sm font-bold text-blue-900 mb-3">Formula Nutrition Results</p>
              <div className="grid grid-cols-2 gap-3">
                <NutrientResult label="Crude Protein (CP%)" value={calc.computed_cp_percent} unit="%" good={calc.computed_cp_percent >= 14 && calc.computed_cp_percent <= 20} goodRange="14–20%" />
                <NutrientResult label="Metabolizable Energy" value={calc.computed_me} unit=" MJ/kg DM" good={calc.computed_me >= 10} goodRange=">10" />
                <NutrientResult label="Calcium" value={calc.computed_calcium_percent} unit="%" />
                <NutrientResult label="Phosphorus" value={calc.computed_phosphorus_percent} unit="%" />
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200 flex justify-between items-center">
                <div>
                  <p className="text-xs text-blue-700">Cost per kg</p>
                  <p className="text-lg font-bold text-blue-900">KES {calc.cost_per_kg}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-700">Total batch ({batchSize} kg)</p>
                  <p className="text-lg font-bold text-blue-900">{formatKES(calc.total_batch_cost)}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <Button type="button" fullWidth size="lg" loading={saving} onClick={save}
          leftIcon={<FlaskConical className="h-5 w-5" />}>
          {isEdit ? 'Update Formula' : 'Save Formula'}
        </Button>
      </div>
    </AppLayout>
  );
}

function LiveStat({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="bg-white/10 rounded-xl p-2 text-center">
      <p className="text-primary-200 text-[10px]">{label}</p>
      <p className={clsx('text-sm font-bold', good ? 'text-white' : 'text-amber-300')}>{value}</p>
    </div>
  );
}

function NutrientResult({ label, value, unit, good, goodRange }: {
  label: string; value: number; unit: string; good?: boolean; goodRange?: string;
}) {
  return (
    <div>
      <p className="text-xs text-blue-600">{label}</p>
      <p className={clsx('text-sm font-bold', good === true ? 'text-green-700' : good === false ? 'text-amber-700' : 'text-blue-900')}>
        {value.toFixed(2)}{unit}
      </p>
      {goodRange && <p className="text-[10px] text-blue-500">Target: {goodRange}</p>}
    </div>
  );
}

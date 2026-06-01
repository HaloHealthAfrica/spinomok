import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
  Plus, FlaskConical, Leaf, Edit2, Trash2, ChevronRight,
  CheckCircle, AlertTriangle, Scale,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';
import type { PageProps, MealFormula, MealIngredient, RationPlan } from '@/types';
import { formatKES } from '@/utils/format';
import axios from 'axios';

interface FormulationIndexProps extends PageProps {
  formulas: MealFormula[];
  rationPlans: RationPlan[];
  ingredients: MealIngredient[];
  commercialPrice: number | null;
}

const TABS = ['Formulas', 'Rations', 'Ingredients'] as const;
type Tab = typeof TABS[number];

export default function FormulationIndex() {
  const { formulas, rationPlans, ingredients, commercialPrice } = usePage<FormulationIndexProps>().props;
  const [tab, setTab] = useState<Tab>('Formulas');

  return (
    <AppLayout title="Feed Formulation">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-4">
          <h1 className="text-white text-xl font-bold">Feed Formulation</h1>
          <button
            onClick={() => router.visit('/formulation/formula/new')}
            className="flex items-center gap-1.5 bg-accent-500 text-white px-3 py-2 rounded-full text-sm font-medium"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            New Formula
          </button>
        </div>

        {/* Savings banner if commercial price known */}
        {commercialPrice && formulas.length > 0 && (
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-white text-xs font-semibold">💡 Commercial dairy meal: KES {commercialPrice}/kg</p>
            {formulas[0].cost_per_kg && (
              <p className="text-green-300 text-xs mt-0.5">
                Your formula: KES {formulas[0].cost_per_kg}/kg
                {parseFloat(formulas[0].cost_per_kg.toString()) < commercialPrice && (
                  <span className="font-bold"> → Save KES {(commercialPrice - parseFloat(formulas[0].cost_per_kg.toString())).toFixed(1)}/kg ✓</span>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
              tab === t ? 'text-primary-900 border-primary-900' : 'text-gray-500 border-transparent')}>
            {t}
            {t === 'Formulas' && <span className="ml-1 text-xs text-gray-400">({formulas.length})</span>}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-4">
        {tab === 'Formulas'     && <FormulasTab formulas={formulas} commercialPrice={commercialPrice} />}
        {tab === 'Rations'      && <RationsTab rationPlans={rationPlans} />}
        {tab === 'Ingredients'  && <IngredientsTab ingredients={ingredients} />}
      </div>

      {/* Quick actions */}
      <div className="sticky bottom-16 px-4 pb-3">
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 grid grid-cols-2 gap-2">
          <button onClick={() => router.visit('/formulation/formula/new')}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-blue-700 bg-blue-50 active:opacity-70">
            <FlaskConical className="h-5 w-5" /> Mix Formula
          </button>
          <button onClick={() => router.visit('/formulation/ration/new')}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-green-700 bg-green-50 active:opacity-70">
            <Leaf className="h-5 w-5" /> Plan Ration
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Formulas Tab ─────────────────────────────────────────────────────────────

function FormulasTab({ formulas, commercialPrice }: { formulas: MealFormula[]; commercialPrice: number | null }) {
  const deleteFormula = async (id: string) => {
    if (!confirm('Delete this formula?')) return;
    await axios.delete(`/formulation/formula/${id}`);
    router.reload({ only: ['formulas'] });
  };

  if (formulas.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="text-center py-10">
          <FlaskConical className="h-10 w-10 text-blue-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-800">No formulas yet</p>
          <p className="text-xs text-gray-500 mt-1 mb-4">Create a custom dairy meal recipe to reduce feed costs</p>
          <button onClick={() => router.visit('/formulation/formula/new')}
            className="px-4 py-2 bg-primary-900 text-white rounded-xl text-sm font-medium">
            Create First Formula
          </button>
        </Card>
        <FormulaGuide />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {formulas.map(formula => {
        const saving = commercialPrice && formula.cost_per_kg
          ? commercialPrice - parseFloat(formula.cost_per_kg.toString())
          : null;

        return (
          <Card key={formula.id} padding="md">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <FlaskConical className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-900">{formula.name}</p>
                  {formula.season && formula.season !== 'general' && (
                    <Badge variant="info" size="sm">{formula.season.replace('_', ' ')}</Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <NutrientBadge label="CP%" value={formula.computed_cp_percent} unit="%" target={{ min: 14, max: 20 }} />
                  <NutrientBadge label="ME" value={formula.computed_me} unit="MJ" />
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400">Cost/kg</p>
                    <p className="text-xs font-bold text-gray-900">
                      {formula.cost_per_kg ? `KES ${formula.cost_per_kg}` : '—'}
                    </p>
                  </div>
                </div>
                {saving !== null && saving > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-green-700 font-medium">
                    <CheckCircle className="h-3 w-3" />
                    Save KES {saving.toFixed(1)}/kg vs commercial meal
                  </div>
                )}
                {formula.total_batch_cost && (
                  <p className="text-xs text-gray-500 mt-1">
                    Batch ({formula.batch_size_kg} kg): {formatKES(parseFloat(formula.total_batch_cost.toString()))}
                  </p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => router.visit(`/formulation/formula/${formula.id}/edit`)}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => deleteFormula(formula.id)}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-red-50 text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Ingredient breakdown */}
            {formula.ingredients_with_details && formula.ingredients_with_details.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap gap-1.5">
                  {formula.ingredients_with_details.map(fi => (
                    <span key={fi.meal_ingredient_id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {fi.ingredient?.name.split(' ')[0]} {fi.inclusion_percent}%
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <FormulaGuide />
    </div>
  );
}

function NutrientBadge({ label, value, unit, target }: {
  label: string; value: number | null; unit: string; target?: { min: number; max: number };
}) {
  const num = value ? parseFloat(value.toString()) : null;
  const inRange = target && num !== null ? num >= target.min && num <= target.max : true;

  return (
    <div className="text-center">
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className={clsx('text-xs font-bold', target ? (inRange ? 'text-green-700' : 'text-amber-600') : 'text-gray-900')}>
        {num !== null ? `${num}${unit}` : '—'}
      </p>
      {target && num !== null && !inRange && (
        <p className="text-[9px] text-amber-500">Target: {target.min}–{target.max}</p>
      )}
    </div>
  );
}

function FormulaGuide() {
  return (
    <Card padding="md" className="bg-blue-50 border-blue-200">
      <p className="text-sm font-bold text-blue-900 mb-2">🇰🇪 Standard Formula Guide (100 kg batch)</p>
      <div className="space-y-1 text-xs text-blue-700">
        <p>• Maize germ / bran: 40 kg (energy base)</p>
        <p>• Wheat bran / pollard: 25 kg (energy + fibre)</p>
        <p>• Cotton seed cake: 15 kg ⚠️ (max 20%)</p>
        <p>• Sunflower cake: 12 kg (protein)</p>
        <p>• DCP: 2.5 kg + Lime: 2 kg + Salt: 1.5 kg + Premix: 2 kg</p>
        <p className="font-bold mt-1">Result: ~16% CP, cost KES 36–40/kg (vs KES 50–55 commercial)</p>
      </div>
    </Card>
  );
}

// ─── Rations Tab ──────────────────────────────────────────────────────────────

function RationsTab({ rationPlans }: { rationPlans: RationPlan[] }) {
  return (
    <div className="space-y-3">
      <button onClick={() => router.visit('/formulation/ration/new')}
        className="w-full bg-green-600 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2">
        <Leaf className="h-5 w-5" /> Plan New Ration
      </button>

      {rationPlans.length === 0 ? (
        <Card className="text-center py-8">
          <Leaf className="h-8 w-8 text-green-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-800">No ration plans yet</p>
          <p className="text-xs text-gray-500 mt-1">Plan daily rations by animal group to optimize feeding</p>
        </Card>
      ) : (
        rationPlans.map(plan => (
          <Card key={plan.id} padding="md">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Leaf className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{plan.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 capitalize">{plan.animal_group} cows · {plan.head_count ?? '?'} head</p>
                <div className="flex items-center gap-4 mt-2">
                  {plan.computed_cp_percent && (
                    <span className="text-xs font-medium text-gray-600">CP: {plan.computed_cp_percent}%</span>
                  )}
                  {plan.cost_per_head_per_day && (
                    <span className="text-xs font-bold text-green-700">
                      {formatKES(parseFloat(plan.cost_per_head_per_day.toString()))}/head/day
                    </span>
                  )}
                </div>
              </div>
            </div>
            {plan.components && plan.components.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                {plan.components.map((comp, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-600">{comp.component_name}</span>
                    <span className="font-medium text-gray-900">{comp.quantity_kg_per_head} kg</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))
      )}

      <Card padding="md" className="bg-green-50 border-green-200">
        <p className="text-sm font-bold text-green-900 mb-2">Dairy Meal Challenge Feeding Rule</p>
        <p className="text-xs text-green-700">
          Dairy Meal per day = (Daily Milk L − 5) ÷ 3
        </p>
        <p className="text-xs text-green-600 mt-1">
          Example: 20L/day → (20 − 5) ÷ 3 = <strong>5 kg dairy meal/day</strong>
        </p>
        <p className="text-xs text-green-600">Minimum: 2 kg/day · Maximum: 12 kg/day</p>
      </Card>
    </div>
  );
}

// ─── Ingredients Tab ──────────────────────────────────────────────────────────

function IngredientsTab({ ingredients }: { ingredients: MealIngredient[] }) {
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState('');

  const savePrice = async (ingredientId: string) => {
    if (!newPrice || parseFloat(newPrice) <= 0) return;
    await axios.post('/api/formulation/price', { meal_ingredient_id: ingredientId, price_per_kg: parseFloat(newPrice) });
    setEditingPrice(null);
    setNewPrice('');
    router.reload({ only: ['ingredients'] });
  };

  const categories = ['energy', 'protein', 'mineral', 'additive'] as const;

  return (
    <div className="space-y-4">
      {categories.map(cat => {
        const catIngredients = ingredients.filter(i => i.category === cat);
        if (catIngredients.length === 0) return null;

        return (
          <section key={cat}>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 capitalize">
              {cat} sources
            </h2>
            <div className="space-y-1.5">
              {catIngredients.map(ing => (
                <Card key={ing.id} padding="sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{ing.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        <span>CP: {ing.crude_protein_percent}%</span>
                        <span>ME: {ing.metabolizable_energy}</span>
                        {ing.max_inclusion_percent && <span className="text-amber-600">Max: {ing.max_inclusion_percent}%</span>}
                      </div>
                      {ing.notes && <p className="text-xs text-red-600 mt-0.5">{ing.notes}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {editingPrice === ing.id ? (
                        <div className="flex items-center gap-1">
                          <input type="number" min="0" step="0.5" value={newPrice} onChange={e => setNewPrice(e.target.value)}
                            placeholder="KES/kg"
                            className="h-7 w-20 rounded border border-gray-300 text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary-600" />
                          <button onClick={() => savePrice(ing.id)} className="text-xs text-green-600 font-medium">✓</button>
                          <button onClick={() => setEditingPrice(null)} className="text-xs text-gray-400">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingPrice(ing.id); setNewPrice(ing.price_per_kg?.toString() ?? ''); }}
                          className="text-right">
                          {ing.price_per_kg ? (
                            <p className="text-sm font-bold text-gray-900">KES {ing.price_per_kg}/kg</p>
                          ) : (
                            <p className="text-xs text-amber-600">Set price</p>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      <p className="text-xs text-gray-400 text-center">Tap price to update current market price</p>
    </div>
  );
}

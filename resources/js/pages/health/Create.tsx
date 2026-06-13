import React, { useState, useCallback } from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Heart, Plus, Trash2, Stethoscope, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { PageProps, Animal, DiseaseType, MedicationType } from '@/types';
import { today } from '@/utils/format';

interface Medicine {
  name: string;
  type: 'Treatment' | 'Prevention' | 'Diagnostic' | 'Supportive';
  note: string;
  note_sw: string;
}

interface AIRecommendation {
  condition: string;
  severity: string;
  urgency: string;
  summary: string;
  summary_sw: string;
  recommended_medicines: Medicine[];
  management_tips: string[];
  management_tips_sw: string[];
  disclaimer: string;
  disclaimer_sw: string;
}

interface CreateProps extends PageProps {
  animals: Animal[];
  diseases: DiseaseType[];
  meds: MedicationType[];
  preAnimal: string | null;
}

interface TreatmentEntry {
  _key: number;
  medication_type_id: string;
  treated_on: string;
  dose_amount: string;
  dose_unit: string;
  route: string;
  cost: string;
}

let _keyCounter = 0;

export default function HealthCreate() {
  const { animals, diseases, meds, preAnimal } = usePage<CreateProps>().props;
  const [treatments, setTreatments] = useState<TreatmentEntry[]>([]);
  const [aiRec, setAiRec]           = useState<AIRecommendation | null>(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiError, setAiError]       = useState<string | null>(null);
  const [aiLang, setAiLang]         = useState<'en' | 'sw'>('en');

  const { data, setData, post, processing, errors } = useForm({
    animal_id:         preAnimal ?? '',
    observed_on:       today(),
    disease_type_id:   '',
    symptoms:          '',
    severity:          'moderate',
    vet_consulted:     false,
    vet_name:          '',
    consultation_cost: '',
    notes:             '',
    treatments:        [] as Omit<TreatmentEntry, '_key'>[],
  });

  const syncTreatments = useCallback((next: TreatmentEntry[]) => {
    setTreatments(next);
    setData('treatments', next.map(({ _key, ...rest }) => rest));
  }, [setData]);

  const addTreatmentRow = useCallback(() => {
    syncTreatments([...treatments, {
      _key: ++_keyCounter,
      medication_type_id: meds[0]?.id ?? '',
      treated_on: today(),
      dose_amount: '',
      dose_unit: 'ml',
      route: 'IM',
      cost: '',
    }]);
  }, [treatments, meds, syncTreatments]);

  const updateTreatment = useCallback((i: number, field: keyof Omit<TreatmentEntry, '_key'>, val: string) => {
    const next = [...treatments];
    next[i] = { ...next[i], [field]: val };
    syncTreatments(next);
  }, [treatments, syncTreatments]);

  const removeTreatment = useCallback((i: number) => {
    syncTreatments(treatments.filter((_, idx) => idx !== i));
  }, [treatments, syncTreatments]);

  const selectedDisease = diseases.find(d => d.id === data.disease_type_id);

  const fetchRecommendations = useCallback(async () => {
    if (!selectedDisease) return;
    setAiLoading(true);
    setAiError(null);
    setAiRec(null);

    const signs = selectedDisease.common_signs
      ? selectedDisease.common_signs.split(',').map((s: string) => s.trim()).filter(Boolean)
      : ['General observation'];

    try {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const csrf = csrfMeta ? (csrfMeta as HTMLMetaElement).content : '';

      const res = await fetch('/api/health/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, 'Accept': 'application/json' },
        body: JSON.stringify({
          condition:            selectedDisease.name,
          selected_signs:       signs,
          severity:             data.severity.charAt(0).toUpperCase() + data.severity.slice(1),
          additional_symptoms:  data.symptoms || undefined,
          available_medicines:  meds.map(m => ({
            name:                   m.name,
            category:               m.category,
            withdrawal_period_days: m.withdrawal_period_days,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Unknown error');
      setAiRec(json);
    } catch (err: any) {
      setAiError(err.message ?? 'Could not load recommendations. Please try again.');
    } finally {
      setAiLoading(false);
    }
  }, [selectedDisease, data.severity, data.symptoms]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/health');
  };

  return (
    <AppLayout title="Report Health Event" showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button onClick={() => router.visit('/health')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">Report Health Event</h1>
            <p className="text-primary-300 text-xs">Record illness, injury, or observation</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="px-4 py-4 space-y-5">

          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-red-700 mb-1">Please fix the following:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {Object.values(errors).map((msg, i) => (
                  <li key={i} className="text-xs text-red-600">{msg}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Animal */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Animal <span className="text-red-500">*</span></label>
            <select value={data.animal_id} onChange={e => setData('animal_id', e.target.value)} required
              className={clsx('h-12 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600',
                errors.animal_id ? 'border-red-500 bg-red-50' : 'border-gray-300')}>
              <option value="">Select animal...</option>
              {animals.map(a => <option key={a.id} value={a.id}>{a.name ?? a.tag_number} ({a.tag_number})</option>)}
            </select>
            {errors.animal_id && <p className="text-xs text-red-600 mt-1">{errors.animal_id}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Date Observed <span className="text-red-500">*</span></label>
            <input type="date" value={data.observed_on} max={today()} onChange={e => setData('observed_on', e.target.value)}
              className={clsx('h-12 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600',
                errors.observed_on ? 'border-red-500 bg-red-50' : 'border-gray-300')} />
            {errors.observed_on && <p className="text-xs text-red-600 mt-1">{errors.observed_on}</p>}
          </div>

          {/* Disease type */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Diagnosis / Condition</label>
            <select value={data.disease_type_id} onChange={e => setData('disease_type_id', e.target.value)}
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600">
              <option value="">Select condition (optional)...</option>
              {diseases.map(d => <option key={d.id} value={d.id}>{d.name}{d.is_notifiable ? ' ⚠️' : ''}</option>)}
            </select>
            {selectedDisease?.common_signs && (
              <p className="text-xs text-blue-700 mt-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                💡 Common signs: {selectedDisease.common_signs}
              </p>
            )}
          </div>

          {/* Severity */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Severity <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {[
                { value: 'mild',     label: 'Mild',     color: 'text-blue-700 bg-blue-50 border-blue-300' },
                { value: 'moderate', label: 'Moderate', color: 'text-amber-700 bg-amber-50 border-amber-300' },
                { value: 'severe',   label: 'Severe',   color: 'text-red-700 bg-red-50 border-red-300' },
              ].map(s => (
                <button key={s.value} type="button" onClick={() => setData('severity', s.value)}
                  className={clsx('flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all',
                    data.severity === s.value ? s.color + ' ring-2 ring-offset-1 ring-primary-600' : 'bg-white text-gray-500 border-gray-200')}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI Recommendations */}
          {selectedDisease && (
            <div>
              <button type="button" onClick={fetchRecommendations} disabled={aiLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary-700 text-primary-900 text-sm font-semibold bg-primary-50 hover:bg-primary-100 active:bg-primary-200 disabled:opacity-60 transition-colors">
                {aiLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Getting recommendations...</>
                  : <><Stethoscope className="h-4 w-4" /> Get AI Treatment Recommendations</>}
              </button>

              {aiError && (
                <p className="text-xs text-red-600 mt-2 text-center">{aiError}</p>
              )}

              {aiRec && (
                <div className="mt-3 rounded-xl border overflow-hidden">
                  {/* Urgency header */}
                  <div className={clsx('px-4 py-2.5 flex items-center gap-2',
                    aiRec.urgency.startsWith('URGENT') ? 'bg-red-600' :
                    aiRec.urgency === 'Call Vet'       ? 'bg-amber-500' :
                    aiRec.urgency === 'Monitor'        ? 'bg-blue-500' : 'bg-green-600')}>
                    {aiRec.urgency.startsWith('URGENT')
                      ? <AlertTriangle className="h-4 w-4 text-white flex-shrink-0" />
                      : <CheckCircle className="h-4 w-4 text-white flex-shrink-0" />}
                    <span className="text-white text-xs font-bold flex-1">{aiRec.urgency}</span>
                    {/* Language toggle */}
                    <div className="flex rounded-lg overflow-hidden border border-white/30">
                      <button type="button" onClick={() => setAiLang('en')}
                        className={clsx('px-2.5 py-1 text-[11px] font-bold transition-colors',
                          aiLang === 'en' ? 'bg-white text-gray-800' : 'text-white/80 hover:text-white')}>
                        EN
                      </button>
                      <button type="button" onClick={() => setAiLang('sw')}
                        className={clsx('px-2.5 py-1 text-[11px] font-bold transition-colors',
                          aiLang === 'sw' ? 'bg-white text-gray-800' : 'text-white/80 hover:text-white')}>
                        SW
                      </button>
                    </div>
                  </div>

                  <div className="bg-white px-4 py-3 space-y-3">
                    {/* Summary */}
                    <p className="text-sm text-gray-700">
                      {aiLang === 'sw' ? (aiRec.summary_sw || aiRec.summary) : aiRec.summary}
                    </p>

                    {/* Medicines */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        {aiLang === 'sw' ? 'Dawa Zinazopendekezwa' : 'Recommended Medicines'}
                      </p>
                      <div className="space-y-1.5">
                        {aiRec.recommended_medicines.map((m, i) => (
                          <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                            <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0',
                              m.type === 'Treatment'   ? 'bg-blue-100 text-blue-700' :
                              m.type === 'Diagnostic'  ? 'bg-purple-100 text-purple-700' :
                              m.type === 'Prevention'  ? 'bg-green-100 text-green-700' :
                                                         'bg-gray-100 text-gray-600')}>
                              {m.type}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{m.name}</p>
                              <p className="text-xs text-gray-500">
                                {aiLang === 'sw' ? (m.note_sw || m.note) : m.note}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tips */}
                    {aiRec.management_tips.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          {aiLang === 'sw' ? 'Vidokezo vya Usimamizi' : 'Management Tips'}
                        </p>
                        <ul className="space-y-1">
                          {(aiLang === 'sw' ? (aiRec.management_tips_sw ?? aiRec.management_tips) : aiRec.management_tips).map((tip, i) => (
                            <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                              <span className="text-primary-700 mt-0.5">•</span> {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Disclaimer */}
                    <p className="text-[10px] text-gray-400 italic border-t pt-2">
                      {aiLang === 'sw' ? (aiRec.disclaimer_sw || aiRec.disclaimer) : aiRec.disclaimer}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Symptoms */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Symptoms Observed</label>
            <textarea value={data.symptoms} onChange={e => setData('symptoms', e.target.value)} rows={3}
              placeholder="Describe what you observed: fever, nasal discharge, off-feed, swollen quarter..."
              className={clsx('w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none',
                errors.symptoms ? 'border-red-500 bg-red-50' : 'border-gray-300')} />
            {errors.symptoms && <p className="text-xs text-red-600 mt-1">{errors.symptoms}</p>}
          </div>

          {/* Vet */}
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <button type="button" onClick={() => setData('vet_consulted', !data.vet_consulted)}
              className={clsx('h-6 w-11 rounded-full transition-all relative flex-shrink-0', data.vet_consulted ? 'bg-primary-900' : 'bg-gray-300')}>
              <span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', data.vet_consulted ? 'left-[22px]' : 'left-0.5')} />
            </button>
            <span className="text-sm font-medium text-gray-700">Vet Consulted</span>
          </div>

          {data.vet_consulted && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input label="Vet Name" placeholder="Dr. Otieno" value={data.vet_name} onChange={e => setData('vet_name', e.target.value)} />
                {errors.vet_name && <p className="text-xs text-red-600 mt-1">{errors.vet_name}</p>}
              </div>
              <div>
                <Input label="Consultation Cost" type="number" min="0" inputMode="decimal" placeholder="500" unit="KES"
                  value={data.consultation_cost} onChange={e => setData('consultation_cost', e.target.value)} />
                {errors.consultation_cost && <p className="text-xs text-red-600 mt-1">{errors.consultation_cost}</p>}
              </div>
            </div>
          )}

          {/* Treatments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Treatments Given</label>
              <button type="button" onClick={addTreatmentRow}
                className="flex items-center gap-1 text-xs text-primary-900 font-medium">
                <Plus className="h-3 w-3" /> Add Drug
              </button>
            </div>

            {treatments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">No treatments recorded. Tap "Add Drug" if medication was given.</p>
            ) : (
              <div className="space-y-3">
                {treatments.map((t, i) => {
                  const med = meds.find(m => m.id === t.medication_type_id);
                  const withdrawalDays = med?.withdrawal_period_days ?? 0;
                  return (
                  <div key={t._key} className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-purple-800">Treatment {i + 1}</p>
                      <button type="button" onClick={() => removeTreatment(i)}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                    <select value={t.medication_type_id} onChange={e => updateTreatment(i, 'medication_type_id', e.target.value)}
                      className="h-10 w-full rounded-lg border border-purple-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                      {meds.map(m => <option key={m.id} value={m.id}>{m.name} (WD: {m.withdrawal_period_days}d)</option>)}
                    </select>
                    <div className="mb-1">
                      <label className="text-[10px] text-purple-700">Date Treated</label>
                      <input type="date" value={t.treated_on} max={today()}
                        onChange={e => updateTreatment(i, 'treated_on', e.target.value)}
                        className="h-9 w-full rounded-lg border border-purple-300 bg-white px-2 text-xs focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-purple-700">Dose</label>
                        <input type="number" min="0.001" step="0.1" placeholder="5" value={t.dose_amount}
                          onChange={e => updateTreatment(i, 'dose_amount', e.target.value)}
                          className="h-9 w-full rounded-lg border border-purple-300 bg-white px-2 text-xs focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-purple-700">Unit</label>
                        <select value={t.dose_unit} onChange={e => updateTreatment(i, 'dose_unit', e.target.value)}
                          className="h-9 w-full rounded-lg border border-purple-300 bg-white px-2 text-xs focus:outline-none">
                          <option value="ml">ml</option>
                          <option value="tablet">tablet</option>
                          <option value="g">g</option>
                          <option value="tube">tube</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-purple-700">Route</label>
                        <select value={t.route} onChange={e => updateTreatment(i, 'route', e.target.value)}
                          className="h-9 w-full rounded-lg border border-purple-300 bg-white px-2 text-xs focus:outline-none">
                          <option value="IM">IM</option>
                          <option value="SC">SC</option>
                          <option value="IV">IV</option>
                          <option value="oral">Oral</option>
                          <option value="topical">Topical</option>
                          <option value="IMM">Intramammary</option>
                        </select>
                      </div>
                    </div>
                    {withdrawalDays > 0 && (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg px-3 py-2">
                        <span className="text-base leading-none">⚠️</span>
                        <p className="text-xs text-red-700 font-semibold">
                          Milk withdrawal: {withdrawalDays} days — milk will be auto-flagged
                        </p>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={2}
              placeholder="Any additional observations..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none" />
          </div>

          <Button type="submit" fullWidth size="lg" loading={processing} leftIcon={<Heart className="h-5 w-5" />}>
            Record Health Event
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

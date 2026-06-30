<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use App\Models\Animal;
use App\Models\CalfFeedLog;
use App\Models\CalfHealthEvent;
use App\Models\CalfPractice;
use App\Models\CalfRecord;
use App\Models\CalfVaccination;
use App\Models\CalfWeightLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CalfManagementController extends Controller
{
    // ── Index ──────────────────────────────────────────────────────────────────

    public function index(): Response
    {
        $farmId = app('current.farm.id');

        $calves = CalfRecord::where('farm_id', $farmId)
            ->with(['animal:id,tag_number,name,breed,sex', 'vaccinations', 'weightLogs', 'healthEvents'])
            ->get()
            ->filter(fn ($c) => $c->is_active_calf)
            ->map(fn ($c) => $this->summariseCalf($c))
            ->values();

        $totalCalves    = $calves->count();
        $preWeaningCount = $calves->filter(fn ($c) => in_array($c['phase'], ['colostrum','early_milk','pre_weaning']))->count();
        $alertCount     = $calves->sum('alert_count');

        $criticalAlerts = $calves
            ->filter(fn ($c) => collect($c['alerts'])->contains('severity', 'critical'))
            ->map(fn ($c) => $c['alerts'])
            ->flatten(1)
            ->filter(fn ($a) => $a['severity'] === 'critical')
            ->values();

        $registeredAnimalIds = CalfRecord::where('farm_id', $farmId)->pluck('animal_id');
        $oldestCalfDob = now()->subMonths(12)->toDateString();

        $availableAnimals = Animal::where('farm_id', $farmId)
            ->whereNotIn('id', $registeredAnimalIds)
            ->where(function ($query) use ($oldestCalfDob) {
                $query->whereNull('birth_date')
                    ->orWhereDate('birth_date', '>=', $oldestCalfDob);
            })
            ->orderBy('name')
            ->get(['id', 'name', 'tag_number', 'breed', 'sex', 'birth_date', 'weight_kg', 'dam_id'])
            ->map(fn ($a) => [
                'id'           => $a->id,
                'label'        => trim(($a->name ?? $a->tag_number) . ($a->name ? ' (' . $a->tag_number . ')' : '')),
                'sex'          => $a->sex ?? 'Female',
                'breed'        => $a->breed ?? '',
                'birth_date'   => $a->birth_date?->toDateString(),
                'weight_kg'    => $a->weight_kg,
                'dam_id'       => $a->dam_id,
            ]);

        return Inertia::render('CalfManagement/Index', [
            'calves'            => $calves,
            'total_calves'      => $totalCalves,
            'pre_weaning_count' => $preWeaningCount,
            'alert_count'       => $alertCount,
            'critical_alerts'   => $criticalAlerts,
            'available_animals' => $availableAnimals,
        ]);
    }

    // ── Show ───────────────────────────────────────────────────────────────────

    public function show(string $calf): Response
    {
        $farmId = app('current.farm.id');
        $calfRecord = $this->findCalf($calf, $farmId);

        $calfRecord->load([
            'animal:id,tag_number,name,breed,sex,dam_id',
            'feedLogs',
            'weightLogs',
            'vaccinations',
            'healthEvents',
            'practices',
        ]);

        return Inertia::render('CalfManagement/Show', [
            'calf'                => $this->formatCalfDetail($calfRecord),
            'disease_reference'   => $this->diseaseReference(),
            'feeding_schedule'    => $this->feedingScheduleForPhase($calfRecord),
        ]);
    }

    // ── Store (register new calf) ──────────────────────────────────────────────

    public function store(Request $request): RedirectResponse
    {
        $oldestCalfDob = now()->subMonths(12)->toDateString();

        $request->validate([
            'animal_id'       => ['required', 'uuid'],
            'dob'             => ['required', 'date', 'before_or_equal:today', "after_or_equal:{$oldestCalfDob}"],
            'birth_weight_kg' => ['nullable', 'numeric', 'min:5', 'max:100'],
            'dam_animal_id'   => ['nullable', 'string', 'max:80'],
            'sex'             => ['nullable', 'in:Female,Male'],
            'housing_notes'   => ['nullable', 'string', 'max:2000'],
        ]);

        $farmId = app('current.farm.id');

        // Verify animal belongs to farm
        $animal = Animal::withoutGlobalScopes()
            ->where('id', $request->animal_id)
            ->where('farm_id', $farmId)
            ->firstOrFail();

        $calf = CalfRecord::create([
            'farm_id'         => $farmId,
            'animal_id'       => $animal->id,
            'dob'             => $request->dob,
            'birth_weight_kg' => $request->birth_weight_kg,
            'dam_animal_id'   => $request->dam_animal_id,
            'sex'             => $request->sex ?? 'Female',
            'housing_notes'   => $request->housing_notes,
        ]);

        $animalLabel = $animal->name ?? $animal->tag_number;
        return redirect("/calf-management/{$calf->id}")
            ->with('success', "Calf {$animalLabel} registered successfully.");
    }

    // ── Feed Logs ──────────────────────────────────────────────────────────────

    public function storeFeedLog(Request $request, string $calf): RedirectResponse
    {
        $request->validate([
            'log_date'     => ['required', 'date', 'before_or_equal:today'],
            'milk_litres'  => ['required', 'numeric', 'min:0', 'max:20'],
            'starter_kg'   => ['required', 'numeric', 'min:0', 'max:10'],
            'legends_grams'=> ['required', 'numeric', 'min:0', 'max:200'],
            'feed_type'    => ['nullable', 'string', 'max:80'],
            'notes'        => ['nullable', 'string', 'max:500'],
        ]);

        $record = $this->findCalf($calf, app('current.farm.id'));

        CalfFeedLog::create([
            'calf_record_id' => $record->id,
            'log_date'       => $request->log_date,
            'milk_litres'    => $request->milk_litres,
            'starter_kg'     => $request->starter_kg,
            'legends_grams'  => $request->legends_grams,
            'feed_type'      => $request->feed_type,
            'notes'          => $request->notes,
        ]);

        return back()->with('success', 'Feed log saved.');
    }

    // ── Weight Logs ────────────────────────────────────────────────────────────

    public function storeWeightLog(Request $request, string $calf): RedirectResponse
    {
        $request->validate([
            'weighed_date' => ['required', 'date', 'before_or_equal:today'],
            'weight_kg'    => ['required', 'numeric', 'min:5', 'max:500'],
            'notes'        => ['nullable', 'string', 'max:500'],
        ]);

        $record = $this->findCalf($calf, app('current.farm.id'));

        CalfWeightLog::create([
            'calf_record_id' => $record->id,
            'weighed_date'   => $request->weighed_date,
            'weight_kg'      => $request->weight_kg,
            'notes'          => $request->notes,
        ]);

        // Also update animal.weight_kg
        $record->animal()->update(['weight_kg' => $request->weight_kg]);

        return back()->with('success', 'Weight recorded.');
    }

    // ── Vaccinations ───────────────────────────────────────────────────────────

    public function markVaccinationDone(Request $request, string $calf, string $vaccination): RedirectResponse
    {
        $request->validate([
            'completed_date'   => ['required', 'date', 'before_or_equal:today'],
            'administered_by'  => ['nullable', 'string', 'max:120'],
            'notes'            => ['nullable', 'string', 'max:500'],
        ]);

        $record = $this->findCalf($calf, app('current.farm.id'));

        CalfVaccination::where('id', $vaccination)
            ->where('calf_record_id', $record->id)
            ->update([
                'completed_date'  => $request->completed_date,
                'administered_by' => $request->administered_by,
                'notes'           => $request->notes,
            ]);

        // Resolve any pending alert for this vaccination
        Alert::withoutGlobalScopes()
            ->where('reference_table', 'calf_records')
            ->whereIn('reference_id', ["calf_vax_overdue_{$vaccination}", "calf_vax_soon_{$vaccination}"])
            ->where('status', 'pending')
            ->update(['status' => 'resolved', 'auto_resolved' => true]);

        return back()->with('success', 'Vaccination marked complete.');
    }

    // ── Health Events ──────────────────────────────────────────────────────────

    public function storeHealthEvent(Request $request, string $calf): RedirectResponse
    {
        $request->validate([
            'event_date'   => ['required', 'date', 'before_or_equal:today'],
            'disease_name' => ['required', 'string', 'max:120'],
            'symptoms'     => ['nullable', 'array'],
            'severity'     => ['required', 'in:mild,moderate,severe'],
            'action_taken' => ['nullable', 'string', 'max:1000'],
            'vet_called'   => ['nullable', 'boolean'],
            'notes'        => ['nullable', 'string', 'max:1000'],
        ]);

        $farmId = app('current.farm.id');
        $record = $this->findCalf($calf, $farmId);

        $event = CalfHealthEvent::create([
            'calf_record_id' => $record->id,
            'event_date'     => $request->event_date,
            'disease_name'   => $request->disease_name,
            'symptoms'       => $request->symptoms ?? [],
            'severity'       => $request->severity,
            'action_taken'   => $request->action_taken,
            'vet_called'     => $request->boolean('vet_called'),
            'notes'          => $request->notes,
        ]);

        // Push critical alert for severe events
        if ($request->severity === 'severe') {
            $animalName = $record->animal?->name ?? $record->animal?->tag_number ?? $record->animal_id;
            Alert::withoutGlobalScopes()->create([
                'farm_id'         => $farmId,
                'alert_type'      => 'calf_health',
                'severity'        => 'critical',
                'status'          => 'pending',
                'title'           => "Severe health event: {$request->disease_name}",
                'message'         => "Severe health event: {$request->disease_name} — {$animalName}",
                'reference_table' => 'calf_records',
                'reference_id'    => $event->id,
                'animal_id'       => $record->animal_id,
                'due_on'          => now()->toDateString(),
            ]);
        }

        return back()->with('success', 'Health event logged.');
    }

    public function resolveHealthEvent(Request $request, string $calf, string $event): RedirectResponse
    {
        $request->validate([
            'resolved_on' => ['required', 'date', 'before_or_equal:today'],
            'outcome'     => ['required', 'in:recovered,monitoring,referred,died'],
        ]);

        $farmId = app('current.farm.id');
        $record = $this->findCalf($calf, $farmId);

        $healthEvent = CalfHealthEvent::where('id', $event)
            ->where('calf_record_id', $record->id)
            ->firstOrFail();

        $healthEvent->update([
            'is_resolved' => true,
            'resolved_on' => $request->resolved_on,
            'outcome'     => $request->outcome,
        ]);

        Alert::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('reference_table', 'calf_records')
            ->where('reference_id', $healthEvent->id)
            ->where('status', 'pending')
            ->update(['status' => 'resolved', 'auto_resolved' => true, 'resolved_at' => now()]);

        return back()->with('success', 'Calf health event resolved.');
    }

    // ── Practices ──────────────────────────────────────────────────────────────

    public function markPracticeDone(Request $request, string $calf, string $practice): RedirectResponse
    {
        $request->validate([
            'completed_date' => ['required', 'date', 'before_or_equal:today'],
            'notes'          => ['nullable', 'string', 'max:500'],
        ]);

        $record = $this->findCalf($calf, app('current.farm.id'));

        CalfPractice::where('id', $practice)
            ->where('calf_record_id', $record->id)
            ->update([
                'completed_date' => $request->completed_date,
                'notes'          => $request->notes,
            ]);

        return back()->with('success', 'Practice marked done.');
    }

    // ── Housing ────────────────────────────────────────────────────────────────

    public function updateHousing(Request $request, string $calf): RedirectResponse
    {
        $request->validate([
            'housing_notes' => ['required', 'string', 'max:3000'],
        ]);

        $record = $this->findCalf($calf, app('current.farm.id'));
        $record->update(['housing_notes' => $request->housing_notes]);

        return back()->with('success', 'Housing notes saved.');
    }

    // ─── Private Helpers ───────────────────────────────────────────────────────

    private function findCalf(string $id, string $farmId): CalfRecord
    {
        $record = CalfRecord::where('id', $id)->where('farm_id', $farmId)->first();
        abort_unless($record, 403);
        return $record;
    }

    private function summariseCalf(CalfRecord $calf): array
    {
        $alerts  = $this->buildAlerts($calf);
        $animal  = $calf->animal;

        return [
            'id'          => $calf->id,
            'animal_id'   => $calf->animal_id,
            'name'        => $animal?->name ?? $animal?->tag_number ?? $calf->animal_id,
            'tag_number'  => $animal?->tag_number ?? '—',
            'breed'       => $animal?->breed ?? '—',
            'sex'         => $calf->sex,
            'dam'         => $calf->dam_animal_id,
            'dob'         => $calf->dob->toDateString(),
            'age_days'    => $calf->age_in_days,
            'age_months'  => $calf->age_in_months,
            'age_label'   => $this->ageLabel($calf),
            'phase'       => $calf->phase,
            'alert_count' => count($alerts),
            'alerts'      => $alerts,
        ];
    }

    private function formatCalfDetail(CalfRecord $calf): array
    {
        $summary = $this->summariseCalf($calf);
        $animal  = $calf->animal;

        $weightLogs = $calf->weightLogs->map(fn ($w) => [
            'id'           => $w->id,
            'weighed_date' => $w->weighed_date->toDateString(),
            'weight_kg'    => $w->weight_kg,
            'notes'        => $w->notes,
        ])->values();

        $latestWeight = $calf->weightLogs->last()?->weight_kg;

        return array_merge($summary, [
            'birth_weight_kg'        => $calf->birth_weight_kg,
            'housing_notes'          => $calf->housing_notes,
            'average_daily_gain'     => $calf->average_daily_gain,
            'recommended_milk'       => $calf->recommended_milk_litres,
            'recommended_starter'    => $calf->recommended_starter_kg,
            'recommended_legends_g'  => $calf->recommended_legends_grams,
            'current_weight_kg'      => $latestWeight,
            'feed_logs'              => $calf->feedLogs->take(7)->map(fn ($f) => [
                'id'            => $f->id,
                'log_date'      => $f->log_date->toDateString(),
                'milk_litres'   => $f->milk_litres,
                'starter_kg'    => $f->starter_kg,
                'legends_grams' => $f->legends_grams,
                'feed_type'     => $f->feed_type,
                'notes'         => $f->notes,
            ])->values(),
            'weight_logs'            => $weightLogs,
            'vaccinations'           => $calf->vaccinations->map(fn ($v) => [
                'id'              => $v->id,
                'vaccine_name'    => $v->vaccine_name,
                'due_date'        => $v->due_date->toDateString(),
                'completed_date'  => $v->completed_date?->toDateString(),
                'administered_by' => $v->administered_by,
                'notes'           => $v->notes,
                'is_overdue'      => $v->is_overdue,
                'is_due_soon'     => $v->is_due_soon,
            ])->values(),
            'health_events'          => $calf->healthEvents->map(fn ($h) => [
                'id'           => $h->id,
                'event_date'   => $h->event_date->toDateString(),
                'disease_name' => $h->disease_name,
                'symptoms'     => $h->symptoms,
                'severity'     => $h->severity,
                'action_taken' => $h->action_taken,
                'vet_called'   => $h->vet_called,
                'is_resolved'  => $h->is_resolved,
                'resolved_on'  => $h->resolved_on?->toDateString(),
                'outcome'      => $h->outcome,
                'notes'        => $h->notes,
            ])->values(),
            'practices'              => $calf->practices->map(fn ($p) => [
                'id'             => $p->id,
                'practice_name'  => $p->practice_name,
                'due_age_label'  => $p->due_age_label,
                'completed_date' => $p->completed_date?->toDateString(),
                'notes'          => $p->notes,
            ])->values(),
        ]);
    }

    private function buildAlerts(CalfRecord $calf): array
    {
        $alerts = [];

        // Overdue vaccinations
        foreach ($calf->vaccinations as $vax) {
            if ($vax->completed_date) continue;
            if ($vax->is_overdue) {
                $alerts[] = ['severity' => 'critical', 'message' => "Vaccination overdue: {$vax->vaccine_name}"];
            } elseif ($vax->is_due_soon) {
                $alerts[] = ['severity' => 'warning', 'message' => "Vaccination due soon: {$vax->vaccine_name}"];
            }
        }

        // Low ADG
        $adg = $calf->average_daily_gain;
        if ($adg !== null && $adg < 500) {
            $alerts[] = ['severity' => 'warning', 'message' => "Low daily gain: {$adg}g/day (target ≥500g)"];
        }

        // Age 6 months supplement transition
        if ($calf->age_in_months === 6) {
            $alerts[] = ['severity' => 'info', 'message' => 'Switch to Maclik Plus — CKL Legends phase ends at 6 months'];
        }

        // Severe health event
        foreach ($calf->healthEvents as $event) {
            if ($event->severity === 'severe' && ! $event->is_resolved) {
                $alerts[] = ['severity' => 'critical', 'message' => "Severe health event logged: {$event->disease_name}"];
                break;
            }
        }

        return $alerts;
    }

    private function ageLabel(CalfRecord $calf): string
    {
        $days   = $calf->age_in_days;
        $months = $calf->age_in_months;

        if ($days < 7)  return "{$days}d old";
        if ($months < 1) return round($days / 7) . 'w old';
        return "{$months}mo old";
    }

    private function feedingScheduleForPhase(CalfRecord $calf): array
    {
        $days = $calf->age_in_days;

        $schedule = [
            ['phase' => 'Day 1–3 (Colostrum)',     'days' => [0, 3],    'milk' => '2–4L colostrum (10–12% BW)', 'starter' => '—',         'legends' => '—'],
            ['phase' => 'Week 1',                   'days' => [4, 7],    'milk' => '5–6L',                       'starter' => '0.25 kg',   'legends' => '50g (2.5 tbsp)'],
            ['phase' => 'Week 2',                   'days' => [8, 14],   'milk' => '5–6L',                       'starter' => '0.5 kg',    'legends' => '60g (3 tbsp)'],
            ['phase' => 'Week 3',                   'days' => [15, 21],  'milk' => '5–6L',                       'starter' => '0.75 kg',   'legends' => '60g'],
            ['phase' => 'Week 4',                   'days' => [22, 28],  'milk' => '5–6L',                       'starter' => '1.0 kg',    'legends' => '70g (3.5 tbsp)'],
            ['phase' => 'Weeks 5–7',                'days' => [29, 49],  'milk' => '3–4L reducing',              'starter' => '1.5 kg',    'legends' => '70g'],
            ['phase' => 'Weeks 8–9 (Weaning)',      'days' => [50, 63],  'milk' => '0L (wean)',                  'starter' => '2.0 kg',    'legends' => '80g (4 tbsp)'],
            ['phase' => '3–6 months',               'days' => [64, 180], 'milk' => '—',                          'starter' => '1.5 kg mix','legends' => '80–90g'],
            ['phase' => '6–12 months',              'days' => [181, 365],'milk' => '—',                          'starter' => 'Pasture + minerals','legends' => 'Maclik Plus 100g'],
        ];

        $current = null;
        foreach ($schedule as $row) {
            if ($days >= $row['days'][0] && $days <= $row['days'][1]) {
                $current = $row;
                break;
            }
        }

        return [
            'all'     => array_map(fn ($r) => array_diff_key($r, ['days' => 1]), $schedule),
            'current' => $current ? array_diff_key($current, ['days' => 1]) : null,
        ];
    }

    private function diseaseReference(): array
    {
        return [
            [
                'name'       => 'Scours (Diarrhoea)',
                'risk_age'   => '< 1 month',
                'signs'      => ['Watery or bloody diarrhoea', 'Weakness', 'Dehydration', 'Loss of appetite'],
                'treatment'  => 'ORS/electrolytes, isolate calf, call vet if severe or blood in stool',
                'products'   => [
                    ['name' => 'Kamboost', 'supplier' => 'Atlantis', 'vet_rx' => false],
                    ['name' => 'CKL Stop Bloat', 'supplier' => 'CKL', 'vet_rx' => false],
                    ['name' => 'Kupacide', 'supplier' => 'CKL', 'vet_rx' => false],
                ],
            ],
            [
                'name'       => 'Pneumonia',
                'risk_age'   => '1–6 months',
                'signs'      => ['Nasal discharge', 'Cough', 'Rapid breathing', 'Fever', 'Lethargy'],
                'treatment'  => 'Vet antibiotics + anti-inflammatories; isolate; improve ventilation',
                'products'   => [
                    ['name' => 'Agrymicin', 'supplier' => 'Atlantis', 'vet_rx' => true],
                    ['name' => 'Spirovet', 'supplier' => 'Atlantis', 'vet_rx' => true],
                    ['name' => 'Marbox', 'supplier' => 'Atlantis', 'vet_rx' => true],
                    ['name' => 'CKL Xtra Legends', 'supplier' => 'CKL', 'vet_rx' => false],
                ],
            ],
            [
                'name'       => 'Navel Ill',
                'risk_age'   => 'Newborn',
                'signs'      => ['Swollen/wet navel', 'Pain at navel', 'Fever', 'Reluctance to move'],
                'treatment'  => 'Iodine dip at birth (prevention); vet antibiotics if infected',
                'products'   => [
                    ['name' => 'Agrymicin', 'supplier' => 'Atlantis', 'vet_rx' => true],
                    ['name' => 'Kupacide (iodine)', 'supplier' => 'CKL', 'vet_rx' => false],
                ],
            ],
            [
                'name'       => 'Joint Ill (Polyarthritis)',
                'risk_age'   => '0–2 months',
                'signs'      => ['Swollen joints', 'Lameness', 'Fever', 'Reluctance to stand'],
                'treatment'  => 'Call vet immediately; antibiotics + anti-inflammatories',
                'products'   => [
                    ['name' => 'Agrymicin', 'supplier' => 'Atlantis', 'vet_rx' => true],
                    ['name' => 'Marbox', 'supplier' => 'Atlantis', 'vet_rx' => true],
                    ['name' => 'Metaphos', 'supplier' => 'Atlantis', 'vet_rx' => true],
                ],
            ],
            [
                'name'       => 'ECF / Theileriosis',
                'risk_age'   => '1 month+',
                'signs'      => ['High fever (>40°C)', 'Swollen lymph nodes', 'Watery eyes', 'Rapid weight loss'],
                'treatment'  => 'Butalex 1ml/20kg IM — certified provider only. Call vet immediately.',
                'products'   => [
                    ['name' => 'Butalex', 'supplier' => 'CKL', 'vet_rx' => true],
                ],
            ],
            [
                'name'       => 'Clostridial Diseases (BQ/Anthrax)',
                'risk_age'   => 'Any age',
                'signs'      => ['Sudden death', 'Swelling in limbs', 'High fever', 'Staggering'],
                'treatment'  => 'Prevention only — no treatment once symptomatic. Vaccinate with Blanthax.',
                'products'   => [
                    ['name' => 'Blanthax Vaccine', 'supplier' => 'CKL', 'vet_rx' => false],
                ],
            ],
            [
                'name'       => 'Ticks & External Parasites',
                'risk_age'   => 'Grazing age',
                'signs'      => ['Visible ticks', 'Scratching', 'Skin irritation', 'Anaemia'],
                'treatment'  => 'Spray/dip regularly; check ears and tail folds',
                'products'   => [
                    ['name' => 'Pyrotix', 'supplier' => 'Atlantis', 'vet_rx' => false],
                    ['name' => 'Butox Spot On', 'supplier' => 'CKL', 'vet_rx' => false],
                ],
            ],
            [
                'name'       => 'Worms (Internal Parasites)',
                'risk_age'   => 'Grazing age',
                'signs'      => ['Poor growth', 'Bottle jaw', 'Diarrhoea', 'Rough coat', 'Anaemia'],
                'treatment'  => 'Deworm every 3 months when grazing starts; rotate dewormers',
                'products'   => [
                    ['name' => 'Nemarid Super', 'supplier' => 'Atlantis', 'vet_rx' => false],
                    ['name' => 'Nemarid Cobalt', 'supplier' => 'Atlantis', 'vet_rx' => false],
                    ['name' => 'Multicure 2.5%', 'supplier' => 'Atlantis', 'vet_rx' => false],
                    ['name' => 'Eradifluke', 'supplier' => 'Atlantis', 'vet_rx' => false],
                ],
            ],
        ];
    }
}

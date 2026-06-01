<?php

namespace App\Http\Controllers;

use App\Models\Animal;
use App\Models\DewormingRecord;
use App\Models\DiseaseType;
use App\Models\HealthEvent;
use App\Models\MedicationType;
use App\Models\Treatment;
use App\Models\Vaccination;
use App\Models\VaccineType;
use App\Services\HealthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HealthController extends Controller
{
    public function __construct(private readonly HealthService $service) {}

    // ─── Health Index ─────────────────────────────────────────────────────────

    public function index(): Response
    {
        $farmId = app('current.farm.id');
        $kpis   = $this->service->getHealthKPIs($farmId);

        $openCases = HealthEvent::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('is_recovered', false)
            ->with(['animal:id,tag_number,name,breed', 'diseaseType:id,name', 'treatments'])
            ->orderByDesc('observed_on')
            ->get();

        $recentEvents = HealthEvent::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('observed_on', '>=', now()->subDays(30)->toDateString())
            ->with(['animal:id,tag_number,name', 'diseaseType:id,name'])
            ->orderByDesc('observed_on')
            ->limit(20)
            ->get();

        $onWithdrawal = Treatment::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('withdrawal_end_date', '>=', now()->toDateString())
            ->with(['animal:id,tag_number,name', 'medication:id,name,withdrawal_period_days'])
            ->orderBy('withdrawal_end_date')
            ->get();

        $vacsDue = Vaccination::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('next_due_date', '<=', now()->addDays(14)->toDateString())
            ->with(['animal:id,tag_number,name', 'vaccineType:id,name,disease_prevented'])
            ->orderBy('next_due_date')
            ->get();

        $dewormDue = DewormingRecord::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('next_due_date', '<=', now()->addDays(14)->toDateString())
            ->with('animal:id,tag_number,name')
            ->orderBy('next_due_date')
            ->get();

        return Inertia::render('health/Index', compact(
            'kpis', 'openCases', 'recentEvents', 'onWithdrawal', 'vacsDue', 'dewormDue',
        ));
    }

    // ─── Health Events ────────────────────────────────────────────────────────

    public function create(Request $request): Response
    {
        $farmId    = app('current.farm.id');
        $animals   = Animal::where('farm_id', $farmId)->active()->orderBy('name')->orderBy('tag_number')
                           ->get(['id', 'tag_number', 'name', 'breed', 'status']);
        $diseases  = DiseaseType::where('is_active', true)->orderBy('name')->get(['id', 'name', 'category', 'common_signs']);
        $meds      = MedicationType::where('is_active', true)->orderBy('name')
                                   ->get(['id', 'name', 'active_ingredient', 'category', 'unit_of_measure', 'withdrawal_period_days']);

        $preAnimal = $request->input('animal_id');

        return Inertia::render('health/Create', compact('animals', 'diseases', 'meds', 'preAnimal'));
    }

    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'animal_id'         => ['required', 'uuid'],
            'observed_on'       => ['required', 'date', 'before_or_equal:today'],
            'disease_type_id'   => ['nullable', 'uuid'],
            'symptoms'          => ['nullable', 'string', 'max:1000'],
            'severity'          => ['required', 'in:mild,moderate,severe'],
            'vet_consulted'     => ['boolean'],
            'vet_name'          => ['nullable', 'string', 'max:120'],
            'consultation_cost' => ['nullable', 'numeric', 'min:0'],
            'notes'             => ['nullable', 'string', 'max:1000'],
            'treatments'        => ['nullable', 'array'],
            'treatments.*.medication_type_id' => ['nullable', 'uuid'],
            'treatments.*.treated_on'         => ['required_with:treatments', 'date'],
            'treatments.*.dose_amount'         => ['required_with:treatments', 'numeric', 'min:0.001'],
            'treatments.*.dose_unit'           => ['nullable', 'string'],
            'treatments.*.route'               => ['nullable', 'string'],
            'treatments.*.cost'                => ['nullable', 'numeric', 'min:0'],
        ]);

        $farmId = app('current.farm.id');
        $this->verifyAnimal($request->animal_id, $farmId);

        $event = $this->service->recordHealthEvent([
            ...$request->only(['animal_id', 'observed_on', 'disease_type_id', 'symptoms', 'severity', 'vet_consulted', 'vet_name', 'consultation_cost', 'notes', 'treatments']),
            'farm_id' => $farmId,
        ], $request->user()->id);

        $animal = Animal::withoutGlobalScopes()->find($request->animal_id);

        if ($request->wantsJson()) {
            return response()->json(['event' => $event, 'message' => 'Health event recorded.'], 201);
        }

        return redirect()->route('health.index')
            ->with('success', "Health event recorded for {$animal->display_name}.");
    }

    public function show(HealthEvent $healthEvent): Response
    {
        abort_unless($healthEvent->farm_id === app('current.farm.id'), 403);

        $healthEvent->load(['animal', 'diseaseType', 'treatments.medication', 'reportedBy:id,name']);

        return Inertia::render('health/Show', ['event' => $healthEvent]);
    }

    public function close(Request $request, HealthEvent $healthEvent): RedirectResponse
    {
        abort_unless($healthEvent->farm_id === app('current.farm.id'), 403);
        $request->validate([
            'outcome'       => ['required', 'in:recovered,culled,died,ongoing'],
            'recovery_date' => ['nullable', 'date', 'before_or_equal:today'],
        ]);

        $this->service->closeHealthEvent(
            $healthEvent,
            $request->outcome,
            $request->recovery_date,
            $request->user()->id
        );

        return redirect()->route('health.index')->with('success', 'Health case closed.');
    }

    // ─── Vaccinations ─────────────────────────────────────────────────────────

    public function vaccinationCreate(Request $request): Response
    {
        $farmId  = app('current.farm.id');
        $animals = Animal::where('farm_id', $farmId)->active()->orderBy('name')->orderBy('tag_number')
                         ->get(['id', 'tag_number', 'name', 'breed', 'status']);
        $types   = VaccineType::where('is_active', true)->orderBy('name')
                              ->get(['id', 'name', 'disease_prevented', 'booster_interval_days']);

        return Inertia::render('health/VaccinationForm', compact('animals', 'types'));
    }

    public function vaccinationStore(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'animal_id'       => ['required', 'uuid'],
            'vaccinated_on'   => ['required', 'date', 'before_or_equal:today'],
            'vaccine_type_id' => ['nullable', 'uuid'],
            'batch_number'    => ['nullable', 'string', 'max:80'],
            'dose_ml'         => ['nullable', 'numeric', 'min:0'],
            'route'           => ['nullable', 'string'],
            'next_due_date'   => ['nullable', 'date', 'after:vaccinated_on'],
            'cost'            => ['nullable', 'numeric', 'min:0'],
            'adverse_reaction'=> ['boolean'],
            'notes'           => ['nullable', 'string', 'max:500'],
        ]);

        $farmId = app('current.farm.id');
        $this->verifyAnimal($request->animal_id, $farmId);

        $vacc   = $this->service->recordVaccination([
            ...$request->only(['animal_id', 'vaccinated_on', 'vaccine_type_id', 'batch_number', 'dose_ml', 'route', 'next_due_date', 'cost', 'adverse_reaction', 'notes']),
            'farm_id' => $farmId,
        ], $request->user()->id);

        $animal = Animal::withoutGlobalScopes()->find($request->animal_id);

        if ($request->wantsJson()) {
            return response()->json(['vaccination' => $vacc, 'message' => 'Vaccination recorded.'], 201);
        }

        return redirect()->route('health.index')
            ->with('success', "Vaccination recorded for {$animal->display_name}." . ($vacc->next_due_date ? " Next dose: {$vacc->next_due_date->format('d M Y')}." : ''));
    }

    // ─── Deworming ────────────────────────────────────────────────────────────

    public function dewormingCreate(): Response
    {
        $farmId  = app('current.farm.id');
        $animals = Animal::where('farm_id', $farmId)->active()->orderBy('name')->orderBy('tag_number')
                         ->get(['id', 'tag_number', 'name', 'breed', 'status']);

        $dewormDrugs = [
            ['name' => 'Albendazole (Valbazen)', 'ingredient' => 'Albendazole', 'withdrawal' => 14],
            ['name' => 'Fenbendazole (Panacur)',  'ingredient' => 'Fenbendazole', 'withdrawal' => 0],
            ['name' => 'Levamisole',              'ingredient' => 'Levamisole', 'withdrawal' => 7],
            ['name' => 'Ivermectin (Ivomec)',     'ingredient' => 'Ivermectin', 'withdrawal' => 28],
            ['name' => 'Triclabendazole',         'ingredient' => 'Triclabendazole', 'withdrawal' => 28],
        ];

        return Inertia::render('health/DewormingForm', compact('animals', 'dewormDrugs'));
    }

    public function dewormingStore(Request $request): RedirectResponse
    {
        $request->validate([
            'animal_ids'  => ['required', 'array', 'min:1'],
            'animal_ids.*'=> ['uuid'],
            'drug_name'   => ['required', 'string', 'max:120'],
            'dose_amount' => ['required', 'numeric', 'min:0.001'],
            'dose_unit'   => ['required', 'string'],
            'route'       => ['required', 'string'],
            'dewormed_on' => ['required', 'date', 'before_or_equal:today'],
            'cost'        => ['nullable', 'numeric', 'min:0'],
            'notes'       => ['nullable', 'string', 'max:500'],
        ]);

        $farmId  = app('current.farm.id');
        $userId  = $request->user()->id;
        $count   = 0;

        foreach ($request->animal_ids as $animalId) {
            if (!$this->verifyAnimalSilent($animalId, $farmId)) continue;

            $this->service->recordDeworming([
                ...$request->only(['drug_name', 'dose_amount', 'dose_unit', 'route', 'dewormed_on', 'cost', 'notes']),
                'farm_id'    => $farmId,
                'animal_id'  => $animalId,
            ], $userId);

            $count++;
        }

        return redirect()->route('health.index')
            ->with('success', "Deworming recorded for {$count} animal" . ($count !== 1 ? 's' : '') . ". Next due in 90 days.");
    }

    // ─── Vaccination schedule view ────────────────────────────────────────────

    public function vaccinationSchedule(): Response
    {
        $farmId  = app('current.farm.id');

        $upcoming = Vaccination::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('next_due_date', '>=', now()->toDateString())
            ->where('next_due_date', '<=', now()->addDays(60)->toDateString())
            ->with(['animal:id,tag_number,name', 'vaccineType:id,name,disease_prevented'])
            ->orderBy('next_due_date')
            ->get();

        $overdue  = Vaccination::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('next_due_date', '<', now()->toDateString())
            ->with(['animal:id,tag_number,name', 'vaccineType:id,name'])
            ->orderBy('next_due_date')
            ->get();

        $recent   = Vaccination::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('vaccinated_on', '>=', now()->subDays(30)->toDateString())
            ->with(['animal:id,tag_number,name', 'vaccineType:id,name'])
            ->orderByDesc('vaccinated_on')
            ->limit(20)
            ->get();

        return Inertia::render('health/VaccinationSchedule', compact('upcoming', 'overdue', 'recent'));
    }

    private function verifyAnimal(string $animalId, string $farmId): void
    {
        $exists = Animal::withoutGlobalScopes()
            ->where('id', $animalId)->where('farm_id', $farmId)->exists();
        abort_unless($exists, 403, 'Animal does not belong to your farm.');
    }

    private function verifyAnimalSilent(string $animalId, string $farmId): bool
    {
        return Animal::withoutGlobalScopes()
            ->where('id', $animalId)->where('farm_id', $farmId)->exists();
    }
}

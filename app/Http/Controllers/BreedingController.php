<?php

namespace App\Http\Controllers;

use App\Models\AIService;
use App\Models\Animal;
use App\Models\CalvingRecord;
use App\Models\HeatEvent;
use App\Models\PregnancyCheck;
use App\Models\SemenInventory;
use App\Models\SyncProgram;
use App\Services\BreedingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class BreedingController extends Controller
{
    public function __construct(private readonly BreedingService $service) {}

    // ─── Calendar / Index ─────────────────────────────────────────────────────

    public function index(): Response
    {
        $farmId = app('current.farm.id');

        $kpis = $this->service->getBreedingKPIs($farmId);

        // Upcoming calvings (next 30 days)
        $upcomingCalvings = AIService::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('result', 'confirmed_pregnant')
            ->where('expected_calving_date', '>=', now()->toDateString())
            ->where('expected_calving_date', '<=', now()->addDays(30)->toDateString())
            ->with('animal:id,tag_number,name,breed,parity')
            ->orderBy('expected_calving_date')
            ->get();

        // Animals due for PD check (28–90 days post-AI, result pending)
        $duePDChecks = AIService::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->dueForPregnancyCheck()
            ->with('animal:id,tag_number,name,breed')
            ->orderBy('service_date')
            ->get();

        // Recent heat events (last 21 days, not yet acted on)
        $pendingHeats = HeatEvent::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('acted_on', false)
            ->where('observed_on', '>=', now()->subDays(21)->toDateString())
            ->with('animal:id,tag_number,name')
            ->orderByDesc('observed_on')
            ->limit(5)
            ->get();

        // Active sync programs
        $activeSync = SyncProgram::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('status', 'in_progress')
            ->with(['animal:id,tag_number,name', 'steps'])
            ->orderBy('start_date')
            ->get();

        // Recent AI services (last 90 days)
        $recentServices = AIService::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('service_date', '>=', now()->subDays(90)->toDateString())
            ->with('animal:id,tag_number,name,breed')
            ->orderByDesc('service_date')
            ->limit(10)
            ->get();

        return Inertia::render('breeding/Index', compact(
            'kpis', 'upcomingCalvings', 'duePDChecks',
            'pendingHeats', 'activeSync', 'recentServices',
        ));
    }

    // ─── Heat Detection ───────────────────────────────────────────────────────

    public function createHeat(): Response
    {
        $farmId = app('current.farm.id');
        $females = Animal::where('farm_id', $farmId)
            ->whereIn('status', ['lactating', 'dry', 'heifer'])
            ->where('sex', 'female')
            ->orderBy('name')->orderBy('tag_number')
            ->get(['id', 'tag_number', 'name', 'breed', 'status']);

        return Inertia::render('breeding/HeatForm', ['animals' => $females]);
    }

    public function storeHeat(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'animal_id'       => ['required', 'uuid'],
            'observed_on'     => ['required', 'date', 'before_or_equal:today'],
            'observed_at'     => ['nullable', 'date_format:H:i'],
            'detection_method'=> ['required', 'in:visual,tail_paint,pedometer,other'],
            'confidence'      => ['required', 'in:certain,probable,suspected'],
            'signs_observed'  => ['nullable', 'array'],
            'notes'           => ['nullable', 'string', 'max:500'],
        ]);

        $farmId = app('current.farm.id');
        $this->verifyAnimalBelongsToFarm($request->animal_id, $farmId);

        $heat = $this->service->recordHeat([
            ...$request->only(['animal_id', 'observed_on', 'observed_at', 'detection_method', 'confidence', 'signs_observed', 'notes']),
            'farm_id' => $farmId,
        ], $request->user()->id);

        if ($request->wantsJson()) {
            return response()->json(['heat' => $heat->load('animal'), 'message' => 'Heat event recorded.'], 201);
        }

        return redirect()->route('breeding.index')
            ->with('success', "Heat detected for {$heat->animal->display_name}. AI window set.");
    }

    // ─── AI Services ──────────────────────────────────────────────────────────

    public function createAI(Request $request): Response
    {
        $farmId  = app('current.farm.id');
        $females = Animal::where('farm_id', $farmId)
            ->whereIn('status', ['lactating', 'dry', 'heifer'])
            ->where('sex', 'female')
            ->orderBy('name')->orderBy('tag_number')
            ->get(['id', 'tag_number', 'name', 'breed', 'status', 'is_pregnant']);

        $semen = SemenInventory::where('farm_id', $farmId)
            ->where('straws_remaining', '>', 0)
            ->orderBy('bull_name')
            ->get(['id', 'bull_name', 'bull_breed', 'batch_number', 'straws_remaining', 'cost_per_straw']);

        // Pending heats (not yet acted on)
        $pendingHeats = HeatEvent::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('acted_on', false)
            ->where('observed_on', '>=', now()->subDays(5)->toDateString())
            ->with('animal:id,tag_number,name')
            ->orderByDesc('observed_on')
            ->get();

        $preselectedAnimal = $request->input('animal_id');

        return Inertia::render('breeding/AIServiceForm', [
            'animals'           => $females,
            'semen'             => $semen,
            'pendingHeats'      => $pendingHeats,
            'preselectedAnimal' => $preselectedAnimal,
        ]);
    }

    public function storeAI(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'animal_id'         => ['required', 'uuid'],
            'service_date'      => ['required', 'date', 'before_or_equal:today'],
            'service_time'      => ['nullable', 'date_format:H:i'],
            'technician_name'   => ['nullable', 'string', 'max:120'],
            'technician_phone'  => ['nullable', 'string', 'max:20'],
            'semen_inventory_id'=> ['nullable', 'uuid'],
            'heat_event_id'     => ['nullable', 'uuid'],
            'service_cost'      => ['nullable', 'numeric', 'min:0'],
            'notes'             => ['nullable', 'string', 'max:500'],
        ]);

        $farmId = app('current.farm.id');
        $this->verifyAnimalBelongsToFarm($request->animal_id, $farmId);

        $animal = Animal::withoutGlobalScopes()->findOrFail($request->animal_id);
        abort_if($animal->is_pregnant, 422, 'This animal is already confirmed pregnant.');

        $service = $this->service->recordAIService([
            ...$request->only(['animal_id', 'service_date', 'service_time', 'technician_name', 'technician_phone', 'semen_inventory_id', 'heat_event_id', 'service_cost', 'notes']),
            'farm_id' => $farmId,
        ], $request->user()->id);

        if ($request->wantsJson()) {
            return response()->json(['service' => $service->load('animal', 'semen'), 'message' => 'AI service recorded.'], 201);
        }

        return redirect()->route('breeding.index')
            ->with('success', "AI service recorded for {$service->animal->display_name}. Expected calving: {$service->expected_calving_date?->format('d M Y')}.");
    }

    // ─── Pregnancy Checks ─────────────────────────────────────────────────────

    public function createPD(Request $request): Response
    {
        $farmId  = app('current.farm.id');
        $females = Animal::where('farm_id', $farmId)
            ->where('sex', 'female')
            ->orderBy('name')->orderBy('tag_number')
            ->get(['id', 'tag_number', 'name', 'breed', 'is_pregnant']);

        // Services due for PD check
        $pendingServices = AIService::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('result', 'pending')
            ->with('animal:id,tag_number,name,breed')
            ->orderBy('service_date')
            ->get();

        return Inertia::render('breeding/PDForm', [
            'animals'         => $females,
            'pendingServices' => $pendingServices,
        ]);
    }

    public function storePD(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'animal_id'     => ['required', 'uuid'],
            'checked_on'    => ['required', 'date', 'before_or_equal:today'],
            'method'        => ['required', 'in:rectal_palpation,ultrasound,blood_test,visual'],
            'result'        => ['required', 'in:pregnant,not_pregnant,inconclusive'],
            'ai_service_id' => ['nullable', 'uuid'],
            'checked_by'    => ['nullable', 'string', 'max:120'],
            'cost'          => ['nullable', 'numeric', 'min:0'],
            'notes'         => ['nullable', 'string', 'max:500'],
        ]);

        $farmId = app('current.farm.id');
        $this->verifyAnimalBelongsToFarm($request->animal_id, $farmId);

        // Ensure the linked AI service belongs to this farm and this animal
        if ($request->ai_service_id) {
            $svcExists = \App\Models\AIService::withoutGlobalScopes()
                ->where('id', $request->ai_service_id)
                ->where('farm_id', $farmId)
                ->where('animal_id', $request->animal_id)
                ->exists();
            abort_unless($svcExists, 422, 'AI service does not belong to this animal or farm.');
        }

        $check = $this->service->recordPregnancyCheck([
            ...$request->only(['animal_id', 'checked_on', 'method', 'result', 'ai_service_id', 'checked_by', 'cost', 'notes']),
            'farm_id' => $farmId,
        ], $request->user()->id);

        $animal = Animal::withoutGlobalScopes()->find($request->animal_id);
        $msg = match ($request->result) {
            'pregnant'     => "{$animal->display_name} is confirmed pregnant!",
            'not_pregnant' => "{$animal->display_name} — not pregnant. Plan re-service.",
            'inconclusive' => "Inconclusive result for {$animal->display_name}. Follow-up alert created.",
            default        => 'Pregnancy check recorded.',
        };

        if ($request->wantsJson()) {
            return response()->json(['check' => $check, 'message' => $msg], 201);
        }

        return redirect()->route('breeding.index')->with('success', $msg);
    }

    // ─── Calving Management ───────────────────────────────────────────────────

    public function createCalving(Request $request): Response
    {
        $farmId = app('current.farm.id');

        // Pregnant cows
        $pregnant = Animal::where('farm_id', $farmId)
            ->where('sex', 'female')
            ->where('is_pregnant', true)
            ->orderBy('expected_calving_date')
            ->get(['id', 'tag_number', 'name', 'breed', 'parity', 'expected_calving_date']);

        // All active AI services with confirmed pregnancy
        $confirmedServices = AIService::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('result', 'confirmed_pregnant')
            ->with('animal:id,tag_number,name')
            ->orderBy('expected_calving_date')
            ->get();

        return Inertia::render('breeding/CalvingForm', compact('pregnant', 'confirmedServices'));
    }

    public function storeCalving(Request $request): RedirectResponse
    {
        $request->validate([
            'dam_id'              => ['required', 'uuid'],
            'calved_on'           => ['required', 'date', 'before_or_equal:today'],
            'calved_at'           => ['nullable', 'date_format:H:i'],
            'ease'                => ['required', 'in:easy,slight_assistance,major_assistance,caesarean,abnormal'],
            'calf_outcome'        => ['required', 'in:alive,stillborn,died_within_24h'],
            'calf_sex'            => ['required', 'in:male,female'],
            'calf_tag'            => ['nullable', 'string', 'max:40'],
            'calf_birth_weight_kg'=> ['nullable', 'numeric', 'min:15', 'max:80'],
            'breeding_record_id'   => ['nullable', 'uuid'],
            'is_twin'              => ['nullable', 'boolean'],
            'placenta_passed'      => ['nullable', 'boolean'],
            'colostrum_given'      => ['nullable', 'boolean'],
            'complications'        => ['nullable', 'string', 'max:500'],
            'notes'                => ['nullable', 'string', 'max:500'],
        ]);

        $farmId = app('current.farm.id');
        $this->verifyAnimalBelongsToFarm($request->dam_id, $farmId);

        $calving = $this->service->recordCalving([
            ...$request->only(['dam_id', 'calved_on', 'calved_at', 'ease', 'calf_outcome', 'calf_sex', 'calf_tag', 'calf_birth_weight_kg', 'breeding_record_id', 'is_twin', 'placenta_passed', 'colostrum_given', 'complications', 'notes']),
            'farm_id' => $farmId,
        ], $request->user()->id);

        $dam = Animal::withoutGlobalScopes()->find($request->dam_id);

        $calfMsg = $request->calf_outcome === 'alive' ? 'Calf registered.' : '';
        return redirect()->route('breeding.index')
            ->with('success', "Calving recorded for {$dam->display_name}. {$calfMsg} Remember to feed colostrum within 1 hour.");
    }

    // ─── Sync Programs ────────────────────────────────────────────────────────

    public function createSync(): Response
    {
        $farmId  = app('current.farm.id');
        $females = Animal::where('farm_id', $farmId)
            ->whereIn('status', ['lactating', 'dry', 'heifer'])
            ->where('sex', 'female')
            ->where('is_pregnant', false)
            ->orderBy('name')->orderBy('tag_number')
            ->get(['id', 'tag_number', 'name', 'breed']);

        return Inertia::render('breeding/SyncForm', ['animals' => $females]);
    }

    public function storeSync(Request $request): RedirectResponse
    {
        $request->validate([
            'animal_id'    => ['required', 'uuid'],
            'program_type' => ['required', 'in:Ovsynch,CIDR,Custom'],
            'start_date'   => ['required', 'date'],
            'notes'        => ['nullable', 'string', 'max:500'],
        ]);

        $farmId = app('current.farm.id');
        $this->verifyAnimalBelongsToFarm($request->animal_id, $farmId);

        $program = $this->service->createSyncProgram([
            ...$request->only(['animal_id', 'program_type', 'start_date', 'notes']),
            'farm_id' => $farmId,
        ], $request->user()->id);

        $animal = Animal::withoutGlobalScopes()->find($request->animal_id);

        return redirect()->route('breeding.index')
            ->with('success', "{$request->program_type} program started for {$animal->display_name}. {$program->steps->count()} steps scheduled.");
    }

    // ─── Mark sync step complete ───────────────────────────────────────────────

    public function completeSyncStep(Request $request, string $stepId): JsonResponse
    {
        $step = \App\Models\SyncProgramEvent::withoutGlobalScopes()
            ->where('farm_id', app('current.farm.id'))
            ->findOrFail($stepId);

        $step->update([
            'is_completed'    => true,
            'completed_on'    => now()->toDateString(),
            'administered_by' => $request->user()->id,
            'notes'           => $request->input('notes'),
        ]);

        // Auto-complete the program when all steps are done
        $program      = $step->program;
        $allCompleted = $program->steps()->where('is_completed', false)->doesntExist();
        if ($allCompleted) {
            $program->update(['status' => 'completed']);
        }

        return response()->json([
            'message'           => 'Step marked complete.',
            'program_completed' => $allCompleted,
        ]);
    }

    private function verifyAnimalBelongsToFarm(string $animalId, string $farmId): void
    {
        $exists = Animal::withoutGlobalScopes()
            ->where('id', $animalId)
            ->where('farm_id', $farmId)
            ->exists();
        abort_unless($exists, 403, 'Animal does not belong to your farm.');
    }
}

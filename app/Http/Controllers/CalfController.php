<?php

namespace App\Http\Controllers;

use App\Models\Animal;
use App\Models\AnimalWeightRecord;
use App\Models\CalfFeedingRecord;
use App\Services\CalfGrowthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CalfController extends Controller
{
    public function __construct(private readonly CalfGrowthService $service) {}

    // ─── Calf List ─────────────────────────────────────────────────────────────

    public function index(): Response
    {
        $farmId = app('current.farm.id');
        $kpis   = $this->service->getCalfKPIs($farmId);
        $calves = $this->service->getCalfList($farmId);
        $ranking = $this->service->getGrowthRanking($farmId);

        return Inertia::render('calves/Index', compact('kpis', 'calves', 'ranking'));
    }

    // ─── Calf Profile (growth chart + history) ─────────────────────────────────

    public function show(string $animalId): Response
    {
        $farmId = app('current.farm.id');
        $this->verifyAnimal($animalId, $farmId);

        $growthData = $this->service->getGrowthData($animalId);

        // Recent feeding records
        $feedings = CalfFeedingRecord::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('animal_id', $animalId)
            ->orderByDesc('fed_on')
            ->limit(30)
            ->get();

        return Inertia::render('calves/Show', [
            'growth'   => $growthData,
            'feedings' => $feedings,
        ]);
    }

    // ─── Record Weight ─────────────────────────────────────────────────────────

    public function createWeight(Request $request): Response
    {
        $farmId = app('current.farm.id');

        // Calves and heifers eligible for weighing
        $animals = Animal::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereIn('status', ['calf', 'heifer'])
            ->orderBy('birth_date', 'desc')
            ->get(['id', 'tag_number', 'name', 'breed', 'status', 'birth_date', 'weight_kg']);

        // Also allow lactating/dry cows for BCS recording
        $cows = Animal::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereIn('status', ['lactating', 'dry'])
            ->orderBy('name')
            ->get(['id', 'tag_number', 'name', 'breed', 'status', 'weight_kg']);

        $preAnimal = $request->input('animal_id');

        return Inertia::render('calves/WeightForm', compact('animals', 'cows', 'preAnimal'));
    }

    public function storeWeight(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'entries'                    => ['required', 'array', 'min:1'],
            'entries.*.animal_id'        => ['required', 'uuid'],
            'entries.*.measured_on'      => ['required', 'date', 'before_or_equal:today'],
            'entries.*.weight_kg'        => ['required', 'numeric', 'min:5', 'max:1200'],
            'entries.*.body_condition_score' => ['nullable', 'numeric', 'min:1', 'max:5'],
            'entries.*.method'           => ['nullable', 'string'],
            'entries.*.notes'            => ['nullable', 'string'],
        ]);

        $farmId = app('current.farm.id');
        $userId = $request->user()->id;
        $saved  = 0;

        foreach ($request->input('entries') as $entry) {
            if (!$this->verifyAnimalSilent($entry['animal_id'], $farmId)) continue;

            $this->service->recordWeight([
                'farm_id'              => $farmId,
                'animal_id'           => $entry['animal_id'],
                'measured_on'         => $entry['measured_on'],
                'weight_kg'           => (float) $entry['weight_kg'],
                'body_condition_score'=> $entry['body_condition_score'] ?? null,
                'method'              => $entry['method'] ?? 'scale',
                'notes'               => $entry['notes'] ?? null,
            ], $userId);

            $saved++;
        }

        if ($request->wantsJson()) {
            return response()->json(['message' => "{$saved} weight record(s) saved.", 'count' => $saved], 201);
        }

        $plural = $saved !== 1 ? 's' : '';
        return redirect()->route('calves.index')
            ->with('success', "{$saved} weight record{$plural} saved successfully.");
    }

    // ─── Batch weight entry (all calves one date) ──────────────────────────────

    public function batchWeight(): Response
    {
        $farmId = app('current.farm.id');

        $animals = Animal::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereIn('status', ['calf', 'heifer'])
            ->orderBy('birth_date', 'desc')
            ->get(['id', 'tag_number', 'name', 'breed', 'status', 'birth_date', 'weight_kg']);

        // Latest weight record per animal
        $latestWeights = AnimalWeightRecord::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereIn('animal_id', $animals->pluck('id'))
            ->select('animal_id', 'measured_on', 'weight_kg', 'adg_kg_day')
            ->orderByDesc('measured_on')
            ->get()
            ->groupBy('animal_id')
            ->map(fn ($records) => $records->first());

        return Inertia::render('calves/BatchWeight', compact('animals', 'latestWeights'));
    }

    // ─── Calf Feeding ──────────────────────────────────────────────────────────

    public function createFeeding(Request $request): Response
    {
        $farmId  = app('current.farm.id');
        $calves  = Animal::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('status', 'calf')
            ->orderBy('birth_date', 'desc')
            ->get(['id', 'tag_number', 'name', 'breed', 'birth_date', 'weight_kg']);

        $lactatingCows = Animal::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('status', 'lactating')
            ->orderBy('name')
            ->get(['id', 'tag_number', 'name']);

        return Inertia::render('calves/FeedingForm', compact('calves', 'lactatingCows'));
    }

    public function storeFeeding(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'animal_id'           => ['required', 'uuid'],
            'fed_on'              => ['required', 'date', 'before_or_equal:today'],
            'session'             => ['nullable', 'in:morning,midday,evening'],
            'feed_type'           => ['required', 'in:whole_milk,milk_replacer,starter_pellets,hay,water,other'],
            'quantity'            => ['required', 'numeric', 'min:0.001'],
            'unit'                => ['required', 'in:litres,kg,g'],
            'milk_source_animal_id' => ['nullable', 'uuid'],
            'cost'                => ['nullable', 'numeric', 'min:0'],
            'notes'               => ['nullable', 'string', 'max:500'],
        ]);

        $farmId = app('current.farm.id');
        $this->verifyAnimal($request->animal_id, $farmId);

        $feeding = CalfFeedingRecord::create([
            'id'                   => Str::uuid(),
            'farm_id'              => $farmId,
            'animal_id'            => $request->animal_id,
            'fed_on'               => $request->fed_on,
            'session'              => $request->session,
            'feed_type'            => $request->feed_type,
            'quantity'             => $request->quantity,
            'unit'                 => $request->unit,
            'milk_source_animal_id'=> $request->milk_source_animal_id,
            'cost'                 => $request->cost,
            'fed_by'               => $request->user()->id,
            'notes'                => $request->notes,
            'created_by'           => $request->user()->id,
        ]);

        if ($request->wantsJson()) {
            return response()->json(['feeding' => $feeding, 'message' => 'Feeding recorded.'], 201);
        }

        return redirect()->route('calves.index')
            ->with('success', 'Calf feeding recorded.');
    }

    // ─── Growth data API (for charts) ─────────────────────────────────────────

    public function growthData(string $animalId): JsonResponse
    {
        $farmId = app('current.farm.id');
        $this->verifyAnimal($animalId, $farmId);

        return response()->json($this->service->getGrowthData($animalId));
    }

    private function verifyAnimal(string $animalId, string $farmId): void
    {
        $exists = Animal::withoutGlobalScopes()
            ->where('id', $animalId)->where('farm_id', $farmId)->exists();
        abort_unless($exists, 403);
    }

    private function verifyAnimalSilent(string $animalId, string $farmId): bool
    {
        return Animal::withoutGlobalScopes()
            ->where('id', $animalId)->where('farm_id', $farmId)->exists();
    }
}

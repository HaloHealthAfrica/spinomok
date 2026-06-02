<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAnimalRequest;
use App\Http\Requests\UpdateAnimalRequest;
use App\Models\AIService;
use App\Models\Animal;
use App\Models\CalvingRecord;
use App\Models\HealthEvent;
use App\Models\HeatEvent;
use App\Models\MilkProduction;
use App\Models\PregnancyCheck;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AnimalController extends Controller
{
    public function index(Request $request): Response
    {
        $farmId = app('current.farm.id');

        $query = Animal::where('farm_id', $farmId)->active();

        // Search
        if ($search = $request->input('search')) {
            $query->search($search);
        }

        // Status filter
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        // Sort
        $query->orderBy('name')->orderBy('tag_number');

        $animals = $query->paginate(25)->withQueryString();

        // Summary counts
        $summary = Animal::where('farm_id', $farmId)
            ->selectRaw("
                count(*) as total,
                count(*) filter (where status = 'lactating') as lactating,
                count(*) filter (where status = 'dry') as dry,
                count(*) filter (where is_pregnant = true) as pregnant,
                count(*) filter (where status = 'calf') as calves
            ")
            ->first();

        return Inertia::render('animals/Index', [
            'animals' => $animals,
            'filters' => [
                'search' => $request->input('search', ''),
                'status' => $request->input('status', ''),
            ],
            'summary' => [
                'total'    => (int) $summary->total,
                'lactating'=> (int) $summary->lactating,
                'dry'      => (int) $summary->dry,
                'pregnant' => (int) $summary->pregnant,
                'calves'   => (int) $summary->calves,
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('animals/Create');
    }

    public function store(StoreAnimalRequest $request): RedirectResponse
    {
        $farmId = app('current.farm.id');

        $animal = Animal::create([
            ...$request->validated(),
            'farm_id'    => $farmId,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        return redirect()
            ->route('animals.show', $animal)
            ->with('success', "Animal {$animal->display_name} registered successfully.");
    }

    public function show(Animal $animal): Response
    {
        $this->authorizeAnimal($animal);

        $animal->load(['dam:id,tag_number,name', 'sire:id,tag_number,name']);
        $animal->append(['days_in_milk']);

        $farmId = app('current.farm.id');

        $healthEvents = HealthEvent::where('farm_id', $farmId)
            ->where('animal_id', $animal->id)
            ->with('diseaseType:id,name')
            ->latest('observed_on')
            ->limit(10)
            ->get();

        $milkRecords = MilkProduction::where('farm_id', $farmId)
            ->where('animal_id', $animal->id)
            ->selectRaw('milked_on, sum(quantity_litres) as total_litres')
            ->groupBy('milked_on')
            ->orderByDesc('milked_on')
            ->limit(14)
            ->get();

        $breedingEvents = collect()
            ->merge(HeatEvent::where('farm_id', $farmId)->where('animal_id', $animal->id)->latest('observed_on')->limit(5)->get()->map(fn ($event) => [
                'id' => $event->id,
                'type' => 'Heat',
                'date' => optional($event->observed_on)->toDateString(),
                'detail' => ucfirst(str_replace('_', ' ', $event->confidence ?? 'recorded')),
            ]))
            ->merge(AIService::where('farm_id', $farmId)->where('animal_id', $animal->id)->latest('service_date')->limit(5)->get()->map(fn ($event) => [
                'id' => $event->id,
                'type' => 'AI Service',
                'date' => optional($event->service_date)->toDateString(),
                'detail' => ucfirst(str_replace('_', ' ', $event->result ?? 'pending')),
            ]))
            ->merge(PregnancyCheck::where('farm_id', $farmId)->where('animal_id', $animal->id)->latest('checked_on')->limit(5)->get()->map(fn ($event) => [
                'id' => $event->id,
                'type' => 'Pregnancy Check',
                'date' => optional($event->checked_on)->toDateString(),
                'detail' => ucfirst(str_replace('_', ' ', $event->result ?? 'recorded')),
            ]))
            ->merge(CalvingRecord::where('farm_id', $farmId)->where('dam_id', $animal->id)->latest('calved_on')->limit(5)->get()->map(fn ($event) => [
                'id' => $event->id,
                'type' => 'Calving',
                'date' => optional($event->calved_on)->toDateString(),
                'detail' => ucfirst(str_replace('_', ' ', $event->calf_outcome ?? 'recorded')),
            ]))
            ->sortByDesc('date')
            ->values()
            ->take(12);

        return Inertia::render('animals/Show', [
            'animal' => $animal,
            'health_events' => $healthEvents,
            'breeding_events' => $breedingEvents,
            'milk_records' => $milkRecords,
        ]);
    }

    public function edit(Animal $animal): Response
    {
        $this->authorizeAnimal($animal);
        return Inertia::render('animals/Edit', ['animal' => $animal]);
    }

    public function update(UpdateAnimalRequest $request, Animal $animal): RedirectResponse
    {
        $this->authorizeAnimal($animal);

        $animal->update([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
        ]);

        return redirect()
            ->route('animals.show', $animal)
            ->with('success', 'Animal updated successfully.');
    }

    public function destroy(Animal $animal): RedirectResponse
    {
        $this->authorizeAnimal($animal);
        $animal->delete();

        return redirect()
            ->route('animals.index')
            ->with('success', "Animal {$animal->display_name} removed from herd.");
    }

    public function syncIndex(Request $request): JsonResponse
    {
        $request->validate([
            'since' => ['nullable', 'date'],
        ]);

        $farmId = app('current.farm.id');
        $since = $request->input('since', '2020-01-01T00:00:00Z');

        $animals = Animal::withTrashed()
            ->where('farm_id', $farmId)
            ->where('updated_at', '>', $since)
            ->orderBy('updated_at')
            ->get()
            ->map(fn (Animal $animal) => [
                'id' => $animal->id,
                'farm_id' => $animal->farm_id,
                'tag_number' => $animal->tag_number,
                'name' => $animal->name,
                'sex' => $animal->sex,
                'status' => $animal->status,
                'breed' => $animal->breed,
                'birth_date' => $animal->birth_date?->toDateString(),
                'is_pregnant' => (bool) $animal->is_pregnant,
                'expected_calving_date' => $animal->expected_calving_date?->toDateString(),
                'last_calving_date' => $animal->last_calving_date?->toDateString(),
                'parity' => $animal->parity,
                'weight_kg' => $animal->weight_kg !== null ? (float) $animal->weight_kg : null,
                'photo_url' => $animal->photo_url,
                'notes' => $animal->notes,
                'created_at' => $animal->created_at?->toISOString(),
                'updated_at' => $animal->updated_at?->toISOString(),
                'deleted_at' => $animal->deleted_at?->toISOString(),
            ])
            ->values();

        return response()->json(['data' => $animals]);
    }

    private function authorizeAnimal(Animal $animal): void
    {
        abort_unless($animal->farm_id === app('current.farm.id'), 403, 'Access denied.');
    }
}

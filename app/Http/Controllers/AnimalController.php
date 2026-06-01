<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAnimalRequest;
use App\Http\Requests\UpdateAnimalRequest;
use App\Models\Animal;
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

        return Inertia::render('animals/Show', [
            'animal' => $animal,
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

    private function authorizeAnimal(Animal $animal): void
    {
        abort_unless($animal->farm_id === app('current.farm.id'), 403, 'Access denied.');
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\MealFormula;
use App\Models\MealIngredient;
use App\Models\MealIngredientPrice;
use App\Models\RationPlan;
use App\Services\FeedFormulationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class FormulationController extends Controller
{
    public function __construct(private readonly FeedFormulationService $service) {}

    // ─── Meal Formulation Dashboard ───────────────────────────────────────────

    public function index(): Response
    {
        $farmId = app('current.farm.id');

        $formulas = MealFormula::where('farm_id', $farmId)
            ->where('is_active', true)
            ->with('ingredientsWithDetails')
            ->orderByDesc('updated_at')
            ->get();

        $rationPlans = RationPlan::where('farm_id', $farmId)
            ->with('components')
            ->orderByDesc('valid_from')
            ->limit(5)
            ->get();

        $ingredients = $this->service->getIngredientsWithPrices($farmId);

        // Commercial meal benchmark
        $commercialPrice = \App\Models\FeedInventory::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereHas('feedType', fn ($q) => $q->where('name', 'like', '%Dairy Meal%'))
            ->value('avg_cost_per_kg');

        return Inertia::render('formulation/Index', compact(
            'formulas', 'rationPlans', 'ingredients', 'commercialPrice',
        ));
    }

    // ─── Formula Builder ──────────────────────────────────────────────────────

    public function createFormula(): Response
    {
        $farmId     = app('current.farm.id');
        $ingredients = $this->service->getIngredientsWithPrices($farmId);

        return Inertia::render('formulation/FormulaBuilder', compact('ingredients'));
    }

    public function editFormula(string $formulaId): Response
    {
        $farmId  = app('current.farm.id');
        $formula = MealFormula::where('farm_id', $farmId)->with('ingredientsWithDetails')->findOrFail($formulaId);
        $ingredients = $this->service->getIngredientsWithPrices($farmId);

        return Inertia::render('formulation/FormulaBuilder', compact('formula', 'ingredients'));
    }

    /**
     * Live CP/ME calculation — called on every ingredient change (AJAX).
     */
    public function calculate(Request $request): JsonResponse
    {
        $request->validate([
            'ingredients'               => ['required', 'array'],
            'ingredients.*.meal_ingredient_id' => ['required', 'uuid'],
            'ingredients.*.inclusion_percent'  => ['required', 'numeric', 'min:0'],
            'batch_size_kg'             => ['nullable', 'numeric', 'min:1'],
        ]);

        $farmId   = app('current.farm.id');
        $batchSize = (float) $request->input('batch_size_kg', 100);

        $result = $this->service->calculateFormula(
            $request->input('ingredients'),
            $batchSize,
            $farmId
        );

        return response()->json($result);
    }

    public function storeFormula(Request $request): RedirectResponse|JsonResponse
    {
        $request->validate([
            'name'                 => ['required', 'string', 'max:120'],
            'batch_size_kg'        => ['required', 'numeric', 'min:1'],
            'target_cp_percent'    => ['nullable', 'numeric'],
            'season'               => ['nullable', 'in:general,wet_season,dry_season'],
            'ingredients'          => ['required', 'array', 'min:1'],
            'ingredients.*.meal_ingredient_id' => ['required', 'uuid'],
            'ingredients.*.inclusion_percent'  => ['required', 'numeric', 'min:0'],
        ]);

        $farmId  = app('current.farm.id');
        $formula = $this->service->saveFormula($request->all(), $farmId, $request->user()->id);

        if ($request->wantsJson()) {
            return response()->json(['formula' => $formula, 'message' => 'Formula saved.'], 201);
        }

        return redirect()->route('formulation.index')
            ->with('success', "Formula '{$formula->name}' saved. CP: {$formula->computed_cp_percent}%, Cost: KES {$formula->cost_per_kg}/kg.");
    }

    public function updateFormula(Request $request, string $formulaId): RedirectResponse
    {
        $farmId  = app('current.farm.id');
        $formula = MealFormula::where('farm_id', $farmId)->findOrFail($formulaId);

        $request->validate([
            'name'        => ['required', 'string', 'max:120'],
            'batch_size_kg' => ['required', 'numeric', 'min:1'],
            'ingredients' => ['required', 'array', 'min:1'],
        ]);

        $updated = $this->service->saveFormula($request->all(), $farmId, $request->user()->id, $formulaId);

        return redirect()->route('formulation.index')
            ->with('success', "Formula '{$updated->name}' updated.");
    }

    public function destroyFormula(string $formulaId): RedirectResponse
    {
        $farmId = app('current.farm.id');
        MealFormula::where('farm_id', $farmId)->findOrFail($formulaId)->delete();
        return redirect()->route('formulation.index')->with('success', 'Formula deleted.');
    }

    // ─── Ingredient Price Management ──────────────────────────────────────────

    public function updatePrice(Request $request): JsonResponse
    {
        $request->validate([
            'meal_ingredient_id' => ['required', 'uuid'],
            'price_per_kg'       => ['required', 'numeric', 'min:0'],
            'supplier'           => ['nullable', 'string', 'max:120'],
        ]);

        $farmId = app('current.farm.id');

        $price = MealIngredientPrice::create([
            'id'                 => Str::uuid(),
            'farm_id'            => $farmId,
            'meal_ingredient_id' => $request->meal_ingredient_id,
            'price_per_kg'       => $request->price_per_kg,
            'effective_from'     => now()->toDateString(),
            'supplier'           => $request->supplier,
            'created_by'         => $request->user()->id,
        ]);

        return response()->json(['price' => $price, 'message' => 'Price updated.']);
    }

    // ─── Ration Planner ───────────────────────────────────────────────────────

    public function rationCreate(): Response
    {
        $farmId   = app('current.farm.id');
        $formulas = MealFormula::where('farm_id', $farmId)->active()
                               ->get(['id', 'name', 'computed_cp_percent', 'cost_per_kg']);

        return Inertia::render('formulation/RationPlanner', compact('formulas'));
    }

    /**
     * Live ration calculation — called as user adjusts parameters.
     */
    public function calculateRation(Request $request): JsonResponse
    {
        $request->validate([
            'animal_group'       => ['required', 'in:lactating,dry,heifer,calf'],
            'target_milk_yield_l'=> ['nullable', 'numeric', 'min:0'],
            'animal_weight_kg'   => ['nullable', 'numeric', 'min:50'],
            'head_count'         => ['nullable', 'integer', 'min:1'],
        ]);

        $farmId = app('current.farm.id');
        $result = $this->service->computeRation($request->all(), $farmId);

        return response()->json($result);
    }

    public function storeRation(Request $request): RedirectResponse
    {
        $request->validate([
            'name'               => ['required', 'string', 'max:120'],
            'animal_group'       => ['required', 'in:lactating,dry,heifer,calf'],
            'target_milk_yield_l'=> ['nullable', 'numeric', 'min:0'],
            'animal_weight_kg'   => ['nullable', 'numeric', 'min:50'],
            'head_count'         => ['nullable', 'integer', 'min:1'],
            'valid_from'         => ['required', 'date'],
            'valid_until'        => ['nullable', 'date', 'after:valid_from'],
            'notes'              => ['nullable', 'string', 'max:500'],
        ]);

        $farmId    = app('current.farm.id');
        $rationData = $this->service->computeRation($request->all(), $farmId);

        $plan = $this->service->saveRationPlan($rationData, $request->all(), $farmId, $request->user()->id);

        return redirect()->route('formulation.index')
            ->with('success', "Ration plan '{$plan->name}' saved. Daily cost: KES {$plan->cost_per_head_per_day}/head.");
    }
}

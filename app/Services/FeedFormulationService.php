<?php

namespace App\Services;

use App\Models\FeedType;
use App\Models\MealFormula;
use App\Models\MealFormulaIngredient;
use App\Models\MealIngredient;
use App\Models\MealIngredientPrice;
use App\Models\RationPlan;
use App\Models\RationPlanComponent;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class FeedFormulationService
{
    /**
     * Nutritional targets by animal group.
     */
    private const TARGETS = [
        'lactating' => ['cp_min' => 16.0, 'cp_max' => 18.0, 'me_min' => 12.0, 'me_max' => 13.5],
        'dry'       => ['cp_min' => 12.0, 'cp_max' => 14.0, 'me_min' => 9.0,  'me_max' => 11.0],
        'heifer'    => ['cp_min' => 14.0, 'cp_max' => 16.0, 'me_min' => 10.5, 'me_max' => 12.0],
        'calf'      => ['cp_min' => 18.0, 'cp_max' => 20.0, 'me_min' => 10.0, 'me_max' => 12.0],
    ];

    /**
     * Calculate nutritional composition of a formula from its ingredients.
     * Returns computed CP%, ME, Ca%, P%, cost/kg, and total batch cost.
     */
    public function calculateFormula(array $ingredients, float $batchSizeKg, string $farmId): array
    {
        $totalInclusionPct = 0;
        $weightedCp  = 0.0;
        $weightedMe  = 0.0;
        $weightedCa  = 0.0;
        $weightedPh  = 0.0;
        $totalCost   = 0.0;

        $ingredientDetails = [];

        foreach ($ingredients as $item) {
            $ingredientId = $item['meal_ingredient_id'];
            $inclusion    = (float) $item['inclusion_percent'];

            $ingredient = MealIngredient::find($ingredientId);
            if (!$ingredient) continue;

            $fraction = $inclusion / 100;

            // DM-adjusted calculations
            $dmFraction = ($ingredient->dry_matter_percent ?? 88) / 100;

            $weightedCp += $fraction * ($ingredient->crude_protein_percent ?? 0);
            $weightedMe += $fraction * ($ingredient->metabolizable_energy ?? 0) * $dmFraction;
            $weightedCa += $fraction * ($ingredient->calcium_percent ?? 0);
            $weightedPh += $fraction * ($ingredient->phosphorus_percent ?? 0);

            // Cost
            $latestPrice = MealIngredientPrice::where('farm_id', $farmId)
                ->where('meal_ingredient_id', $ingredientId)
                ->orderByDesc('effective_from')
                ->value('price_per_kg');

            $costPerKg = $latestPrice ? (float) $latestPrice : 0.0;
            $qtyKg     = ($inclusion / 100) * $batchSizeKg;
            $lineTotal  = $qtyKg * $costPerKg;

            $totalInclusionPct += $inclusion;
            $totalCost         += $lineTotal;

            $ingredientDetails[] = [
                'meal_ingredient_id' => $ingredientId,
                'name'               => $ingredient->name,
                'inclusion_percent'  => $inclusion,
                'quantity_kg'        => round($qtyKg, 3),
                'price_per_kg'       => $costPerKg,
                'line_cost'          => round($lineTotal, 2),
                'cp_contribution'    => round($fraction * ($ingredient->crude_protein_percent ?? 0), 2),
            ];
        }

        $costPerKg       = $batchSizeKg > 0 ? round($totalCost / $batchSizeKg, 3) : 0;
        $computedCpPct   = round($weightedCp, 2);
        $computedMe      = round($weightedMe, 3);

        $warnings = $this->generateWarnings($ingredients, $computedCpPct, $totalInclusionPct, $farmId);

        return [
            'computed_cp_percent'         => $computedCpPct,
            'computed_me'                 => $computedMe,
            'computed_calcium_percent'    => round($weightedCa, 3),
            'computed_phosphorus_percent' => round($weightedPh, 3),
            'cost_per_kg'                 => $costPerKg,
            'total_batch_cost'            => round($totalCost, 2),
            'total_inclusion_percent'     => round($totalInclusionPct, 2),
            'ingredient_details'          => $ingredientDetails,
            'warnings'                    => $warnings,
        ];
    }

    /**
     * Save or update a meal formula.
     */
    public function saveFormula(array $data, string $farmId, string $userId, ?string $formulaId = null): MealFormula
    {
        $batchSize    = (float) ($data['batch_size_kg'] ?? 100);
        $ingredients  = $data['ingredients'] ?? [];
        $computed     = $this->calculateFormula($ingredients, $batchSize, $farmId);

        $formulaData = [
            'farm_id'                     => $farmId,
            'name'                        => $data['name'],
            'description'                 => $data['description'] ?? null,
            'batch_size_kg'               => $batchSize,
            'target_cp_percent'           => $data['target_cp_percent'] ?? null,
            'computed_cp_percent'         => $computed['computed_cp_percent'],
            'computed_me'                 => $computed['computed_me'],
            'computed_calcium_percent'    => $computed['computed_calcium_percent'],
            'computed_phosphorus_percent' => $computed['computed_phosphorus_percent'],
            'cost_per_kg'                 => $computed['cost_per_kg'],
            'total_batch_cost'            => $computed['total_batch_cost'],
            'season'                      => $data['season'] ?? 'general',
            'updated_by'                  => $userId,
        ];

        if ($formulaId) {
            $formula = MealFormula::findOrFail($formulaId);
            $formula->update($formulaData);
        } else {
            $formula = MealFormula::create([
                'id'         => Str::uuid(),
                'created_by' => $userId,
                ...$formulaData,
            ]);
        }

        // Replace all ingredients
        MealFormulaIngredient::where('meal_formula_id', $formula->id)->delete();

        foreach ($computed['ingredient_details'] as $detail) {
            MealFormulaIngredient::create([
                'id'                 => Str::uuid(),
                'meal_formula_id'    => $formula->id,
                'meal_ingredient_id' => $detail['meal_ingredient_id'],
                'inclusion_percent'  => $detail['inclusion_percent'],
                'quantity_kg'        => $detail['quantity_kg'],
                'cost'               => $detail['line_cost'],
            ]);
        }

        return $formula->fresh()->load('ingredientsWithDetails');
    }

    /**
     * Generate nutritional warnings for a formula.
     */
    private function generateWarnings(array $ingredients, float $cpPct, float $totalInclusion, string $farmId): array
    {
        $warnings = [];

        if (abs($totalInclusion - 100) > 0.5) {
            $warnings[] = [
                'type' => 'error',
                'message' => "Ingredients sum to {$totalInclusion}% — must equal 100%. Adjust proportions.",
            ];
        }

        if ($cpPct < 14) {
            $warnings[] = ['type' => 'warning', 'message' => "CP {$cpPct}% is below the minimum 14% recommendation."];
        } elseif ($cpPct > 22) {
            $warnings[] = ['type' => 'warning', 'message' => "CP {$cpPct}% is very high — economic cost may outweigh benefit above 20%."];
        }

        // Check max inclusion limits
        foreach ($ingredients as $item) {
            $ingredient = MealIngredient::find($item['meal_ingredient_id']);
            if (!$ingredient) continue;
            $max = $ingredient->max_inclusion_percent;
            $inc = (float) $item['inclusion_percent'];
            if ($max && $inc > $max) {
                $warnings[] = [
                    'type'    => 'danger',
                    'message' => "{$ingredient->name} at {$inc}% exceeds safe maximum of {$max}%." . ($ingredient->notes ? " Note: {$ingredient->notes}" : ''),
                ];
            }
        }

        return $warnings;
    }

    /**
     * Compute a total mixed ration for a given animal group.
     * Returns recommended feed components, nutritional totals, and cost.
     */
    public function computeRation(array $data, string $farmId): array
    {
        $group      = $data['animal_group'];
        $milkYield  = (float) ($data['target_milk_yield_l'] ?? 15);
        $liveWeight = (float) ($data['animal_weight_kg'] ?? 500);
        $headCount  = (int) ($data['head_count'] ?? 1);

        $targets = self::TARGETS[$group] ?? self::TARGETS['lactating'];

        // Estimate daily DM intake (3.5% of LW)
        $dmiKg = $liveWeight * 0.035;

        // Dairy meal requirement: 1 kg per 3 L milk above maintenance (5L)
        $dairyMealKg = max(2, ($milkYield - 5) / 3);
        $dairyMealKg = min($dairyMealKg, 12); // cap at 12 kg/day

        // Roughage fills remaining DMI (adjusted for DM content)
        $roughageFreshKg = max(10, ($dmiKg - $dairyMealKg * 0.88) / 0.15); // Napier is ~15% DM
        $roughageFreshKg = min(50, $roughageFreshKg); // cap

        $hayKg = 3.0; // standard 3 kg hay supplement

        // Get feed type costs from farm inventory
        $napierCost   = $this->getInventoryCostPerKg($farmId, 'Napier Grass (Fresh)') ?? 3.0;
        $mealCost     = $this->getInventoryCostPerKg($farmId, 'Dairy Meal (16% CP)') ?? 52.0;
        $hayCost      = $this->getInventoryCostPerKg($farmId, 'Rhodes Grass Hay') ?? 18.0;
        $mineralCost  = $this->getInventoryCostPerKg($farmId, 'Mineral Supplement (Loose)') ?? 150.0;

        $components = [
            ['name' => 'Napier Grass (Fresh)', 'qty_per_head' => round($roughageFreshKg, 1), 'dm_pct' => 15, 'cp_pct' => 9,  'me' => 8.5,  'cost_kg' => $napierCost],
            ['name' => 'Dairy Meal (16% CP)',  'qty_per_head' => round($dairyMealKg, 1),    'dm_pct' => 88, 'cp_pct' => 16, 'me' => 12.5, 'cost_kg' => $mealCost],
            ['name' => 'Rhodes Grass Hay',     'qty_per_head' => $hayKg,                    'dm_pct' => 88, 'cp_pct' => 8,  'me' => 9.0,  'cost_kg' => $hayCost],
            ['name' => 'Mineral Supplement',   'qty_per_head' => 0.1,                        'dm_pct' => 100,'cp_pct' => 0,  'me' => 0,    'cost_kg' => $mineralCost],
        ];

        // Compute totals
        $totalDm   = 0.0;
        $totalCp   = 0.0;
        $totalMe   = 0.0;
        $totalCost = 0.0;

        $computed = array_map(function ($comp) use (&$totalDm, &$totalCp, &$totalMe, &$totalCost) {
            $dmKg       = $comp['qty_per_head'] * ($comp['dm_pct'] / 100);
            $cpContrib  = $comp['qty_per_head'] * ($comp['cp_pct'] / 100);
            $meContrib  = $dmKg * $comp['me'];
            $cost       = round($comp['qty_per_head'] * $comp['cost_kg'], 2);

            $totalDm   += $dmKg;
            $totalCp   += $cpContrib;
            $totalMe   += $meContrib;
            $totalCost += $cost;

            return [
                'component_name'         => $comp['name'],
                'quantity_kg_per_head'   => $comp['qty_per_head'],
                'dm_kg_per_head'         => round($dmKg, 2),
                'cp_contribution_percent'=> round($cpContrib / max(1, $totalDm) * 100, 1),
                'me_contribution'        => round($meContrib, 2),
                'cost_per_head'          => $cost,
            ];
        }, $components);

        $rationCpPct = $totalDm > 0 ? round(($totalCp / $totalDm) * 100, 1) : 0;
        $rationMe    = $totalDm > 0 ? round($totalMe / $totalDm, 2) : 0;

        $rationWarnings = [];
        if ($rationCpPct < $targets['cp_min']) {
            $rationWarnings[] = "CP {$rationCpPct}% below target {$targets['cp_min']}%. Consider increasing dairy meal.";
        }
        if ($rationCpPct > $targets['cp_max']) {
            $rationWarnings[] = "CP {$rationCpPct}% above target {$targets['cp_max']}%. Reduce protein supplement.";
        }

        return [
            'animal_group'          => $group,
            'target_milk_yield_l'   => $milkYield,
            'animal_weight_kg'      => $liveWeight,
            'head_count'            => $headCount,
            'components'            => $computed,
            'total_dm_kg_per_head'  => round($totalDm, 2),
            'computed_cp_percent'   => $rationCpPct,
            'computed_me'           => $rationMe,
            'cost_per_head_per_day' => round($totalCost, 2),
            'total_daily_cost'      => round($totalCost * $headCount, 2),
            'cp_target'             => $targets,
            'warnings'              => $rationWarnings,
        ];
    }

    /**
     * Save a computed ration plan to the database.
     */
    public function saveRationPlan(array $rationData, array $formData, string $farmId, string $userId): RationPlan
    {
        $plan = RationPlan::create([
            'id'                    => Str::uuid(),
            'farm_id'               => $farmId,
            'name'                  => $formData['name'],
            'animal_group'          => $rationData['animal_group'],
            'production_level'      => $formData['production_level'] ?? null,
            'head_count'            => $rationData['head_count'],
            'valid_from'            => $formData['valid_from'],
            'valid_until'           => $formData['valid_until'] ?? null,
            'target_milk_yield_l'   => $rationData['target_milk_yield_l'],
            'animal_weight_kg'      => $rationData['animal_weight_kg'],
            'total_dm_kg_per_head'  => $rationData['total_dm_kg_per_head'],
            'computed_cp_percent'   => $rationData['computed_cp_percent'],
            'computed_me'           => $rationData['computed_me'],
            'cost_per_head_per_day' => $rationData['cost_per_head_per_day'],
            'notes'                 => $formData['notes'] ?? null,
            'created_by'            => $userId,
        ]);

        foreach ($rationData['components'] as $comp) {
            RationPlanComponent::create([
                'id'                     => Str::uuid(),
                'ration_plan_id'         => $plan->id,
                'component_name'         => $comp['component_name'],
                'quantity_kg_per_head'   => $comp['quantity_kg_per_head'],
                'dm_kg_per_head'         => $comp['dm_kg_per_head'],
                'cp_contribution_percent'=> $comp['cp_contribution_percent'],
                'me_contribution'        => $comp['me_contribution'],
                'cost_per_head'          => $comp['cost_per_head'],
            ]);
        }

        return $plan->load('components');
    }

    /**
     * Get the current inventory cost per kg for a feed type by name.
     */
    private function getInventoryCostPerKg(string $farmId, string $feedTypeName): ?float
    {
        $feedType = FeedType::where('name', $feedTypeName)->first();
        if (!$feedType) return null;

        $inv = \App\Models\FeedInventory::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('feed_type_id', $feedType->id)
            ->value('avg_cost_per_kg');

        return $inv ? (float) $inv : null;
    }

    /**
     * Ingredient library with current farm prices attached.
     */
    public function getIngredientsWithPrices(string $farmId): Collection
    {
        $ingredients = MealIngredient::active()->orderBy('category')->orderBy('name')->get();

        $prices = MealIngredientPrice::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->orderByDesc('effective_from')
            ->get()
            ->groupBy('meal_ingredient_id')
            ->map(fn ($rows) => (float) $rows->first()->price_per_kg);

        return $ingredients->map(fn ($ing) => [
            'id'                    => $ing->id,
            'name'                  => $ing->name,
            'category'              => $ing->category,
            'crude_protein_percent' => (float) ($ing->crude_protein_percent ?? 0),
            'metabolizable_energy'  => (float) ($ing->metabolizable_energy ?? 0),
            'dry_matter_percent'    => (float) ($ing->dry_matter_percent ?? 88),
            'calcium_percent'       => (float) ($ing->calcium_percent ?? 0),
            'phosphorus_percent'    => (float) ($ing->phosphorus_percent ?? 0),
            'max_inclusion_percent' => $ing->max_inclusion_percent ? (float) $ing->max_inclusion_percent : null,
            'notes'                 => $ing->notes,
            'price_per_kg'          => $prices->get($ing->id),
        ]);
    }
}

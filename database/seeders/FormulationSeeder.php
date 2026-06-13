<?php

namespace Database\Seeders;

use App\Models\Farm;
use App\Models\MealIngredient;
use App\Models\MealIngredientPrice;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class FormulationSeeder extends Seeder
{
    public function run(): void
    {
        // Ingredient library with Kenya-specific nutritional values
        $ingredients = [
            // Energy sources
            ['name' => 'Maize Germ',          'cat' => 'energy',   'dm' => 88, 'cp' => 9.0,  'me' => 12.0, 'cf' => 4.0,  'ca' => 0.02, 'ph' => 0.25, 'max' => 40],
            ['name' => 'Wheat Bran',          'cat' => 'energy',   'dm' => 88, 'cp' => 16.0, 'me' => 10.5, 'cf' => 10.0, 'ca' => 0.13, 'ph' => 0.99, 'max' => 30],
            ['name' => 'Pollard (Wheat)',     'cat' => 'energy',   'dm' => 88, 'cp' => 15.0, 'me' => 10.0, 'cf' => 9.0,  'ca' => 0.10, 'ph' => 0.90, 'max' => 25],
            ['name' => 'Maize Bran',          'cat' => 'energy',   'dm' => 88, 'cp' => 9.5,  'me' => 9.5,  'cf' => 8.0,  'ca' => 0.05, 'ph' => 0.28, 'max' => 35],
            ['name' => 'Molasses (dried)',    'cat' => 'energy',   'dm' => 90, 'cp' => 5.0,  'me' => 11.5, 'cf' => 0.0,  'ca' => 0.80, 'ph' => 0.08, 'max' => 10],
            // Protein sources
            ['name' => 'Cotton Seed Cake',    'cat' => 'protein',  'dm' => 90, 'cp' => 38.0, 'me' => 11.5, 'cf' => 12.0, 'ca' => 0.20, 'ph' => 0.90, 'max' => 20, 'notes' => 'Max 20% — gossypol toxicity above this level'],
            ['name' => 'Sunflower Seed Cake', 'cat' => 'protein',  'dm' => 90, 'cp' => 31.0, 'me' => 10.8, 'cf' => 18.0, 'ca' => 0.40, 'ph' => 1.00, 'max' => 25],
            ['name' => 'Soya Bean Meal',      'cat' => 'protein',  'dm' => 88, 'cp' => 46.0, 'me' => 13.5, 'cf' => 5.0,  'ca' => 0.25, 'ph' => 0.60, 'max' => 20],
            ['name' => 'Groundnut Cake',      'cat' => 'protein',  'dm' => 90, 'cp' => 45.0, 'me' => 12.5, 'cf' => 7.0,  'ca' => 0.16, 'ph' => 0.58, 'max' => 15],
            ['name' => 'Fish Meal',           'cat' => 'protein',  'dm' => 90, 'cp' => 60.0, 'me' => 12.0, 'cf' => 1.0,  'ca' => 3.00, 'ph' => 1.80, 'max' => 5],
            ['name' => 'Urea (NPN)',          'cat' => 'protein',  'dm' => 99, 'cp' => 288.0,'me' => 0.0,  'cf' => 0.0,  'ca' => 0.00, 'ph' => 0.00, 'max' => 1,  'notes' => 'Max 1% — rumen toxicity. Provides 288% equivalent CP via ammonia'],
            // Minerals
            ['name' => 'Di-calcium Phosphate (DCP)', 'cat' => 'mineral', 'dm' => 99, 'cp' => 0, 'me' => 0, 'cf' => 0, 'ca' => 21.0, 'ph' => 18.0, 'max' => 3],
            ['name' => 'Ground Limestone (Lime)',    'cat' => 'mineral', 'dm' => 99, 'cp' => 0, 'me' => 0, 'cf' => 0, 'ca' => 38.0, 'ph' => 0.0,  'max' => 2],
            ['name' => 'Common Salt (NaCl)',         'cat' => 'mineral', 'dm' => 99, 'cp' => 0, 'me' => 0, 'cf' => 0, 'ca' => 0.0,  'ph' => 0.0,  'max' => 1],
            ['name' => 'Vitamin-Mineral Premix',    'cat' => 'additive','dm' => 98, 'cp' => 0, 'me' => 0, 'cf' => 0, 'ca' => 0.0,  'ph' => 0.0,  'max' => 3],
        ];

        foreach ($ingredients as $ing) {
            MealIngredient::firstOrCreate(['name' => $ing['name']], [
                'id'                    => Str::uuid(),
                'category'              => $ing['cat'],
                'dry_matter_percent'    => $ing['dm'],
                'crude_protein_percent' => $ing['cp'],
                'metabolizable_energy'  => $ing['me'],
                'crude_fibre_percent'   => $ing['cf'],
                'calcium_percent'       => $ing['ca'],
                'phosphorus_percent'    => $ing['ph'],
                'max_inclusion_percent' => $ing['max'],
                'notes'                 => $ing['notes'] ?? null,
            ]);
        }

        // Set default ingredient prices for the first farm, if present.
        $farm = Farm::first();
        if ($farm) {
            $prices = [
                'Maize Germ'               => 22.00,
                'Wheat Bran'               => 19.00,
                'Pollard (Wheat)'          => 20.00,
                'Maize Bran'               => 16.00,
                'Cotton Seed Cake'         => 32.00,
                'Sunflower Seed Cake'      => 30.00,
                'Soya Bean Meal'           => 65.00,
                'Di-calcium Phosphate (DCP)' => 110.00,
                'Ground Limestone (Lime)'  => 15.00,
                'Common Salt (NaCl)'       => 25.00,
                'Vitamin-Mineral Premix'   => 280.00,
            ];

            foreach ($prices as $name => $price) {
                $ingredient = MealIngredient::where('name', $name)->first();
                if (!$ingredient) continue;
                MealIngredientPrice::firstOrCreate(
                    ['farm_id' => $farm->id, 'meal_ingredient_id' => $ingredient->id, 'effective_from' => now()->toDateString()],
                    [
                        'id'                  => Str::uuid(),
                        'farm_id'             => $farm->id,
                        'meal_ingredient_id'  => $ingredient->id,
                        'price_per_kg'        => $price,
                        'effective_from'      => now()->toDateString(),
                    ]
                );
            }

        }

        $this->command->info('✓ Meal ingredients seeded: ' . MealIngredient::count());
    }
}

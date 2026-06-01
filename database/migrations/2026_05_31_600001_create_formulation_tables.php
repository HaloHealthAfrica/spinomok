<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Raw ingredient library for dairy meal mixing
        Schema::create('meal_ingredients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 100)->unique();
            $table->decimal('dry_matter_percent', 5, 2)->nullable()->default(88.0);
            $table->decimal('crude_protein_percent', 5, 2)->nullable();
            $table->decimal('metabolizable_energy', 8, 3)->nullable(); // MJ/kg DM
            $table->decimal('crude_fibre_percent', 5, 2)->nullable();
            $table->decimal('calcium_percent', 5, 3)->nullable();
            $table->decimal('phosphorus_percent', 5, 3)->nullable();
            $table->string('category', 40)->nullable(); // energy|protein|mineral|binder|additive
            $table->decimal('max_inclusion_percent', 5, 2)->nullable(); // safety max % in formula
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Farm-specific ingredient prices (updated when stock is received)
        Schema::create('meal_ingredient_prices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignUuid('meal_ingredient_id')->constrained('meal_ingredients')->restrictOnDelete();
            $table->decimal('price_per_kg', 8, 2);
            $table->date('effective_from');
            $table->string('supplier', 120)->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->index(['farm_id', 'meal_ingredient_id', 'effective_from']);
        });

        // Saved dairy meal formulas (recipes)
        Schema::create('meal_formulas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->string('name', 120);
            $table->text('description')->nullable();
            $table->decimal('batch_size_kg', 8, 2)->default(100.0); // total batch
            $table->decimal('target_cp_percent', 5, 2)->nullable(); // target crude protein
            $table->decimal('computed_cp_percent', 5, 2)->nullable(); // computed after ingredients
            $table->decimal('computed_me', 8, 3)->nullable(); // computed ME MJ/kg DM
            $table->decimal('computed_calcium_percent', 5, 3)->nullable();
            $table->decimal('computed_phosphorus_percent', 5, 3)->nullable();
            $table->decimal('cost_per_kg', 8, 3)->nullable(); // computed
            $table->decimal('total_batch_cost', 12, 2)->nullable(); // computed
            $table->boolean('is_active')->default(true);
            $table->string('season', 20)->nullable(); // wet_season|dry_season|general
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['farm_id', 'is_active']);
        });

        // Ingredients and their proportions in a formula
        Schema::create('meal_formula_ingredients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('meal_formula_id')->constrained('meal_formulas')->cascadeOnDelete();
            $table->foreignUuid('meal_ingredient_id')->constrained('meal_ingredients')->restrictOnDelete();
            $table->decimal('inclusion_percent', 6, 3); // % of batch by weight
            $table->decimal('quantity_kg', 8, 3);        // derived from batch_size × inclusion%
            $table->decimal('cost', 10, 3)->nullable();  // at formula creation/save time
            $table->timestamps();

            $table->unique(['meal_formula_id', 'meal_ingredient_id']);
        });

        // Group-level ration plans
        Schema::create('ration_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('animal_group', 40); // lactating|dry|heifer|calf
            $table->string('production_level', 40)->nullable(); // high (>20L)|medium (10-20L)|low (<10L)
            $table->smallInteger('head_count')->nullable();
            $table->date('valid_from');
            $table->date('valid_until')->nullable();
            $table->decimal('target_milk_yield_l', 6, 2)->nullable(); // L/day target
            $table->decimal('animal_weight_kg', 7, 2)->nullable(); // typical BW
            $table->decimal('total_dm_kg_per_head', 8, 3)->nullable(); // computed
            $table->decimal('computed_cp_percent', 5, 2)->nullable();
            $table->decimal('computed_me', 8, 3)->nullable();
            $table->decimal('cost_per_head_per_day', 8, 2)->nullable(); // computed
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['farm_id', 'valid_from']);
        });

        // Feed components of a ration plan
        Schema::create('ration_plan_components', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('ration_plan_id')->constrained('ration_plans')->cascadeOnDelete();
            $table->uuid('feed_type_id')->nullable();    // from feed_types table
            $table->uuid('meal_formula_id')->nullable(); // OR a compound formula
            $table->string('component_name', 120);       // display name
            $table->decimal('quantity_kg_per_head', 8, 3); // as-fed, per animal per day
            $table->decimal('dm_kg_per_head', 8, 3)->nullable();
            $table->decimal('cp_contribution_percent', 5, 2)->nullable();
            $table->decimal('me_contribution', 8, 3)->nullable();
            $table->decimal('cost_per_head', 8, 2)->nullable();
            $table->timestamps();

            $table->index('ration_plan_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ration_plan_components');
        Schema::dropIfExists('ration_plans');
        Schema::dropIfExists('meal_formula_ingredients');
        Schema::dropIfExists('meal_formulas');
        Schema::dropIfExists('meal_ingredient_prices');
        Schema::dropIfExists('meal_ingredients');
    }
};

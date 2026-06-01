<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Master feed catalog with nutritional data
        Schema::create('feed_types', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 80)->unique(); // Napier Grass, Dairy Meal, etc.
            $table->string('category', 40)->default('roughage'); // roughage|concentrate|mineral|supplement|silage|hay
            $table->decimal('dry_matter_percent', 5, 2)->nullable();
            $table->decimal('crude_protein_percent', 5, 2)->nullable();
            $table->decimal('metabolizable_energy', 8, 3)->nullable(); // MJ/kg DM
            $table->decimal('neutral_detergent_fibre', 5, 2)->nullable();
            $table->string('default_unit', 20)->default('kg'); // kg|bales|bags
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Current stock levels per feed type per farm
        Schema::create('feed_inventory', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignUuid('feed_type_id')->constrained('feed_types')->restrictOnDelete();
            $table->decimal('quantity_kg', 12, 3)->default(0);
            $table->decimal('reorder_level_kg', 12, 3)->nullable(); // alert threshold
            $table->string('storage_location', 120)->nullable();
            $table->decimal('avg_cost_per_kg', 8, 3)->nullable(); // weighted average
            $table->date('last_restocked_on')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['farm_id', 'feed_type_id']);
            $table->index(['farm_id', 'quantity_kg']);
        });

        // Full movement ledger: every stock change
        Schema::create('feed_inventory_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignUuid('feed_inventory_id')->constrained('feed_inventory')->restrictOnDelete();
            $table->foreignUuid('feed_type_id')->constrained('feed_types')->restrictOnDelete();
            $table->string('transaction_type', 30); // purchase|harvest|consumption|adjustment|wastage
            $table->date('transaction_date');
            $table->decimal('quantity_kg', 12, 3); // positive=in, negative=out
            $table->decimal('unit_cost', 8, 3)->nullable(); // cost per kg at time of transaction
            $table->decimal('total_cost', 12, 2)->nullable(); // |qty| × unit_cost
            $table->string('supplier', 120)->nullable();
            $table->string('reference_number', 80)->nullable(); // invoice/LPO number
            $table->string('animal_group', 60)->nullable(); // which group consumed: lactating|dry|calves|all
            $table->uuid('recorded_by')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->index(['farm_id', 'transaction_date']);
            $table->index(['feed_inventory_id', 'transaction_date']);
            $table->index(['farm_id', 'transaction_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feed_inventory_transactions');
        Schema::dropIfExists('feed_inventory');
        Schema::dropIfExists('feed_types');
    }
};

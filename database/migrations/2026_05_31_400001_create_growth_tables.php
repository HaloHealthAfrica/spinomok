<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Weight measurements for all animal types (includes BCS)
        Schema::create('animal_weight_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignUuid('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->date('measured_on');
            $table->decimal('weight_kg', 7, 2);
            $table->decimal('body_condition_score', 3, 1)->nullable(); // 1.0–5.0
            $table->string('method', 60)->nullable(); // scale|weigh_tape|estimate
            $table->smallInteger('age_days')->nullable(); // computed
            $table->decimal('adg_kg_day', 5, 3)->nullable(); // computed since last record
            $table->uuid('recorded_by')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->index(['animal_id', 'measured_on']);
            $table->index(['farm_id', 'measured_on']);
        });

        // Calf feeding records (milk, pellets, hay, water per session)
        Schema::create('calf_feeding_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignUuid('animal_id')->constrained('animals')->cascadeOnDelete(); // calf
            $table->date('fed_on');
            $table->string('session', 10)->nullable(); // morning|midday|evening
            $table->string('feed_type', 40); // whole_milk|milk_replacer|starter_pellets|hay|water|other
            $table->decimal('quantity', 8, 3);
            $table->string('unit', 20)->default('litres'); // litres|kg|g
            $table->uuid('milk_source_animal_id')->nullable(); // cow supplying the milk
            $table->decimal('cost', 8, 2)->nullable();
            $table->uuid('fed_by')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['animal_id', 'fed_on']);
            $table->index(['farm_id', 'fed_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calf_feeding_records');
        Schema::dropIfExists('animal_weight_records');
    }
};

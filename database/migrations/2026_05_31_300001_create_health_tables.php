<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Master disease catalog
        Schema::create('disease_types', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 120)->unique();
            $table->string('category', 80)->nullable(); // Metabolic|Infectious|Parasitic|Reproductive|Other
            $table->text('common_signs')->nullable();
            $table->boolean('is_notifiable')->default(false); // Govt-notifiable disease
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Master drug/medication catalog
        Schema::create('medication_types', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 150)->unique();
            $table->string('active_ingredient', 150)->nullable();
            $table->string('category', 80)->nullable(); // Antibiotic|NSAID|Antiparasitic|Vaccine|Mineral|Other
            $table->string('unit_of_measure', 30)->default('ml'); // ml|tablet|g|IU
            $table->smallInteger('withdrawal_period_days')->default(0);
            $table->smallInteger('meat_withdrawal_days')->default(0);
            $table->boolean('requires_prescription')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Health observation/event records per animal
        Schema::create('health_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignUuid('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->uuid('disease_type_id')->nullable();
            $table->date('observed_on');
            $table->uuid('reported_by')->nullable();
            $table->text('symptoms')->nullable();
            $table->string('severity', 20)->default('moderate'); // mild|moderate|severe
            $table->boolean('is_recovered')->default(false);
            $table->date('recovery_date')->nullable();
            $table->string('outcome', 40)->nullable(); // recovered|culled|died|ongoing
            $table->boolean('vet_consulted')->default(false);
            $table->string('vet_name', 120)->nullable();
            $table->decimal('consultation_cost', 10, 2)->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['farm_id', 'observed_on']);
            $table->index(['animal_id', 'observed_on']);
            $table->index('disease_type_id');
        });

        // Drug treatment records linked to health events
        Schema::create('treatments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignUuid('health_event_id')->constrained('health_events')->cascadeOnDelete();
            $table->foreignUuid('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->uuid('medication_type_id')->nullable();
            $table->date('treated_on');
            $table->decimal('dose_amount', 8, 3);
            $table->string('dose_unit', 20)->default('ml'); // ml|tablet|g
            $table->string('route', 40)->default('IM'); // IM|IV|SC|oral|topical|IMM
            $table->string('frequency', 40)->nullable(); // SID|BID|TID
            $table->smallInteger('duration_days')->nullable();
            $table->date('withdrawal_end_date')->nullable(); // computed from drug + treated_on
            $table->decimal('cost', 10, 2)->nullable();
            $table->uuid('administered_by')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('health_event_id');
            $table->index(['animal_id', 'treated_on']);
            $table->index(['farm_id', 'withdrawal_end_date']);
        });

        // On-farm drug/medicine inventory
        Schema::create('drug_inventory', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->uuid('medication_type_id')->nullable();
            $table->string('product_name', 150); // trade name may differ
            $table->decimal('quantity_on_hand', 10, 3)->default(0);
            $table->string('unit_of_measure', 30)->default('ml');
            $table->decimal('reorder_level', 10, 3)->nullable();
            $table->decimal('cost_per_unit', 8, 2)->nullable();
            $table->string('supplier', 120)->nullable();
            $table->string('batch_number', 80)->nullable();
            $table->date('expiry_date')->nullable();
            $table->date('last_restocked_on')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['farm_id', 'medication_type_id']);
            $table->index(['farm_id', 'quantity_on_hand']);
        });

        // Vaccine catalog
        Schema::create('vaccine_types', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 120)->unique();
            $table->string('disease_prevented', 120)->nullable();
            $table->string('manufacturer', 120)->nullable();
            $table->smallInteger('recommended_age_weeks')->nullable();
            $table->smallInteger('booster_interval_days')->nullable();
            $table->smallInteger('withdrawal_period_days')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Vaccination records per animal
        Schema::create('vaccinations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignUuid('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->uuid('vaccine_type_id')->nullable();
            $table->date('vaccinated_on');
            $table->string('batch_number', 80)->nullable();
            $table->decimal('dose_ml', 6, 2)->nullable();
            $table->string('route', 40)->nullable(); // SC|IM|oral
            $table->string('site', 60)->nullable(); // neck|behind ear...
            $table->date('next_due_date')->nullable();
            $table->uuid('administered_by')->nullable();
            $table->decimal('cost', 10, 2)->nullable();
            $table->boolean('adverse_reaction')->default(false);
            $table->text('reaction_notes')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['farm_id', 'vaccinated_on']);
            $table->index(['animal_id', 'vaccinated_on']);
            $table->index(['farm_id', 'next_due_date']);
        });

        // Deworming records
        Schema::create('deworming_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignUuid('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->string('drug_name', 120);
            $table->string('active_ingredient', 120)->nullable();
            $table->decimal('dose_amount', 8, 3);
            $table->string('dose_unit', 20)->default('ml');
            $table->string('route', 40)->default('oral');
            $table->date('dewormed_on');
            $table->date('next_due_date')->nullable();
            $table->date('withdrawal_end_date')->nullable();
            $table->decimal('cost', 10, 2)->nullable();
            $table->uuid('administered_by')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['farm_id', 'dewormed_on']);
            $table->index(['animal_id', 'dewormed_on']);
            $table->index(['farm_id', 'next_due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deworming_records');
        Schema::dropIfExists('vaccinations');
        Schema::dropIfExists('vaccine_types');
        Schema::dropIfExists('drug_inventory');
        Schema::dropIfExists('treatments');
        Schema::dropIfExists('health_events');
        Schema::dropIfExists('medication_types');
        Schema::dropIfExists('disease_types');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Heat detection events
        Schema::create('heat_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignUuid('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->date('observed_on');
            $table->time('observed_at')->nullable();
            $table->string('detection_method', 30)->default('visual'); // visual|tail_paint|pedometer|other
            $table->string('confidence', 20)->default('certain'); // certain|probable|suspected
            $table->json('signs_observed')->nullable(); // array of sign codes
            $table->timestamp('ai_window_start')->nullable(); // observed_at + 12h
            $table->timestamp('ai_window_end')->nullable();   // observed_at + 18h
            $table->boolean('acted_on')->default(false); // AI or natural service done
            $table->uuid('observed_by')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['farm_id', 'observed_on']);
            $table->index(['animal_id', 'observed_on']);
        });

        // Semen inventory
        Schema::create('semen_inventory', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->string('bull_name', 120);
            $table->string('bull_breed', 40)->nullable();
            $table->string('batch_number', 80)->nullable();
            $table->string('supplier', 120)->nullable();
            $table->integer('straws_received')->default(0);
            $table->integer('straws_remaining')->default(0);
            $table->decimal('cost_per_straw', 8, 2)->nullable();
            $table->date('received_on');
            $table->date('expiry_date')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('farm_id');
            $table->index(['farm_id', 'straws_remaining']);
        });

        // AI services
        Schema::create('ai_services', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignUuid('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->uuid('heat_event_id')->nullable();
            $table->uuid('semen_inventory_id')->nullable();
            $table->date('service_date');
            $table->time('service_time')->nullable();
            $table->string('technician_name', 120)->nullable();
            $table->string('technician_phone', 20)->nullable();
            $table->decimal('service_cost', 10, 2)->nullable();
            $table->string('result', 30)->default('pending'); // pending|confirmed_pregnant|not_pregnant|repeat
            $table->date('conception_confirmed_on')->nullable();
            $table->date('expected_calving_date')->nullable(); // service_date + gestation days
            $table->date('expected_dry_off_date')->nullable(); // expected_calving - 60 days
            $table->integer('service_number')->default(1); // 1st, 2nd, 3rd service
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['farm_id', 'service_date']);
            $table->index(['animal_id', 'service_date']);
            $table->index(['farm_id', 'result']);
        });

        // Synchronization programs
        Schema::create('sync_programs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignUuid('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->string('program_type', 30); // Ovsynch|CIDR|Custom
            $table->string('custom_name', 100)->nullable();
            $table->date('start_date');
            $table->string('status', 20)->default('planned'); // planned|in_progress|completed|aborted
            $table->uuid('ai_service_id')->nullable(); // linked AI service on completion
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['farm_id', 'status']);
            $table->index('animal_id');
        });

        // Sync program steps
        Schema::create('sync_program_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('sync_program_id')->constrained('sync_programs')->cascadeOnDelete();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->string('event_type', 30); // GnRH_1|PGF2a|GnRH_2|CIDR_insert|CIDR_remove|TAI|custom_step
            $table->string('custom_label', 100)->nullable();
            $table->date('scheduled_on');
            $table->date('completed_on')->nullable();
            $table->string('drug_name', 120)->nullable();
            $table->decimal('dose_ml', 6, 2)->nullable();
            $table->string('route', 40)->nullable(); // IM|SC|oral
            $table->uuid('administered_by')->nullable();
            $table->boolean('is_completed')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['farm_id', 'scheduled_on']);
            $table->index('sync_program_id');
        });

        // Pregnancy checks
        Schema::create('pregnancy_checks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignUuid('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->uuid('ai_service_id')->nullable();
            $table->date('checked_on');
            $table->smallInteger('days_post_service')->nullable();
            $table->string('method', 30)->default('rectal_palpation'); // rectal_palpation|ultrasound|blood_test|visual
            $table->string('result', 20); // pregnant|not_pregnant|inconclusive
            $table->smallInteger('foetus_age_days')->nullable();
            $table->date('expected_calving_date')->nullable();
            $table->string('checked_by', 120)->nullable(); // vet name
            $table->uuid('vet_id')->nullable();
            $table->decimal('cost', 10, 2)->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['farm_id', 'checked_on']);
            $table->index(['animal_id', 'checked_on']);
        });

        // Calving records
        Schema::create('calving_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignUuid('dam_id')->constrained('animals')->cascadeOnDelete();
            $table->uuid('calf_id')->nullable(); // FK to animals — set after calf registered
            $table->uuid('breeding_record_id')->nullable(); // link to ai_services
            $table->date('calved_on');
            $table->time('calved_at')->nullable();
            $table->string('ease', 30)->default('easy'); // easy|slight_assistance|major_assistance|caesarean|abnormal
            $table->string('calf_outcome', 30)->default('alive'); // alive|stillborn|died_within_24h
            $table->string('calf_sex', 10); // male|female
            $table->string('calf_tag', 40)->nullable(); // pre-assigned tag for the calf
            $table->decimal('calf_birth_weight_kg', 6, 2)->nullable();
            $table->boolean('is_twin')->default(false);
            $table->uuid('twin_calf_id')->nullable();
            $table->boolean('placenta_passed')->nullable();
            $table->smallInteger('placenta_passed_hours')->nullable();
            $table->boolean('colostrum_given')->default(false);
            $table->timestamp('colostrum_given_at')->nullable();
            $table->text('complications')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('assisted_by')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['farm_id', 'calved_on']);
            $table->index('dam_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calving_records');
        Schema::dropIfExists('pregnancy_checks');
        Schema::dropIfExists('sync_program_events');
        Schema::dropIfExists('sync_programs');
        Schema::dropIfExists('ai_services');
        Schema::dropIfExists('semen_inventory');
        Schema::dropIfExists('heat_events');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calf_health_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('calf_record_id')->constrained('calf_records')->cascadeOnDelete();
            $table->date('event_date');
            $table->string('disease_name');
            $table->json('symptoms')->nullable();
            $table->enum('severity', ['mild', 'moderate', 'severe'])->default('mild');
            $table->text('action_taken')->nullable();
            $table->boolean('vet_called')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['calf_record_id', 'event_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calf_health_events');
    }
};

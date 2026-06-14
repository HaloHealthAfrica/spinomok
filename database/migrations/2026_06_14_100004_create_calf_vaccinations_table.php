<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calf_vaccinations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('calf_record_id')->constrained('calf_records')->cascadeOnDelete();
            $table->string('vaccine_name');
            $table->date('due_date');
            $table->date('completed_date')->nullable();
            $table->string('administered_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['calf_record_id', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calf_vaccinations');
    }
};

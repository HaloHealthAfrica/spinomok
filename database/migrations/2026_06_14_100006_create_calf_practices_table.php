<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calf_practices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('calf_record_id')->constrained('calf_records')->cascadeOnDelete();
            $table->string('practice_name');
            $table->string('due_age_label');
            $table->date('completed_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('calf_record_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calf_practices');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calf_weight_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('calf_record_id')->constrained('calf_records')->cascadeOnDelete();
            $table->date('weighed_date');
            $table->decimal('weight_kg', 6, 2);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['calf_record_id', 'weighed_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calf_weight_logs');
    }
};

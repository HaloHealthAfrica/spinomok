<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calf_feed_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('calf_record_id')->constrained('calf_records')->cascadeOnDelete();
            $table->date('log_date');
            $table->decimal('milk_litres', 5, 2)->default(0);
            $table->decimal('starter_kg', 5, 3)->default(0);
            $table->decimal('legends_grams', 6, 1)->default(0);
            $table->string('feed_type')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['calf_record_id', 'log_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calf_feed_logs');
    }
};

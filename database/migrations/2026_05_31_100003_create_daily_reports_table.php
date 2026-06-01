<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->date('report_date');
            $table->string('status', 20)->default('draft'); // draft|submitted
            // Milk summary (denormalized for fast reads)
            $table->decimal('total_milk_litres', 10, 3)->nullable();
            $table->decimal('morning_litres', 10, 3)->nullable();
            $table->decimal('midday_litres', 10, 3)->nullable();
            $table->decimal('evening_litres', 10, 3)->nullable();
            $table->smallInteger('cows_milked')->nullable();
            // Sales summary
            $table->decimal('milk_sold_litres', 10, 3)->nullable();
            $table->decimal('milk_revenue', 12, 2)->nullable();
            // Events summary
            $table->smallInteger('health_events_count')->nullable()->default(0);
            $table->smallInteger('breeding_events_count')->nullable()->default(0);
            // Feed summary
            $table->decimal('total_feed_cost', 12, 2)->nullable();
            // Notes
            $table->string('weather', 40)->nullable();
            $table->text('weather_notes')->nullable();
            $table->text('manager_notes')->nullable();
            $table->text('general_notes')->nullable();
            // Draft data (stores partial wizard state)
            $table->json('draft_data')->nullable();
            $table->integer('draft_step')->nullable();
            // Submission
            $table->uuid('submitted_by')->nullable();
            $table->timestamp('submitted_at')->nullable();
            // WhatsApp
            $table->boolean('whatsapp_sent')->default(false);
            $table->timestamp('whatsapp_sent_at')->nullable();
            // PDF
            $table->string('pdf_path', 255)->nullable();
            $table->timestamp('pdf_generated_at')->nullable();
            // Audit
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->unique(['farm_id', 'report_date']);
            $table->index(['farm_id', 'status']);
            $table->index(['farm_id', 'report_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_reports');
    }
};

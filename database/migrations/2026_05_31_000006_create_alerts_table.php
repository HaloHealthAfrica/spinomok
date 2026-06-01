<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alerts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->string('alert_type', 60);
            $table->string('severity', 10)->default('info'); // info | warning | critical
            $table->string('status', 20)->default('pending'); // pending | acknowledged | resolved | dismissed
            $table->string('title', 200);
            $table->text('message');
            $table->string('reference_table', 80)->nullable();
            $table->uuid('reference_id')->nullable();
            $table->uuid('animal_id')->nullable();
            $table->date('due_on')->nullable();
            $table->uuid('acknowledged_by')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->uuid('resolved_by')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->boolean('auto_resolved')->default(false);
            $table->timestamps();

            $table->index(['farm_id', 'status']);
            $table->index(['farm_id', 'severity']);
            $table->index(['farm_id', 'due_on']);
            $table->index('animal_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};

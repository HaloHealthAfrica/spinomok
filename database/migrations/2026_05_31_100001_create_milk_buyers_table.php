<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('milk_buyers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('buyer_type', 40)->default('direct'); // cooperative|processor|hotel|direct|home_use|calf_feeding
            $table->string('contact_name', 120)->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('email', 120)->nullable();
            $table->decimal('default_price_per_litre', 8, 2)->nullable();
            $table->smallInteger('payment_terms_days')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['farm_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('milk_buyers');
    }
};

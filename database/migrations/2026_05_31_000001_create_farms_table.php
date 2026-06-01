<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('farms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 150);
            $table->string('owner_name', 150);
            $table->string('county', 80);
            $table->string('sub_county', 80)->nullable();
            $table->string('ward', 80)->nullable();
            $table->string('registration_number', 60)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('email', 120)->nullable();
            $table->string('subscription_plan', 20)->default('free');
            $table->timestamp('subscription_expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->json('settings')->default('{}');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('farms');
    }
};

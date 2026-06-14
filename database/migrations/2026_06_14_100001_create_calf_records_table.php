<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calf_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignUuid('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->date('dob');
            $table->decimal('birth_weight_kg', 5, 2)->nullable();
            $table->string('dam_animal_id')->nullable(); // tag or name string reference
            $table->string('sex', 10)->default('Female');
            $table->text('housing_notes')->nullable();
            $table->timestamps();

            $table->unique('animal_id');
            $table->index(['farm_id', 'dob']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calf_records');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('milk_production', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignUuid('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->date('milked_on');
            $table->string('session', 10); // morning | midday | evening
            $table->decimal('quantity_litres', 8, 3)->default(0);
            $table->decimal('fat_percentage', 4, 2)->nullable();
            $table->decimal('protein_percentage', 4, 2)->nullable();
            $table->integer('somatic_cell_count')->nullable();
            $table->uuid('milked_by')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_colostrum')->default(false);
            $table->boolean('is_withheld')->default(false);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['farm_id', 'animal_id', 'milked_on', 'session']);
            $table->index(['farm_id', 'milked_on']);
            $table->index(['animal_id', 'milked_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('milk_production');
    }
};

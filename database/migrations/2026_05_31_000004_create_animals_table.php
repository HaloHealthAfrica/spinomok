<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('animals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->string('tag_number', 40);
            $table->string('name', 80)->nullable();
            $table->string('sex', 10); // male | female
            $table->string('status', 20)->default('calf');
            $table->string('breed', 30)->default('Crossbreed');
            $table->date('birth_date')->nullable();
            $table->date('date_acquired')->nullable();
            $table->decimal('acquisition_cost', 12, 2)->nullable();
            $table->string('acquisition_source', 120)->nullable();
            // Nullable UUIDs for self-referencing (added as regular columns)
            $table->uuid('sire_id')->nullable();
            $table->uuid('dam_id')->nullable();
            // Pregnancy
            $table->boolean('is_pregnant')->default(false);
            $table->date('expected_calving_date')->nullable();
            $table->date('last_calving_date')->nullable();
            $table->smallInteger('parity')->default(0);
            // Physical
            $table->decimal('weight_kg', 7, 2)->nullable();
            $table->string('photo_url', 255)->nullable();
            $table->text('notes')->nullable();
            // Audit
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['farm_id', 'tag_number']);
            $table->index(['farm_id', 'status']);
            $table->index(['farm_id', 'sex']);
            $table->index('dam_id');
            $table->index('sire_id');
            $table->index('is_pregnant');
        });

        // Self-referencing FKs (added after table creation)
        Schema::table('animals', function (Blueprint $table) {
            $table->foreign('sire_id')->references('id')->on('animals')->nullOnDelete();
            $table->foreign('dam_id')->references('id')->on('animals')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('animals');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('semen_inventory', function (Blueprint $table) {
            $table->string('semen_type', 20)->default('conventional')->after('bull_breed'); // conventional|sexed
            $table->string('inseminator', 120)->nullable()->after('semen_type');
        });
    }

    public function down(): void
    {
        Schema::table('semen_inventory', function (Blueprint $table) {
            $table->dropColumn(['semen_type', 'inseminator']);
        });
    }
};

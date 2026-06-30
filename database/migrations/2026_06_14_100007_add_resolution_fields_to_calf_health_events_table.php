<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('calf_health_events', function (Blueprint $table) {
            $table->boolean('is_resolved')->default(false)->after('vet_called');
            $table->date('resolved_on')->nullable()->after('is_resolved');
            $table->string('outcome', 40)->nullable()->after('resolved_on');
        });
    }

    public function down(): void
    {
        Schema::table('calf_health_events', function (Blueprint $table) {
            $table->dropColumn(['is_resolved', 'resolved_on', 'outcome']);
        });
    }
};

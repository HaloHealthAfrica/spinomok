<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fix: sessions.user_id was BIGINT (Laravel default foreignId) but
 * users.id is UUID. PostgreSQL rejects UUID values in a BIGINT column
 * with SQLSTATE 22P02, causing 500 on every login.
 *
 * This migration converts the column type to uuid (nullable).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        // PostgreSQL ALTER COLUMN requires explicit CAST
        DB::statement('ALTER TABLE sessions ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE sessions ALTER COLUMN user_id TYPE bigint USING NULL');
    }
};

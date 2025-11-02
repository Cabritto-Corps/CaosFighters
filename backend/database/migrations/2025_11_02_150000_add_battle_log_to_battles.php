<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add battle_log column to battles table if it doesn't exist
        if (Schema::hasTable('battles') && !Schema::hasColumn('battles', 'battle_log')) {
            Schema::table('battles', function (Blueprint $table) {
                $table->jsonb('battle_log')
                    ->default(DB::raw("'[]'::jsonb"))
                    ->nullable()
                    ->after('character2_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('battles') && Schema::hasColumn('battles', 'battle_log')) {
            Schema::table('battles', function (Blueprint $table) {
                $table->dropColumn('battle_log');
            });
        }
    }
};

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
        // Add min_status and max_status to tiers
        if (!Schema::hasColumn('tiers', 'min_status')) {
            Schema::table('tiers', function (Blueprint $table) {
                $table->jsonb('min_status')
                    ->default(DB::raw("'{\"hp\": 50, \"agility\": 30, \"defense\": 30, \"strength\": 30}'::jsonb"))
                    ->after('description');
                $table->jsonb('max_status')
                    ->default(DB::raw("'{\"hp\": 150, \"agility\": 150, \"defense\": 150, \"strength\": 150}'::jsonb"))
                    ->after('min_status');
            });
        }

        // Add status to character_user
        if (!Schema::hasColumn('character_user', 'status')) {
            Schema::table('character_user', function (Blueprint $table) {
                $table->jsonb('status')
                    ->default(DB::raw("'{\"hp\": 100, \"agility\": 100, \"defense\": 100, \"strength\": 100}'::jsonb"))
                    ->after('character_id');
            });
        }

        // Remove status from characters if it exists
        if (Schema::hasColumn('characters', 'status')) {
            Schema::table('characters', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }

        // Drop character_moves table if it exists
        if (Schema::hasTable('character_moves')) {
            Schema::drop('character_moves');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Add status back to characters
        if (!Schema::hasColumn('characters', 'status')) {
            Schema::table('characters', function (Blueprint $table) {
                $table->jsonb('status')
                    ->default(DB::raw("'{\"hp\": 100, \"agility\": 100, \"defense\": 100, \"strength\": 100}'::jsonb"));
            });
        }

        // Remove status from character_user
        if (Schema::hasColumn('character_user', 'status')) {
            Schema::table('character_user', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }

        // Remove min_status and max_status from tiers
        if (Schema::hasColumn('tiers', 'min_status')) {
            Schema::table('tiers', function (Blueprint $table) {
                $table->dropColumn(['min_status', 'max_status']);
            });
        }

        // Recreate character_moves table
        Schema::create('character_moves', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('character_id');
            $table->uuid('move_id');
            $table->integer('move_slot')->check('move_slot >= 1 AND move_slot <= 4');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('character_id')->references('id')->on('characters');
            $table->foreign('move_id')->references('id')->on('moves');
        });
    }
};

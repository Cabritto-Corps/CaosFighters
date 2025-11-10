<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add points_awarded column to battles table if it doesn't exist
        if (Schema::hasTable('battles') && !Schema::hasColumn('battles', 'points_awarded')) {
            Schema::table('battles', function (Blueprint $table) {
                $table->integer('points_awarded')
                    ->nullable()
                    ->after('winner_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('battles') && Schema::hasColumn('battles', 'points_awarded')) {
            Schema::table('battles', function (Blueprint $table) {
                $table->dropColumn('points_awarded');
            });
        }
    }
};


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
        Schema::table('battles', function (Blueprint $table) {
            $table->jsonb('player1_pending_attack')->nullable()->after('battle_log');
            $table->jsonb('player2_pending_attack')->nullable()->after('player1_pending_attack');
            $table->integer('current_turn_round')->default(0)->after('player2_pending_attack');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('battles', function (Blueprint $table) {
            $table->dropColumn(['player1_pending_attack', 'player2_pending_attack', 'current_turn_round']);
        });
    }
};


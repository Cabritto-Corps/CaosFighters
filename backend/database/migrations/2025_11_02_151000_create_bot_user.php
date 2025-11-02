<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create a bot user for battles against AI opponents
        // Using a fixed UUID for consistency
        $botUserId = '00000000-0000-0000-0000-000000000001';

        // Check if bot user already exists
        $exists = DB::table('users')->where('id', $botUserId)->exists();

        if (!$exists) {
            DB::table('users')->insert([
                'id' => $botUserId,
                'name' => 'Bot Opponent',
                'email' => 'bot@caos-fighters.local',
                'password' => bcrypt('bot-password-' . time()),
                'points' => 0,
                'status' => 'active',
                'created_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('users')->where('id', '00000000-0000-0000-0000-000000000001')->delete();
    }
};

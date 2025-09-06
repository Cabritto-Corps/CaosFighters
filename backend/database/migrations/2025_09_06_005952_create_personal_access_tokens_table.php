<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * This will drop the existing 'personal_access_tokens' table and create a new one
     * with UUIDs for the primary key and the polymorphic relationship.
     */
    public function up(): void
    {
        Schema::dropIfExists('personal_access_tokens');

        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('tokenable_type');
            $table->uuid('tokenable_id');
            $table->string('name'); // Using string for VARCHAR(255) is conventional for names
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();

            $table->index(['tokenable_type', 'tokenable_id']);
        });
    }

    /**
     * Reverse the migrations.
     * This will drop the 'personal_access_tokens' table.
     */
    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};

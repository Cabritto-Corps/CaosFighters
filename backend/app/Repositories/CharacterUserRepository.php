<?php

namespace App\Repositories;

use App\Models\CharacterUser;

class CharacterUserRepository
{
    /**
     * Create a character assignment for a user
     */
    public function createAssignment(array $data): CharacterUser
    {
        return CharacterUser::create($data);
    }

    /**
     * Get user's current character assignment
     */
    public function getUserCharacter(string $userId): ?CharacterUser
    {
        return CharacterUser::with(['character.tier', 'user'])
            ->where('user_id', $userId)
            ->latest('created_at')
            ->first();
    }

    /**
     * Get character assignment by ID
     */
    public function getAssignmentById(string $characterUserId): ?CharacterUser
    {
        return CharacterUser::with(['character', 'user'])
            ->find($characterUserId);
    }

    /**
     * Update character assignment
     */
    public function updateAssignment(CharacterUser $characterUser, array $data): CharacterUser
    {
        $characterUser->update($data);
        return $characterUser;
    }

    /**
     * Get character assignment by character ID (for battle logic)
     */
    public function getAssignmentByCharacterId(string $characterId): ?CharacterUser
    {
        return CharacterUser::where('character_id', $characterId)->first();
    }
}

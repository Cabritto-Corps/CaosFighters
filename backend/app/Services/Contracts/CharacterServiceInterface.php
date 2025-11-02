<?php

namespace App\Services\Contracts;

interface CharacterServiceInterface
{
    /**
     * Get a random character with randomized stats
     */
    public function getRandomCharacter(): array;

    /**
     * Get a user's current assigned character
     */
    public function getUserCurrentCharacter(string $userId): array;

    /**
     * Assign a random character to a user
     */
    public function assignRandomCharacterToUser(string $userId): array;

    /**
     * Regenerate a character for a user with new random stats
     */
    public function regenerateCharacterForUser(string $userId): array;
}

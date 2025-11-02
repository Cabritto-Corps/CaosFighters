<?php

namespace App\Repositories;

use App\Models\Character;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\Paginator;

class CharacterRepository
{
    /**
     * Get a random character with relationships
     */
    public function getRandomCharacter(): ?Character
    {
        return Character::with('tier')
            ->inRandomOrder()
            ->first();
    }

    /**
     * Get a character by ID with relationships
     */
    public function getCharacterById(string $characterId): ?Character
    {
        return Character::with('tier')->find($characterId);
    }

    /**
     * Get characters paginated with filters
     */
    public function getPaginatedCharacters(array $filters = []): Paginator
    {
        $query = Character::with('tier');

        // Filter by tier_id
        if (!empty($filters['tier_id'])) {
            $query->where('tier_id', $filters['tier_id']);
        }

        // Filter by name (case-insensitive search)
        if (!empty($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }

        // Filter by status (JSONB contains)
        if (!empty($filters['status'])) {
            $query->whereJsonContains('status', $filters['status']);
        }

        // Order by
        $orderBy = $filters['order_by'] ?? 'name';
        $orderDirection = $filters['order_direction'] ?? 'asc';

        if (in_array($orderBy, ['name', 'created_at', 'tier_id'])) {
            $query->orderBy($orderBy, $orderDirection);
        }

        // Pagination
        $perPage = min($filters['per_page'] ?? 15, 100);
        return $query->paginate($perPage);
    }

    /**
     * Get characters by tier ID
     */
    public function getCharactersByTierId(int $tierId): Collection
    {
        return Character::with('tier')
            ->where('tier_id', $tierId)
            ->orderBy('name')
            ->get();
    }
}

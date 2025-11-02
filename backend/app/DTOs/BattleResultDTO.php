<?php

namespace App\DTOs;

class BattleResultDTO
{
    public function __construct(
        public readonly string $battleId,
        public readonly string $winnerId,
        public readonly int $pointsAwarded,
        public readonly int $duration
    ) {
    }

    public function toArray(): array
    {
        return [
            'battle_id' => $this->battleId,
            'winner_id' => $this->winnerId,
            'points_awarded' => $this->pointsAwarded,
            'duration' => $this->duration,
        ];
    }
}

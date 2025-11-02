<?php

namespace App\DTOs;

class BattleDataDTO
{
    public function __construct(
        public readonly string $battleId,
        public readonly CharacterDataDTO $playerCharacter,
        public readonly CharacterDataDTO $botCharacter,
        public readonly string $turn = 'player'
    ) {
    }

    public function toArray(): array
    {
        return [
            'battle_id' => $this->battleId,
            'player_character' => $this->playerCharacter->toArray(),
            'bot_character' => $this->botCharacter->toArray(),
            'turn' => $this->turn,
        ];
    }
}

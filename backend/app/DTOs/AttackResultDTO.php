<?php

namespace App\DTOs;

class AttackResultDTO
{
    public function __construct(
        public readonly bool $hit,
        public readonly int $damage,
        public readonly string $nextTurn,
        public readonly string $message
    ) {
    }

    public function toArray(): array
    {
        return [
            'hit' => $this->hit,
            'damage' => $this->damage,
            'turn' => $this->nextTurn,
            'message' => $this->message,
        ];
    }
}

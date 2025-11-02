<?php

namespace App\DTOs;

class CharacterDataDTO
{
    public function __construct(
        public readonly string $characterUserId,
        public readonly string $characterId,
        public readonly string $characterName,
        public readonly ?string $formId,
        public readonly string $imageUrl,
        public readonly array $tier,
        public readonly array $status,
        public readonly array $moves
    ) {
    }

    public function toArray(): array
    {
        return [
            'character_user_id' => $this->characterUserId,
            'character' => [
                'id' => $this->characterId,
                'name' => $this->characterName,
                'form_id' => $this->formId,
                'image_url' => $this->imageUrl,
                'tier' => $this->tier,
            ],
            'status' => $this->status,
            'moves' => $this->moves,
        ];
    }
}

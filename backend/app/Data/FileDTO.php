<?php

namespace App\Data;
use Spatie\LaravelData\Data;

class FileDTO extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly string $path,
        public readonly int $size,
        public readonly string $mime_type
    ) {}

    public function setName(string $name): void
    {
        $this->name = $name;
    }
}

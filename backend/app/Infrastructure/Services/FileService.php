<?php

namespace App\Infrastructure\Services;

use App\Data\FileDTO;

interface FileService
{
    public function get(FileDTO $file): string;
    public function store(string $filepath, FileDTO $file): void;
}

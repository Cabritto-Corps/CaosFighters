<?php

namespace App\Data\Output;

use App\Domain\Entities\User;
use App\Domain\Enums\Role;
use Spatie\LaravelData\Data;

class RegisterOutputData extends Data
{
    public function __construct(
        public readonly User $user,
    ) {}
}

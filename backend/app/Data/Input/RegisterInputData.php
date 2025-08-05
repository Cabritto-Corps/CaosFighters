<?php

namespace App\Data\Input;

use App\Domain\Enums\Role;
use Spatie\LaravelData\Data;

class RegisterInputData extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly string $email,
        public readonly string $password,
        public readonly string $confirm_password,
        public readonly Role $role,
        /**
         * @var FileDTO[]|null
         */
        public readonly ?array $pictures = null,
    ) {}
}

<?php

namespace App\Domain\Entities;

use App\Domain\Enums\Role;
use App\Helper\Crypto;
use App\Util\UUID;

class User
{
    public function __construct(
        private string $id,
        private string $name,
        private string $email,
        private string $password,
        private Role $role,
        private bool $has_pictures,
    ) {}

    public static function create(
        string $name,
        string $email,
        string $password,
        Role $role,
        ?bool $has_pictures = null,
        ?string $id = null
    ): User {
        return new self(
            id: $id ??= UUID::v7(),
            name: $name,
            email: $email,
            password: $password,
            role: $role,
            has_pictures: $has_pictures ?? false
        );
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function getPassword(): string
    {
        return $this->password;
    }

    public function getRole(): Role
    {
        return $this->role;
    }

    public function getHasPictures(): bool
    {
        return $this->has_pictures;
    }

    public function passwordMatches(string $password): bool
    {
        return Crypto::encrypt($password) === $this->password;
    }
}

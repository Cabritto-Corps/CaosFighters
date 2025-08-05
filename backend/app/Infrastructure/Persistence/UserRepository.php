<?php

namespace App\Infrastructure\Persistence;

use App\Domain\Entities\User;

interface UserRepository
{
    public function findByToken(string $token): ?User;
    public function findByEmail(string $email): ?User;
    public function save(User $user): void;
}

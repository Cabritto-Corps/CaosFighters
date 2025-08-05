<?php

namespace App\Infrastructure\Persistence\InMemory;

use App\Domain\Entities\User;
use App\Infrastructure\Persistence\InMemory\InMemory;
use App\Infrastructure\Persistence\UserRepository;

class InMemoryUser implements UserRepository
{
    /** @var User[] */
    private array $data = [];

    public function findByToken(string $token): ?User
    {
        /** @var ?User */
        $user = InMemory::findBy('token', $token, $this->data);
        return $user;
    }

    public function findByEmail(string $email): ?User
    {
        /** @var ?User */
        $user = InMemory::findBy('email', $email, $this->data);
        return $user;
    }

    public function save(User $user): void
    {
        $this->data = InMemory::persist($this->data, $user);
    }
}

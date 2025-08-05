<?php

namespace App\Infrastructure\Persistence\Facades;

use App\Domain\Entities\User;
use App\Infrastructure\Persistence\UserRepository;
use Illuminate\Support\Facades\DB;

class FacadesUserRepository implements UserRepository
{
    private function map(object $data): User
    {
        return User::create(
            id: $data->id,
            name: $data->name,
            email: $data->email,
            password: $data->password,
            role: $data->role,
            has_pictures: $data->has_pictures
        );
    }
    public function findByToken(string $token): ?User
    {
        $data = DB::table('users')->where('token', $token)->first();
        return $data ? $this->map($data) : null;
    }
    public function findByEmail(string $email): ?User
    {
        $data = DB::table('users')->where('email', $email)->first();
        return $data ? $this->map($data) : null;

    }
    public function save(User $user): void
    {
        DB::table('users')->updateOrInsert(
            ['id' => $user->getId()],
            [
                'name' => $user->getName(),
                'email' => $user->getEmail(),
                'password' => $user->getPassword(),
                'role' => $user->getRole(),
                'has_pictures' => $user->getHasPictures(),
            ]
        );
    }
}

<?php

namespace Database\Seeders;

use App\Domain\Entities\User;
use App\Domain\Enums\Role;
use App\Infrastructure\Persistence\UserRepository;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function __construct(
        private UserRepository $userRepository
    ) {}
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user_list = [];

        $user_list[] = User::create(
            id: '4e600fae-8e69-4a42-80ef-5784d3c1ec36',
            name: 'Root User',
            email: 'root@localhost.com',
            password: 'eyJpdiI6Iiswd',
            role: Role::ADMIN,
            has_pictures: true
        );

        $user_list[] = User::create(
            id: '33ddfae1-c044-4279-b038-072a6a130d7d',
            name: 'Administrador User',
            email: 'admin@localhost.com',
            password: '123yJsapdiI6IiKmn',
            role: Role::USER
        );

        foreach ($user_list as $account) {
            $this->userRepository->save($account);
        }
    }
}

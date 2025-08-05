<?php

namespace App\UseCases;

use App\Data\Input\RegisterInputData;
use App\Data\Output\RegisterOutputData;
use App\Domain\Entities\User;
use App\Helper\Crypto;
use App\Infrastructure\Persistence\UserRepository;
use App\Infrastructure\Services\FileService;

class Register
{
    public function __construct(
        private UserRepository $userRepository,
        private FileService $fileService
    ) {}

    private function pathName($user_id, $name)
    {
        return sprintf("%s/%s", $user_id, $name);
    }

    public function execute(RegisterInputData $input): RegisterOutputData
    {
        if ($input->password !== $input->confirm_password) {
            throw new \InvalidArgumentException('Passwords do not match.');
        }

        $alreadyExists = $this->userRepository->findByEmail($input->email);
        if ($alreadyExists) {
            throw new \InvalidArgumentException('Email already registered.');
        }

        $password_encrypted = Crypto::encrypt($input->password);

        $user = User::create(
            name: $input->name,
            email: $input->email,
            password: $password_encrypted,
            role: $input->role,
            has_pictures: !empty($input->pictures),
        );

        $has_pictures = !empty($input->pictures);
        if ($has_pictures) {
            foreach ($input->pictures as $picture) {
                $new_pathname = $this->pathName($user->getId(), $picture->name);
                $picture->setName($new_pathname);
                $this->fileService->store(
                    filepath: $picture->path,
                    file: $picture
                );
            }
        }

        $this->userRepository->save($user);

        $output = RegisterOutputData::validateAndCreate(
            [
                'user' => $user
            ]
        );

        return $output;
    }
}

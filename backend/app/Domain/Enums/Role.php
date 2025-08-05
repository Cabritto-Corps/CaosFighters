<?php

namespace App\Domain\Enums;

enum Role: string
{
    case USER = 'user';
    case ADMIN = 'admin';
}

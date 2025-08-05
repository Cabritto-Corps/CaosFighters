<?php

namespace App\Helper;

use Illuminate\Support\Facades\Crypt;

class Crypto
{
    public static function encrypt(string $plain): string
    {
        return Crypt::encryptString($plain);
    }

    public static function decrypt(string $encrypted): string
    {
        return Crypt::decryptString($encrypted);
    }
}

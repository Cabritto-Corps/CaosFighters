<?php

namespace App\Util;

use Ramsey\Uuid\Uuid as RamseyUuid;

class UUID
{
    public static function v7(): string
    {
        return RamseyUuid::uuid7()->toString();
    }

    public static function v4(): string
    {
        return RamseyUuid::uuid4()->toString();
    }
}

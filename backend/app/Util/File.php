<?php

namespace App\Util;

class File
{
    public static function customFileName($custom, $original)
    {
        $file_extension = pathinfo($original, PATHINFO_EXTENSION);
        return sprintf('%s.%s', $custom, $file_extension);
    }
}

<?php

namespace App\Infrastructure\Persistence\InMemory;

class InMemory
{
    public static function persist(array $database, $target)
    {
        $found = array_filter($database, function ($item) use ($target) {
            return $item->getId() === $target->getId();
        });
        if (count($found) === 0) {
            $database[] = $target;
        } else {
            $key = array_search($found, array_column($database, 'id'));
            $database[$key] = $target;
        }

        return $database;
    }

    public static function findBy(string $key, string $value, array $database): object|null
    {
        $key_parts = preg_split('/(?<=[a-z])(?=[A-Z])/x', $key);
        $field_name = 'get' . implode('', array_map('ucfirst', $key_parts));


        $found = array_filter($database, function ($item) use ($value, $field_name) {
            return $item->$field_name() === $value;
        });

        return count($found) > 0 ? reset($found) : null;
    }
}

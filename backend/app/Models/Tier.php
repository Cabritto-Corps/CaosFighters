<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property string|null $description
 * @property array $min_status
 * @property array $max_status
 * @property \Carbon\Carbon $created_at
 *
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Character> $characters
 */
class Tier extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'tiers';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'description',
        'min_status',
        'max_status',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'min_status' => 'array',
            'max_status' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Get the characters for the tier.
     */
    public function characters(): HasMany
    {
        return $this->hasMany(Character::class);
    }
}

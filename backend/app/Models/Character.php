<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property int $tier_id
 * @property string $name
 * @property array $status
 * @property \Carbon\Carbon $created_at
 * 
 * @property-read \App\Models\Tier $tier
 */
class Character extends Model
{
    use HasFactory, HasUuids;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'characters';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tier_id',
        'name',
        'status',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Get the tier that owns the character.
     */
    public function tier(): BelongsTo
    {
        return $this->belongsTo(Tier::class);
    }
}

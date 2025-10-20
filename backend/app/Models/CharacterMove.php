<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $character_id
 * @property string $move_id
 * @property int $move_slot
 * @property \Carbon\Carbon $created_at
 * 
 * @property-read \App\Models\Character $character
 * @property-read \App\Models\Move $move
 */
class CharacterMove extends Model
{
    use HasFactory, HasUuids;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'character_moves';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'character_id',
        'move_id',
        'move_slot',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'move_slot' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Get the character that owns the move.
     */
    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }

    /**
     * Get the move.
     */
    public function move(): BelongsTo
    {
        return $this->belongsTo(Move::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

/**
 * @property string $id
 * @property string $player1_id
 * @property string $player2_id
 * @property string $character1_id
 * @property string $character2_id
 * @property string|null $winner_id
 * @property array|null $battle_log
 * @property string|null $duration
 * @property \Carbon\Carbon $battle_timestamp
 * @property \Carbon\Carbon $created_at
 *
 * @property-read \App\Models\User $player1
 * @property-read \App\Models\User $player2
 * @property-read \App\Models\Character $character1
 * @property-read \App\Models\Character $character2
 * @property-read \App\Models\User|null $winner
 */
class Battle extends Model
{
    use HasFactory, HasUuids;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'battles';

    /**
     * The name of the "created at" column.
     */
    public const CREATED_AT = 'created_at';

    /**
     * The name of the "updated at" column.
     * Battles don't have updated_at.
     */
    public const UPDATED_AT = null;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'player1_id',
        'player2_id',
        'character1_id',
        'character2_id',
        'winner_id',
        'battle_log',
        'duration',
        'battle_timestamp',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'battle_log' => 'array',
            'battle_timestamp' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Get player 1 user.
     */
    public function player1(): BelongsTo
    {
        return $this->belongsTo(User::class, 'player1_id');
    }

    /**
     * Get player 2 user.
     */
    public function player2(): BelongsTo
    {
        return $this->belongsTo(User::class, 'player2_id');
    }

    /**
     * Get character 1.
     */
    public function character1(): BelongsTo
    {
        return $this->belongsTo(Character::class, 'character1_id');
    }

    /**
     * Get character 2.
     */
    public function character2(): BelongsTo
    {
        return $this->belongsTo(Character::class, 'character2_id');
    }

    /**
     * Get the winner user.
     */
    public function winner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'winner_id');
    }
}

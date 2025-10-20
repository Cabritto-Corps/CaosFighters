<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

/**
 * @property string $id
 * @property string $user_id
 * @property string $character_id
 * @property array $moves
 * @property string $assigned_date
 * @property \Carbon\Carbon $created_at
 * 
 * @property-read \App\Models\User $user
 * @property-read \App\Models\Character $character
 */
class CharacterUser extends Model
{
    use HasFactory, HasUuids;

    /**
     * Character assignment duration in hours
     */
    private const ASSIGNMENT_DURATION_HOURS = 12;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'character_user';

    /**
     * The name of the "created at" column.
     */
    public const CREATED_AT = 'created_at';

    /**
     * The name of the "updated at" column.
     * Set to null to disable updated_at since the table doesn't have this column.
     */
    public const UPDATED_AT = null;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'character_id',
        'moves',
        'assigned_date',
        'created_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'moves' => 'array',
            'assigned_date' => 'date',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Get the user that owns the character assignment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the character that is assigned to the user.
     */
    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }

    /**
     * Get the expiration time (12 hours after created_at).
     */
    public function getExpiresAtAttribute(): Carbon
    {
        return Carbon::parse($this->created_at)->addHours(self::ASSIGNMENT_DURATION_HOURS);
    }

    /**
     * Check if the character assignment has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if the character assignment is still valid.
     */
    public function isValid(): bool
    {
        return !$this->isExpired();
    }
}

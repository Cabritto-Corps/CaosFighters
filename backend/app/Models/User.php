<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Laravel\Sanctum\NewAccessToken;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property string $id
 * @property string $name
 * @property string $email
 * @property int $points
 * @property int|null $ranking
 * @property string $status
 * @property string|null $expo_push_token
 * @property bool $proximity_notifications_enabled
 * @property \Carbon\Carbon $created_at
 * 
 * @method NewAccessToken createToken(string $name, array $abilities = ['*'], \DateTimeInterface|null $expiresAt = null)
 * @method \Laravel\Sanctum\PersonalAccessToken currentAccessToken()
 */
class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'points',
        'ranking',
        'status',
        'expo_push_token',
        'proximity_notifications_enabled',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'points' => 'integer',
            'ranking' => 'integer',
            'proximity_notifications_enabled' => 'boolean',
        ];
    }

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * Get all character assignments for the user.
     */
    public function characterAssignments(): HasMany
    {
        return $this->hasMany(CharacterUser::class);
    }

    /**
     * Get the user's current character assignment.
     */
    public function currentCharacter(): HasOne
    {
        return $this->hasOne(CharacterUser::class)->latest('created_at');
    }
}

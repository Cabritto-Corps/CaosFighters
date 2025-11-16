<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MatchFound implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $userId;
    public array $battleData;

    /**
     * Create a new event instance.
     */
    public function __construct(string $userId, array $battleData)
    {
        $this->userId = $userId;
        $this->battleData = $battleData;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        // Use a private channel so Pusher/Reverb will treat this as an authenticated channel.
        // Client subscribes to "private-user.{userId}" which maps to PrivateChannel('user.{userId}').
        return [
            new PrivateChannel('user.' . $this->userId),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'match.found';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'type' => 'match_found',
            'data' => $this->battleData,
            'battle_id' => $this->battleData['battle_id'] ?? null,
        ];
    }
}

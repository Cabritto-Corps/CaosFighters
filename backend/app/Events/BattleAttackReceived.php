<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BattleAttackReceived implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $battleId;
    public string $targetUserId;
    public array $attackData;

    /**
     * Create a new event instance.
     */
    public function __construct(string $battleId, string $targetUserId, array $attackData)
    {
        $this->battleId = $battleId;
        $this->targetUserId = $targetUserId;
        $this->attackData = $attackData;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        // Private battle channel; clients subscribe to "private-battle.{battleId}"
        // which maps to PrivateChannel('battle.{battleId}').
        return [
            new PrivateChannel('battle.' . $this->battleId),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'battle.attack';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'type' => 'battle_attack',
            'data' => $this->attackData,
            'battle_id' => $this->battleId,
        ];
    }
}


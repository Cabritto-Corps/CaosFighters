<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BattleAttackReceived implements ShouldBroadcast
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
        return [
            new Channel('private-battle.' . $this->battleId),
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


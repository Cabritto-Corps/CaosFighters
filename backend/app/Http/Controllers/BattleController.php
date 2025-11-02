<?php

namespace App\Http\Controllers;

use App\Services\BattleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BattleController extends Controller
{
    protected BattleService $battleService;

    public function __construct(BattleService $battleService)
    {
        $this->battleService = $battleService;
    }

    /**
     * Start a new battle
     * POST /api/battles/start
     */
    public function start(Request $request)
    {
        $validated = $request->validate([
            'character_user_id' => 'required|uuid',
        ]);

        $userId = Auth::id();

        $result = $this->battleService->startBattle(
            $userId,
            $validated['character_user_id']
        );

        return response()->json($result, $result['success'] ? 200 : 400);
    }

    /**
     * Execute an attack in a battle
     * POST /api/battles/{battleId}/attack
     */
    public function attack(Request $request, string $battleId)
    {
        $validated = $request->validate([
            'move_id' => 'required|uuid',
        ]);

        $userId = Auth::id();

        $result = $this->battleService->executeAttack(
            $battleId,
            $userId,
            $validated['move_id']
        );

        return response()->json($result, $result['success'] ? 200 : 400);
    }

    /**
     * End a battle
     * POST /api/battles/{battleId}/end
     */
    public function end(Request $request, string $battleId)
    {
        $validated = $request->validate([
            'winner_id' => 'required|uuid',
        ]);

        $result = $this->battleService->endBattle(
            $battleId,
            $validated['winner_id']
        );

        return response()->json($result, $result['success'] ? 200 : 400);
    }
}

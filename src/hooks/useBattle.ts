import { useCallback, useState } from 'react'
import { apiService } from '../services/api'
import type { UserCharacter, CharacterMove } from '../types/character'
import type { BattleStartResponse, BattleAttackResponse, BattleResultsResponse } from '../types/battle'

interface BattleCharacter {
    characterUserId?: string
    character: UserCharacter['character']
    status: UserCharacter['status']
    moves: CharacterMove[]
    currentHp: number
    maxHp: number
}

export interface UseBattleReturn {
    // State
    battleId: string | null
    playerCharacter: BattleCharacter | null
    enemyCharacter: BattleCharacter | null
    currentTurn: 'player' | 'enemy' | null
    isLoading: boolean
    error: string | null
    battleEnded: boolean
    winner: 'player' | 'enemy' | null

    // Actions
    startBattle: (characterUserId: string) => Promise<void>
    executeAttack: (moveId: string) => Promise<void>
    endBattle: (winnerId: 'player' | 'enemy') => Promise<void>
    resetBattle: () => void
}

/**
 * Hook for managing battle state and interactions
 */
export const useBattle = (): UseBattleReturn => {
    const [battleId, setBattleId] = useState<string | null>(null)
    const [playerCharacter, setPlayerCharacter] = useState<BattleCharacter | null>(null)
    const [enemyCharacter, setEnemyCharacter] = useState<BattleCharacter | null>(null)
    const [currentTurn, setCurrentTurn] = useState<'player' | 'enemy' | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [battleEnded, setBattleEnded] = useState(false)
    const [winner, setWinner] = useState<'player' | 'enemy' | null>(null)

    /**
     * Start a new battle
     */
    const startBattle = useCallback(async (characterUserId: string) => {
        try {
            setIsLoading(true)
            setError(null)

            const response = (await apiService.startBattle(
                characterUserId
            )) as BattleStartResponse

            if (!response.success || !response.data) {
                throw new Error(response.message || response.error || 'Failed to start battle')
            }

            const { data } = response

            // Set battle ID
            setBattleId(data.battle_id)

            // Set player character
            const playerChar = data.player_character
            setPlayerCharacter({
                characterUserId: playerChar.character_user_id,
                character: playerChar.character,
                status: playerChar.status,
                moves: playerChar.moves,
                currentHp: playerChar.status.hp,
                maxHp: playerChar.status.hp,
            })

            // Set enemy character
            const enemyChar = data.bot_character
            setEnemyCharacter({
                character: enemyChar.character,
                status: enemyChar.status,
                moves: enemyChar.moves,
                currentHp: enemyChar.status.hp,
                maxHp: enemyChar.status.hp,
            })

            // Set turn
            setCurrentTurn(data.turn as 'player' | 'enemy')
            setBattleEnded(false)
            setWinner(null)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to start battle'
            setError(errorMessage)
            console.error('Error starting battle:', err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    /**
     * Execute an attack in the battle
     */
    const executeAttack = useCallback(
        async (moveId: string) => {
            if (!battleId || !playerCharacter || !enemyCharacter) {
                setError('Battle not initialized')
                return
            }

            if (currentTurn !== 'player') {
                setError('Not your turn')
                return
            }

            try {
                setIsLoading(true)
                setError(null)

                const response = (await apiService.executeAttack(
                    battleId,
                    moveId
                )) as BattleAttackResponse

                if (!response.success) {
                    throw new Error(response.message || response.error || 'Failed to execute attack')
                }

                // Update enemy HP
                const newEnemyHp = Math.max(
                    0,
                    enemyCharacter.currentHp - (response.damage || 0)
                )

                setEnemyCharacter((prev) =>
                    prev ? { ...prev, currentHp: newEnemyHp } : null
                )

                // Check if battle ended
                if (newEnemyHp <= 0) {
                    setBattleEnded(true)
                    setWinner('player')
                } else {
                    // Change turn
                    setCurrentTurn(response.turn as 'player' | 'enemy')
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to execute attack'
                setError(errorMessage)
                console.error('Error executing attack:', err)
            } finally {
                setIsLoading(false)
            }
        },
        [battleId, playerCharacter, enemyCharacter, currentTurn]
    )

    /**
     * Process enemy attack (called when it's enemy's turn)
     */
    const processEnemyAttack = useCallback(() => {
        if (!battleId || !enemyCharacter || !playerCharacter) return

        // Select random move from enemy
        const randomMoveIndex = Math.floor(Math.random() * enemyCharacter.moves.length)
        const randomMove = enemyCharacter.moves[randomMoveIndex]

        // Simulate damage (in real scenario, backend would calculate this)
        const baseDamage = randomMove.move.info.power || 40
        const defenderDefense = playerCharacter.status.defense || 100
        const attackerStrength = enemyCharacter.status.strength || 100

        const damage = Math.max(1, Math.floor(baseDamage + (attackerStrength - defenderDefense) * 0.1))

        // Update player HP
        const newPlayerHp = Math.max(0, playerCharacter.currentHp - damage)

        setPlayerCharacter((prev) =>
            prev ? { ...prev, currentHp: newPlayerHp } : null
        )

        // Check if battle ended
        if (newPlayerHp <= 0) {
            setBattleEnded(true)
            setWinner('enemy')
        } else {
            // Change turn back to player
            setCurrentTurn('player')
        }
    }, [battleId, enemyCharacter, playerCharacter])

    /**
     * End the battle and award points
     */
    const endBattle = useCallback(
        async (battleWinner: 'player' | 'enemy') => {
            if (!battleId) {
                setError('Battle not initialized')
                return
            }

            try {
                setIsLoading(true)
                setError(null)

                // This is a client-side call for now, but could be integrated with backend
                const response = (await apiService.endBattle(
                    battleId,
                    'player' // In real scenario, would send actual winner ID
                )) as BattleResultsResponse

                if (!response.success) {
                    throw new Error(
                        response.message || response.error || 'Failed to end battle'
                    )
                }

                console.log('Battle ended', response)
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to end battle'
                setError(errorMessage)
                console.error('Error ending battle:', err)
            } finally {
                setIsLoading(false)
            }
        },
        [battleId]
    )

    /**
     * Reset battle state
     */
    const resetBattle = useCallback(() => {
        setBattleId(null)
        setPlayerCharacter(null)
        setEnemyCharacter(null)
        setCurrentTurn(null)
        setIsLoading(false)
        setError(null)
        setBattleEnded(false)
        setWinner(null)
    }, [])

    return {
        battleId,
        playerCharacter,
        enemyCharacter,
        currentTurn,
        isLoading,
        error,
        battleEnded,
        winner,
        startBattle,
        executeAttack,
        endBattle,
        resetBattle,
    }
}

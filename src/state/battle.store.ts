import { create } from 'zustand'

interface BattleState {
    currentBattle: any | null
    isInBattle: boolean
    // TODO: Add battle state, turn management, and participant data
}

interface BattleActions {
    startBattle: (battleData: any) => void
    endBattle: () => void
    // TODO: Add turn management, attack handling, and battle progression
}

export const useBattleStore = create<BattleState & BattleActions>((set) => ({
    currentBattle: null,
    isInBattle: false,

    startBattle: (battleData: any) => set({ currentBattle: battleData, isInBattle: true }),
    endBattle: () => set({ currentBattle: null, isInBattle: false }),
}))

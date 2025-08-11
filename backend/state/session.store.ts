import { create } from 'zustand'

interface SessionState {
    isAuthenticated: boolean
    userId: string | null
    // TODO: Add user profile, preferences, and authentication state
}

interface SessionActions {
    login: (userId: string) => void
    logout: () => void
    // TODO: Add authentication methods, profile updates, etc.
}

export const useSessionStore = create<SessionState & SessionActions>((set) => ({
    isAuthenticated: false,
    userId: null,

    login: (userId: string) => set({ isAuthenticated: true, userId }),
    logout: () => set({ isAuthenticated: false, userId: null }),
}))

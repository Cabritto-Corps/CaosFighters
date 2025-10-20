import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useState } from 'react'
import { apiService, STORAGE_KEYS } from '../services/api'
import type { CharacterApiResponse, CharacterCooldown, UserCharacter } from '../types/character'

interface CharacterCache {
    character: UserCharacter
    cachedAt: string
    expiresAt: string
}

interface UseCharacterReturn {
    currentCharacter: UserCharacter | null
    isLoading: boolean
    error: string | null
    canRegenerate: boolean
    timeUntilRegeneration: string
    cooldown: CharacterCooldown | null
    loadCharacter: () => Promise<void>
    checkAndLoadCharacter: () => Promise<void>
    regenerateCharacter: () => Promise<void>
    clearCache: () => Promise<void>
}

/**
 * Hook for managing user character data with caching
 */
export const useCharacter = (): UseCharacterReturn => {
    const [currentCharacter, setCurrentCharacter] = useState<UserCharacter | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [cooldown, setCooldown] = useState<CharacterCooldown | null>(null)

    /**
     * Check if user can regenerate character
     */
    const canRegenerate = useCallback((): boolean => {
        if (!currentCharacter) return true

        const now = new Date()
        const expiresAt = new Date(currentCharacter.assignment.expires_at)

        return now >= expiresAt
    }, [currentCharacter])

    /**
     * Get formatted time until regeneration is allowed
     */
    const timeUntilRegeneration = useCallback((): string => {
        if (!currentCharacter) return ''

        const now = new Date()
        const expiresAt = new Date(currentCharacter.assignment.expires_at)

        if (now >= expiresAt) {
            return 'Agora'
        }

        const diff = expiresAt.getTime() - now.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

        if (hours > 0) {
            return `${hours}h ${minutes}m restantes`
        } else {
            return `${minutes}m restantes`
        }
    }, [currentCharacter])

    /**
     * Load character data from API
     */
    const loadCharacter = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)
            setCooldown(null)

            const response: CharacterApiResponse = await apiService.getUserCurrentCharacter()

            if (response.success && response.data) {
                setCurrentCharacter(response.data)
                setCooldown(response.cooldown || null)

                // Cache the character data with expiration
                const cache: CharacterCache = {
                    character: response.data,
                    cachedAt: new Date().toISOString(),
                    expiresAt: response.data.assignment.expires_at,
                }

                await AsyncStorage.setItem(
                    STORAGE_KEYS.USER_CURRENT_CHARACTER,
                    JSON.stringify(cache)
                )
            } else {
                setError(response.message || response.error || 'Failed to load character')
                setCooldown(response.cooldown || null)
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load character'
            setError(errorMessage)
            console.error('Error loading character:', err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    /**
     * Load character data directly from API (cache will be regenerated automatically)
     */
    const checkAndLoadCharacter = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)
            setCooldown(null)

            // Always fetch from API to ensure we have the latest character data
            await loadCharacter()
        } catch (err) {
            console.error('Error loading character:', err)
            setError(err instanceof Error ? err.message : 'Failed to load character')
        } finally {
            setIsLoading(false)
        }
    }, [loadCharacter])

    /**
     * Regenerate character via API (includes validation)
     */
    const regenerateCharacter = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)
            setCooldown(null)

            const response: CharacterApiResponse = await apiService.regenerateCharacter()

            if (response.success && response.data) {
                setCurrentCharacter(response.data)
                setCooldown(null)

                // Cache the new character data with expiration
                const cache: CharacterCache = {
                    character: response.data,
                    cachedAt: new Date().toISOString(),
                    expiresAt: response.data.assignment.expires_at,
                }

                await AsyncStorage.setItem(
                    STORAGE_KEYS.USER_CURRENT_CHARACTER,
                    JSON.stringify(cache)
                )
            } else {
                // Handle cooldown error or validation failure
                setError(response.message || response.error || 'Failed to regenerate character')
                setCooldown(response.cooldown || null)

                // If the response contains character data even on failure (cooldown case)
                if (response.data) {
                    setCurrentCharacter(response.data)
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate character'
            setError(errorMessage)
            console.error('Error regenerating character:', err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    /**
     * Clear character cache
     */
    const clearCache = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(STORAGE_KEYS.USER_CURRENT_CHARACTER)
            setCurrentCharacter(null)
        } catch (err) {
            console.error('Error clearing character cache:', err)
        }
    }, [])

    /**
     * Auto-load character on mount
     */
    useEffect(() => {
        checkAndLoadCharacter()
    }, [checkAndLoadCharacter])

    return {
        currentCharacter,
        isLoading,
        error,
        canRegenerate: canRegenerate(),
        timeUntilRegeneration: timeUntilRegeneration(),
        cooldown,
        loadCharacter,
        checkAndLoadCharacter,
        regenerateCharacter,
        clearCache,
    }
}

// TODO: Add shared types and interfaces
// TODO: Define common data structures
// TODO: Add utility types for the domain

export type UserId = string
export type CharacterId = string
export type BattleId = string

// Placeholder types - will be expanded as domain grows
export interface BaseEntity {
    id: string
    createdAt: Date
    updatedAt: Date
}

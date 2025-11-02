export interface CharacterStatus {
    hp: number;
    agility: number;
    defense: number;
    strength: number;
    [key: string]: number; // Allow for additional stats
}

export interface MoveInfo {
    type: string;
    power?: number;
    accuracy?: number;
    effect?: string;
    effect_chance?: number;
    [key: string]: any;
}

export interface CharacterTier {
    id: number;
    name: string;
    description?: string;
    min_status?: CharacterStatus;
    max_status?: CharacterStatus;
}

export interface Character {
    id: string;
    name: string;
    form_id: number;
    image_url: string;
    tier: CharacterTier;
}

export interface CharacterAssignment {
    assigned_at: string;
    expires_at: string;
}

export interface CharacterMove {
    slot: number;
    move: {
        id: string;
        name: string;
        info: MoveInfo;
    };
}

export interface UserCharacter {
    character_user_id?: string; // ID do character_user para batalhas
    character: Character;
    assignment: CharacterAssignment;
    status: CharacterStatus;
    moves: CharacterMove[];
}

export interface CharacterCooldown {
    expires_at: string;
    hours_remaining: number;
}

export interface CharacterApiResponse {
    success: boolean;
    data?: UserCharacter;
    message?: string;
    error?: string;
    cooldown?: CharacterCooldown;
}

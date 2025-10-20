export interface CharacterStatus {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    [key: string]: number; // Allow for additional stats
}

export interface CharacterTier {
    id: number;
    name: string;
    description?: string;
}

export interface Character {
    id: string;
    name: string;
    form_id: number;
    image_url: string;
    status: CharacterStatus;
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
        info: {
            [key: string]: any; // Flexible move info structure
        };
    };
}

export interface UserCharacter {
    character: Character;
    assignment: CharacterAssignment;
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

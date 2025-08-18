CREATE TABLE public.battles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    player2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    character1_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE RESTRICT,
    character2_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE RESTRICT,
    winner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    duration INTERVAL,
    battle_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_players_different CHECK (player1_id != player2_id),
    CONSTRAINT check_characters_different CHECK (character1_id != character2_id),
    CONSTRAINT check_winner_valid CHECK (winner_id IS NULL OR winner_id = player1_id OR winner_id = player2_id)
);

CREATE INDEX idx_battles_player1 ON public.battles(player1_id);
CREATE INDEX idx_battles_player2 ON public.battles(player2_id);
CREATE INDEX idx_battles_winner ON public.battles(winner_id);
CREATE INDEX idx_battles_timestamp ON public.battles(battle_timestamp DESC);
CREATE INDEX idx_battles_character1 ON public.battles(character1_id);
CREATE INDEX idx_battles_character2 ON public.battles(character2_id);
CREATE INDEX idx_battles_duration ON public.battles(duration);
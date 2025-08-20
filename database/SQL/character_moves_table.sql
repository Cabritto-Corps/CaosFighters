CREATE TABLE public.character_moves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    move_id UUID NOT NULL REFERENCES public.moves(id) ON DELETE CASCADE,
    move_slot INTEGER NOT NULL CHECK (move_slot >= 1 AND move_slot <= 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_character_move_slot UNIQUE (character_id, move_slot),
    CONSTRAINT unique_character_move UNIQUE (character_id, move_id)
);

CREATE INDEX idx_character_moves_character ON public.character_moves(character_id);
CREATE INDEX idx_character_moves_move ON public.character_moves(move_id);
CREATE INDEX idx_character_moves_slot ON public.character_moves(character_id, move_slot);
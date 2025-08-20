CREATE TABLE public.moves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    move_name TEXT NOT NULL,
    move_info JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_moves_move_name ON public.moves(move_name);
CREATE INDEX idx_moves_move_info ON public.moves USING GIN (move_info);


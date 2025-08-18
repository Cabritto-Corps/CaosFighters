CREATE TABLE public.characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_id INTEGER NOT NULL REFERENCES public.tiers(id) ON DELETE RESTRICT,
    name TEXT UNIQUE NOT NULL,
    status JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_characters_tier ON public.characters(tier_id);
CREATE INDEX idx_characters_name ON public.characters(name);
CREATE INDEX idx_characters_status ON public.characters USING GIN (status);
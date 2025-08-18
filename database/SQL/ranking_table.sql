CREATE TABLE public.ranking (
    id SERIAL PRIMARY KEY,
    tier_id INTEGER NOT NULL REFERENCES public.tiers(id) ON DELETE CASCADE,
    min_points INTEGER NOT NULL,
    max_points INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_points_valid CHECK (min_points >= 0 AND (max_points IS NULL OR max_points >= min_points))
);

CREATE INDEX idx_ranking_tier ON public.ranking(tier_id);
CREATE INDEX idx_ranking_points ON public.ranking(min_points, max_points);
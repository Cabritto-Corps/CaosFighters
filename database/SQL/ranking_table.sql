CREATE TABLE public.ranking (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
    pontos_minimos INTEGER NOT NULL,
    pontos_maximos INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_pontos_validos CHECK (pontos_minimos >= 0 AND (pontos_maximos IS NULL OR pontos_maximos >= pontos_minimos))
);

CREATE INDEX idx_ranking_categoria ON public.ranking(categoria_id);
CREATE INDEX idx_ranking_pontos ON public.ranking(pontos_minimos, pontos_maximos);
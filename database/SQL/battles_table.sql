CREATE TABLE public.batalhas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jogador1_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    jogador2_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    personagem1_id UUID NOT NULL REFERENCES public.personagens(id) ON DELETE RESTRICT,
    personagem2_id UUID NOT NULL REFERENCES public.personagens(id) ON DELETE RESTRICT,
    vencedor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    duracao INTERVAL,
    timestamp_batalha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_jogadores_diferentes CHECK (jogador1_id != jogador2_id),
    CONSTRAINT check_personagens_diferentes CHECK (personagem1_id != personagem2_id),
    CONSTRAINT check_vencedor_valido CHECK (vencedor_id IS NULL OR vencedor_id = jogador1_id OR vencedor_id = jogador2_id)
);

CREATE INDEX idx_batalhas_jogador1 ON public.batalhas(jogador1_id);
CREATE INDEX idx_batalhas_jogador2 ON public.batalhas(jogador2_id);
CREATE INDEX idx_batalhas_vencedor ON public.batalhas(vencedor_id);
CREATE INDEX idx_batalhas_timestamp ON public.batalhas(timestamp_batalha DESC);
CREATE INDEX idx_batalhas_personagem1 ON public.batalhas(personagem1_id);
CREATE INDEX idx_batalhas_personagem2 ON public.batalhas(personagem2_id);
CREATE INDEX idx_batalhas_duracao ON public.batalhas(duracao);
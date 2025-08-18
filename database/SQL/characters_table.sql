CREATE TABLE public.personagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id INTEGER NOT NULL REFERENCES public.categorias(id) ON DELETE RESTRICT,
    nome TEXT UNIQUE NOT NULL,
    agilidade INTEGER NOT NULL CHECK (agilidade > 0),
    forca INTEGER NOT NULL CHECK (forca > 0),
    hp INTEGER NOT NULL CHECK (hp > 0),
    defesa INTEGER NOT NULL CHECK (defesa > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_personagens_categoria ON public.personagens(categoria_id);
CREATE INDEX idx_personagens_nome ON public.personagens(nome);
CREATE INDEX idx_personagens_stats ON public.personagens(agilidade, forca, hp, defesa);
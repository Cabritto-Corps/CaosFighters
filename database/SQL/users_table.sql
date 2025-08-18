CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    pontos INTEGER NOT NULL DEFAULT 0,
    ranking INTEGER,
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'pendente')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON public.usuarios(email);
CREATE INDEX idx_usuarios_pontos_desc ON public.usuarios(pontos DESC);
CREATE INDEX idx_usuarios_ranking ON public.usuarios(ranking);
CREATE INDEX idx_usuarios_status ON public.usuarios(status);
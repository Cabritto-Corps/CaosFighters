CREATE TABLE public.categorias (
    id SERIAL PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categorias_nome ON public.categorias(nome);
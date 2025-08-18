CREATE TABLE public.pontos_seguros (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_latitude_valida CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT check_longitude_valida CHECK (longitude >= -180 AND longitude <= 180)
);

CREATE INDEX idx_pontos_seguros_nome ON public.pontos_seguros(nome);
CREATE INDEX idx_pontos_seguros_coordenadas ON public.pontos_seguros(latitude, longitude);
CREATE INDEX idx_pontos_seguros_created_at ON public.pontos_seguros(created_at);
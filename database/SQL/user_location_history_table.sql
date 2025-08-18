CREATE TABLE public.historico_localizacao_usuario (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_latitude_valida CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT check_longitude_valida CHECK (longitude >= -180 AND longitude <= 180)
);

CREATE INDEX idx_historico_localizacao_usuario ON public.historico_localizacao_usuario(usuario_id);
CREATE INDEX idx_historico_localizacao_timestamp ON public.historico_localizacao_usuario(timestamp DESC);
CREATE INDEX idx_historico_localizacao_coordenadas ON public.historico_localizacao_usuario(latitude, longitude);
CREATE INDEX idx_historico_localizacao_usuario_timestamp ON public.historico_localizacao_usuario(usuario_id, timestamp DESC);
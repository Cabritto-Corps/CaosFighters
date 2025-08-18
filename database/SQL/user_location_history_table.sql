CREATE TABLE public.user_location_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_latitude_valid CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT check_longitude_valid CHECK (longitude >= -180 AND longitude <= 180)
);

CREATE INDEX idx_user_location_history_user ON public.user_location_history(user_id);
CREATE INDEX idx_user_location_history_timestamp ON public.user_location_history(timestamp DESC);
CREATE INDEX idx_user_location_history_coordinates ON public.user_location_history(latitude, longitude);
CREATE INDEX idx_user_location_history_user_timestamp ON public.user_location_history(user_id, timestamp DESC);
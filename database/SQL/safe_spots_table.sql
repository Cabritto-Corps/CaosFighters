CREATE TABLE public.safe_spots (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_latitude_valid CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT check_longitude_valid CHECK (longitude >= -180 AND longitude <= 180)
);

CREATE INDEX idx_safe_spots_name ON public.safe_spots(name);
CREATE INDEX idx_safe_spots_coordinates ON public.safe_spots(latitude, longitude);
CREATE INDEX idx_safe_spots_created_at ON public.safe_spots(created_at);
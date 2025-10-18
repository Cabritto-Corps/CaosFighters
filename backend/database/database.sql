-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.battles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player1_id uuid NOT NULL,
  player2_id uuid NOT NULL,
  character1_id uuid NOT NULL,
  character2_id uuid NOT NULL,
  winner_id uuid,
  duration interval,
  battle_timestamp timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT battles_pkey PRIMARY KEY (id),
  CONSTRAINT battles_player1_id_fkey FOREIGN KEY (player1_id) REFERENCES public.users(id),
  CONSTRAINT battles_player2_id_fkey FOREIGN KEY (player2_id) REFERENCES public.users(id),
  CONSTRAINT battles_character1_id_fkey FOREIGN KEY (character1_id) REFERENCES public.characters(id),
  CONSTRAINT battles_character2_id_fkey FOREIGN KEY (character2_id) REFERENCES public.characters(id),
  CONSTRAINT battles_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.users(id)
);
CREATE TABLE public.character_moves (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL,
  move_id uuid NOT NULL,
  move_slot integer NOT NULL CHECK (move_slot >= 1 AND move_slot <= 4),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT character_moves_pkey PRIMARY KEY (id),
  CONSTRAINT character_moves_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id),
  CONSTRAINT character_moves_move_id_fkey FOREIGN KEY (move_id) REFERENCES public.moves(id)
);
CREATE TABLE public.character_user (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  character_id uuid NOT NULL,
  moves jsonb NOT NULL,
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT character_user_pkey PRIMARY KEY (id),
  CONSTRAINT character_user_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id),
  CONSTRAINT character_user_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.characters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tier_id integer NOT NULL,
  name text NOT NULL UNIQUE,
  status jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT characters_pkey PRIMARY KEY (id),
  CONSTRAINT characters_tier_id_fkey FOREIGN KEY (tier_id) REFERENCES public.tiers(id)
);
CREATE TABLE public.migrations (
  id integer NOT NULL DEFAULT nextval('migrations_id_seq'::regclass),
  migration character varying NOT NULL,
  batch integer NOT NULL,
  CONSTRAINT migrations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.moves (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  move_name text NOT NULL,
  move_info jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT moves_pkey PRIMARY KEY (id)
);
CREATE TABLE public.personal_access_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tokenable_type character varying NOT NULL,
  tokenable_id uuid NOT NULL,
  name character varying NOT NULL,
  token character varying NOT NULL UNIQUE,
  abilities text,
  last_used_at timestamp without time zone,
  expires_at timestamp without time zone,
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ranking (
  id integer NOT NULL DEFAULT nextval('ranking_id_seq'::regclass),
  min_points integer NOT NULL,
  max_points integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  rank_name text NOT NULL,
  CONSTRAINT ranking_pkey PRIMARY KEY (id)
);
CREATE TABLE public.safe_spots (
  id integer NOT NULL DEFAULT nextval('safe_spots_id_seq'::regclass),
  name text NOT NULL,
  latitude numeric NOT NULL CHECK (latitude >= '-90'::integer::numeric AND latitude <= 90::numeric),
  longitude numeric NOT NULL CHECK (longitude >= '-180'::integer::numeric AND longitude <= 180::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT safe_spots_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tiers (
  id integer NOT NULL DEFAULT nextval('tiers_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tiers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_location_history (
  id bigint NOT NULL DEFAULT nextval('user_location_history_id_seq'::regclass),
  user_id uuid NOT NULL,
  latitude numeric NOT NULL CHECK (latitude >= '-90'::integer::numeric AND latitude <= 90::numeric),
  longitude numeric NOT NULL CHECK (longitude >= '-180'::integer::numeric AND longitude <= 180::numeric),
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_location_history_pkey PRIMARY KEY (id),
  CONSTRAINT user_location_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  ranking integer,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
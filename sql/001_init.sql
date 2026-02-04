CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_code TEXT NOT NULL,
  company_code TEXT NOT NULL,
  game_code TEXT NOT NULL,
  config_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS game_configs_client_game_idx
  ON game_configs (client_code, game_code, updated_at DESC);

CREATE TABLE IF NOT EXISTS plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  client_code TEXT,
  company_code TEXT,
  mode TEXT NOT NULL,
  bet INTEGER NOT NULL,
  outcome_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pack_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  client_code TEXT,
  company_code TEXT,
  mode TEXT NOT NULL,
  pack_level TEXT NOT NULL,
  bet INTEGER NOT NULL,
  pack_size INTEGER NOT NULL,
  outcome_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

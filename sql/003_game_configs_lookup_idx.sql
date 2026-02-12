CREATE INDEX IF NOT EXISTS game_configs_client_company_game_idx
  ON game_configs (client_code, company_code, game_code, updated_at DESC);

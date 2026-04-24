CREATE TABLE IF NOT EXISTS user_yearly_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  vehicle_sale_count INTEGER NOT NULL DEFAULT 0,
  vehicle_listing_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_yearly_activity_user_year_unique UNIQUE (user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_user_yearly_activity_year
  ON user_yearly_activity(year);

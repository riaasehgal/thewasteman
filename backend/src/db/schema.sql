-- TrashTrack schema
-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id    TEXT    NOT NULL UNIQUE,
  device_id     TEXT    NOT NULL,
  name          TEXT,
  meal_type     TEXT,
  start_time    TEXT    NOT NULL,
  end_time      TEXT,
  duration_sec  INTEGER,
  summary_json  TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Detection results table
CREATE TABLE IF NOT EXISTS detection_results (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id    TEXT    NOT NULL,
  category      TEXT    NOT NULL,
  amount_kg     REAL,
  confidence    REAL,
  extra_json    TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

-- Indices for common queries
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_results_session_id  ON detection_results(session_id);

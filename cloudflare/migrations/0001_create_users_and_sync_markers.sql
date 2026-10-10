CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_markers (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  marker_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  PRIMARY KEY (user_id, marker_id)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_sync_markers_user_updated
  ON sync_markers (user_id, updated_at);

ALTER TABLE users ADD COLUMN github_id TEXT;
ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0 CHECK (auth_version >= 0);

CREATE UNIQUE INDEX idx_users_github_id
  ON users (github_id)
  WHERE github_id IS NOT NULL;

CREATE TABLE password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE INDEX idx_password_reset_tokens_user_id
  ON password_reset_tokens (user_id);

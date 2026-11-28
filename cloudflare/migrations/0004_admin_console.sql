ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active'
  CHECK (account_status IN ('active', 'suspended'));

CREATE TABLE admin_audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  target_email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('suspend', 'restore')),
  previous_status TEXT NOT NULL CHECK (previous_status IN ('active', 'suspended')),
  new_status TEXT NOT NULL CHECK (new_status IN ('active', 'suspended')),
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_admin_audit_events_created
  ON admin_audit_events (created_at DESC, id DESC);

CREATE INDEX idx_admin_audit_events_target
  ON admin_audit_events (target_user_id, created_at DESC);

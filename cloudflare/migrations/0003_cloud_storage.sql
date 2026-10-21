CREATE TABLE cloud_entities (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('marker', 'photo')),
  entity_id TEXT NOT NULL CHECK (length(entity_id) BETWEEN 1 AND 160),
  parent_id TEXT,
  version INTEGER NOT NULL CHECK (version >= 1),
  is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
  updated_at INTEGER NOT NULL,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  PRIMARY KEY (user_id, entity_type, entity_id),
  CHECK (entity_type = 'photo' OR parent_id IS NULL)
) WITHOUT ROWID;

CREATE INDEX idx_cloud_entities_parent
  ON cloud_entities (user_id, parent_id, entity_type, is_deleted);

CREATE TABLE cloud_sync_state (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_sequence INTEGER NOT NULL DEFAULT 0 CHECK (last_sequence >= 0)
);

CREATE TABLE cloud_v2_legacy_imports (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('running', 'complete')),
  updated_at INTEGER NOT NULL
);

CREATE TABLE cloud_sync_mutations (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mutation_id TEXT NOT NULL,
  request_json TEXT NOT NULL CHECK (json_valid(request_json)),
  result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json)),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, mutation_id)
) WITHOUT ROWID;

CREATE TABLE cloud_sync_changes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL CHECK (sequence >= 1),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('marker', 'photo')),
  entity_id TEXT NOT NULL,
  mutation_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  is_deleted INTEGER NOT NULL CHECK (is_deleted IN (0, 1)),
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, sequence),
  UNIQUE (user_id, mutation_id)
) WITHOUT ROWID;

CREATE INDEX idx_cloud_sync_mutation_created
  ON cloud_sync_mutations (user_id, created_at);

CREATE TABLE cloud_storage_usage (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  used_bytes INTEGER NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
  reserved_bytes INTEGER NOT NULL DEFAULT 0 CHECK (reserved_bytes >= 0),
  updated_at INTEGER NOT NULL
);

CREATE TABLE cloud_storage_objects (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_id TEXT NOT NULL,
  marker_id TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('original', 'thumbnail')),
  object_key TEXT NOT NULL UNIQUE,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  content_type TEXT NOT NULL,
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, photo_id, variant)
) WITHOUT ROWID;

CREATE INDEX idx_cloud_storage_marker
  ON cloud_storage_objects (user_id, marker_id, photo_id);

CREATE TABLE cloud_upload_sessions (
  upload_id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mutation_id TEXT NOT NULL,
  marker_id TEXT NOT NULL,
  marker_version INTEGER NOT NULL CHECK (marker_version >= 1),
  photo_id TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('original', 'thumbnail')),
  expected_size INTEGER NOT NULL CHECK (expected_size > 0),
  reserved_bytes INTEGER NOT NULL CHECK (reserved_bytes >= 0),
  expected_sha256 TEXT NOT NULL CHECK (length(expected_sha256) = 64),
  content_type TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  expected_object_key TEXT NOT NULL DEFAULT '',
  expected_old_sha256 TEXT NOT NULL DEFAULT '',
  expected_old_size INTEGER NOT NULL DEFAULT 0 CHECK (expected_old_size >= 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'uploaded', 'complete', 'expired', 'conflict')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  completed_at INTEGER,
  UNIQUE (user_id, mutation_id)
);

CREATE TABLE cloud_object_cleanup (
  cleanup_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_cloud_object_cleanup_user
  ON cloud_object_cleanup (user_id, cleanup_id);

CREATE INDEX idx_cloud_upload_expiry
  ON cloud_upload_sessions (user_id, expires_at, status);

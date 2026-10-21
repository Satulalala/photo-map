import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export function createTestD1() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  sqlite.exec(readFileSync(new URL('./migrations/0001_create_users_and_sync_markers.sql', import.meta.url), 'utf8'));
  sqlite.exec(readFileSync(new URL('./migrations/0002_add_auth_providers_and_password_reset.sql', import.meta.url), 'utf8'));
  sqlite.exec(readFileSync(new URL('./migrations/0003_cloud_storage.sql', import.meta.url), 'utf8'));

  const makeStatement = (sql, values = []) => ({
    bind(...boundValues) { return makeStatement(sql, boundValues); },
    first() { return sqlite.prepare(sql).get(...values) || null; },
    all() { return { results: sqlite.prepare(sql).all(...values) }; },
    run() {
      const result = sqlite.prepare(sql).run(...values);
      return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
    },
  });

  return {
    prepare: sql => makeStatement(sql),
    batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = statements.map(statement => statement.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    close: () => sqlite.close(),
  };
}

export function insertTestUser(env, id, email = `user${id}@example.test`) {
  env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, username, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, email, 'test-hash', `user${id}`, Date.now()).run();
}

export function createTestR2() {
  const objects = new Map();
  return {
    objects,
    async put(key, value, options = {}) {
      const bytes = value instanceof ReadableStream
        ? Buffer.from(await new Response(value).arrayBuffer())
        : Buffer.from(value);
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      if (options.sha256 && options.sha256.toLowerCase() !== sha256) throw new Error('checksum mismatch');
      const stored = { bytes, size: bytes.length, customMetadata: options.customMetadata || {}, sha256 };
      objects.set(key, stored);
      return stored;
    },
    async head(key) { return objects.get(key) || null; },
    async get(key, options = {}) {
      const stored = objects.get(key);
      if (!stored) return null;
      const { offset, length } = options.range || { offset: 0, length: stored.size };
      const body = stored.bytes.subarray(offset, offset + length);
      return { ...stored, range: options.range || undefined, body: new Blob([body]).stream() };
    },
    async delete(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) objects.delete(key);
    },
  };
}

export function createJsonDependencies() {
  return {
    json(data, status = 200) {
      return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
    },
    async readJson(request) {
      try { return { value: await request.json() }; } catch { return { error: 'bad-json' }; }
    },
    hasTrustedOrigin() { return true; },
  };
}

export function jsonResponseData(response) {
  return response.json();
}

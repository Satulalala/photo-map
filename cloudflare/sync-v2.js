import { drainPhotoCleanup } from './photo-storage.js';

const MAX_MARKERS_PER_PULL = 200;
const MAX_PHOTOS_PER_MARKER = 250;
const MAX_MUTATIONS_PER_PUSH = 100;

function isSafeId(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 160 &&
    value !== '.' && value !== '..' && /^[A-Za-z0-9._:-]+$/.test(value);
}

function safeTimestamp(value, fallback) {
  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) && timestamp >= 0 ? timestamp : fallback;
}

export function sanitizeCloudMarker(marker, now = Date.now()) {
  if (!marker || typeof marker !== 'object' || Array.isArray(marker) || !isSafeId(marker.id)) return null;
  if (!Number.isFinite(marker.lat) || marker.lat < -90 || marker.lat > 90) return null;
  if (!Number.isFinite(marker.lng) || marker.lng < -180 || marker.lng > 180) return null;
  if (marker.photos !== undefined && !Array.isArray(marker.photos)) return null;
  if ((marker.photos || []).length > MAX_PHOTOS_PER_MARKER) return null;
  const sourcePhotos = marker.photos || [];
  const photoIds = new Set();
  const photos = [];
  for (const [index, photo] of sourcePhotos.entries()) {
    if (!photo || !isSafeId(photo.id) || photoIds.has(photo.id)) return null;
    photoIds.add(photo.id);
    photos.push({
      id: photo.id,
      note: typeof photo.note === 'string' ? photo.note.slice(0, 5000) : '',
      createdAt: safeTimestamp(photo.createdAt, now),
      sortOrder: index,
    });
  }
  const createdAt = safeTimestamp(marker.createdAt, now);
  return {
    id: marker.id,
    lat: marker.lat,
    lng: marker.lng,
    name: typeof marker.name === 'string' ? marker.name.slice(0, 500) : '',
    createdAt,
    updatedAt: safeTimestamp(marker.updatedAt, createdAt),
    photoCount: Math.max(photos.length, Number.isSafeInteger(marker.photoCount) ? marker.photoCount : 0),
    photos,
  };
}

export function normalizeSyncMutation(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: '同步操作无效' };
  if (typeof input.mutationId !== 'string' || !/^[A-Za-z0-9._:-]{1,100}$/.test(input.mutationId)) {
    return { error: '同步操作编号无效' };
  }
  if (!['marker.upsert', 'marker.delete'].includes(input.type) || !isSafeId(input.entityId)) {
    return { error: '同步操作类型无效' };
  }
  if (!Number.isSafeInteger(input.baseVersion) || input.baseVersion < 0) return { error: '同步版本无效' };
  if (input.type === 'marker.delete') {
    return { value: { mutationId: input.mutationId, type: input.type, entityId: input.entityId, baseVersion: input.baseVersion } };
  }
  // Missing timestamps must normalize deterministically so a retried mutation keeps the same idempotency key.
  const marker = sanitizeCloudMarker(input.marker, 0);
  if (!marker || marker.id !== input.entityId) return { error: '地点信息无效' };
  return {
    value: { mutationId: input.mutationId, type: input.type, entityId: input.entityId, baseVersion: input.baseVersion, marker },
  };
}

function jsonResponse(json, data, status = 200) {
  return json(data, status);
}

function parseStoredMutation(value) {
  try { return value ? JSON.parse(value) : null; } catch { return null; }
}

async function currentMarker(env, userId, markerId) {
  const row = await env.DB.prepare(
    "SELECT version, is_deleted, payload_json FROM cloud_entities WHERE user_id = ? AND entity_type = 'marker' AND entity_id = ?"
  ).bind(userId, markerId).first();
  return row ? { version: Number(row.version), deleted: Boolean(row.is_deleted), marker: JSON.parse(row.payload_json) } : null;
}

async function persistMutationResult(env, userId, mutationId, result) {
  await env.DB.prepare(
    'UPDATE cloud_sync_mutations SET result_json = ? WHERE user_id = ? AND mutation_id = ? AND result_json IS NULL'
  ).bind(JSON.stringify(result), userId, mutationId).run();
}

async function recoverMutation(env, userId, mutation, requestJson, previous) {
  if (previous.request_json !== requestJson) {
    return { mutationId: mutation.mutationId, accepted: false, error: 'mutation-id-reused' };
  }
  const stored = parseStoredMutation(previous.result_json);
  if (stored) return { ...stored, idempotent: true };

  const event = await env.DB.prepare(
    'SELECT sequence, version, is_deleted FROM cloud_sync_changes WHERE user_id = ? AND mutation_id = ?'
  ).bind(userId, mutation.mutationId).first();
  if (event) {
    const result = {
      mutationId: mutation.mutationId,
      accepted: true,
      version: Number(event.version),
      deleted: Boolean(event.is_deleted),
      sequence: Number(event.sequence),
      idempotent: true,
    };
    await persistMutationResult(env, userId, mutation.mutationId, result);
    return result;
  }

  const current = await currentMarker(env, userId, mutation.entityId);
  const result = {
    mutationId: mutation.mutationId,
    accepted: false,
    conflict: current ? { version: current.version, deleted: current.deleted, marker: current.marker } : { version: 0, deleted: false, marker: null },
    idempotent: true,
  };
  await persistMutationResult(env, userId, mutation.mutationId, result);
  return result;
}

async function ensureLegacyImport(env, userId) {
  const importState = await env.DB.prepare(
    'SELECT status FROM cloud_v2_legacy_imports WHERE user_id = ?'
  ).bind(userId).first();
  if (importState?.status === 'complete') return;

  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO cloud_v2_legacy_imports (user_id, status, updated_at) VALUES (?, 'running', ?) ON CONFLICT(user_id) DO NOTHING"
  ).bind(userId, now).run();
  const legacy = await env.DB.prepare(
    'SELECT marker_id, payload_json FROM sync_markers WHERE user_id = ? ORDER BY marker_id'
  ).bind(userId).all();
  const markerRows = [];
  for (const row of legacy.results || []) {
    try {
      const marker = sanitizeCloudMarker(JSON.parse(row.payload_json), now);
      if (marker) markerRows.push(marker);
    } catch {}
  }

  for (let offset = 0; offset < markerRows.length; offset += 50) {
    const batch = [
      env.DB.prepare('INSERT INTO cloud_sync_state (user_id, last_sequence) VALUES (?, 0) ON CONFLICT(user_id) DO NOTHING').bind(userId),
    ];
    for (const marker of markerRows.slice(offset, offset + 50)) {
      const payload = JSON.stringify(marker);
      const legacyMutationId = `legacy:${marker.id}`;
      batch.push(
        env.DB.prepare(
          'INSERT INTO cloud_entities (user_id, entity_type, entity_id, parent_id, version, is_deleted, updated_at, payload_json) VALUES (?, \'marker\', ?, NULL, 1, 0, ?, ?) ON CONFLICT(user_id, entity_type, entity_id) DO NOTHING'
        ).bind(userId, marker.id, marker.updatedAt, payload),
        env.DB.prepare('UPDATE cloud_sync_state SET last_sequence = last_sequence + 1 WHERE user_id = ? AND changes() = 1').bind(userId),
        env.DB.prepare(
          "INSERT INTO cloud_sync_changes (user_id, sequence, entity_type, entity_id, mutation_id, version, is_deleted, payload_json, created_at) " +
            "SELECT ?, last_sequence, 'marker', ?, ?, 1, 0, ?, ? FROM cloud_sync_state WHERE user_id = ? AND changes() = 1"
        ).bind(userId, marker.id, legacyMutationId, payload, now, userId),
      );
    }
    await env.DB.batch(batch);
  }
  await env.DB.prepare(
    "UPDATE cloud_v2_legacy_imports SET status = 'complete', updated_at = ? WHERE user_id = ?"
  ).bind(Date.now(), userId).run();
}

async function cleanupRemovedPhotos(env, userId, mutation, marker, version, deleted, context) {
  const removedIds = [...new Set((marker.photos || []).map(photo => photo.id))];
  if (!removedIds.length) return 0;
  const placeholders = removedIds.map(() => '?').join(', ');
  const objectFilter = [userId, mutation.entityId, ...removedIds];
  const markerVersion = [userId, mutation.entityId, version, deleted ? 1 : 0];
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO cloud_object_cleanup (user_id, object_key, size_bytes, created_at) ` +
        `SELECT o.user_id, o.object_key, o.size_bytes, ? FROM cloud_storage_objects o ` +
        `WHERE o.user_id = ? AND o.marker_id = ? AND o.photo_id IN (${placeholders}) ` +
        `AND EXISTS (SELECT 1 FROM cloud_entities WHERE user_id = ? AND entity_type = 'marker' AND entity_id = ? AND version = ? AND is_deleted = ?) ` +
        'ON CONFLICT(object_key) DO NOTHING'
    ).bind(Date.now(), ...objectFilter, ...markerVersion),
    env.DB.prepare(
      `UPDATE cloud_storage_usage SET used_bytes = MAX(0, used_bytes - COALESCE((SELECT SUM(size_bytes) FROM cloud_storage_objects WHERE user_id = ? AND marker_id = ? AND photo_id IN (${placeholders}) ` +
        `AND EXISTS (SELECT 1 FROM cloud_entities WHERE user_id = ? AND entity_type = 'marker' AND entity_id = ? AND version = ? AND is_deleted = ?)), 0)) ` +
        'WHERE user_id = ?'
    ).bind(...objectFilter, ...markerVersion, userId),
    env.DB.prepare(
      `DELETE FROM cloud_storage_objects WHERE user_id = ? AND marker_id = ? AND photo_id IN (${placeholders}) ` +
        `AND EXISTS (SELECT 1 FROM cloud_entities WHERE user_id = ? AND entity_type = 'marker' AND entity_id = ? AND version = ? AND is_deleted = ?)`
    ).bind(...objectFilter, ...markerVersion),
  ]);
  const draining = drainPhotoCleanup(env, userId);
  if (context?.waitUntil) context.waitUntil(draining);
  else await draining;
  const pending = await env.DB.prepare('SELECT COUNT(*) AS count FROM cloud_object_cleanup WHERE user_id = ?')
    .bind(userId).first();
  return Number(pending?.count || 0);
}

async function processMutation(env, userId, mutation, context) {
  const requestJson = JSON.stringify(mutation);
  let previous = await env.DB.prepare(
    'SELECT request_json, result_json FROM cloud_sync_mutations WHERE user_id = ? AND mutation_id = ?'
  ).bind(userId, mutation.mutationId).first();
  if (previous) return recoverMutation(env, userId, mutation, requestJson, previous);

  const current = await currentMarker(env, userId, mutation.entityId);
  const currentVersion = current?.version || 0;
  if (mutation.baseVersion !== currentVersion) {
    const result = {
      mutationId: mutation.mutationId,
      accepted: false,
      conflict: current ? { version: current.version, deleted: current.deleted, marker: current.marker } : { version: 0, deleted: false, marker: null },
    };
    await env.DB.prepare(
      'INSERT INTO cloud_sync_mutations (user_id, mutation_id, request_json, result_json, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, mutation_id) DO NOTHING'
    ).bind(userId, mutation.mutationId, requestJson, JSON.stringify(result), Date.now()).run();
    previous = await env.DB.prepare(
      'SELECT request_json, result_json FROM cloud_sync_mutations WHERE user_id = ? AND mutation_id = ?'
    ).bind(userId, mutation.mutationId).first();
    if (previous.request_json !== requestJson) return { mutationId: mutation.mutationId, accepted: false, error: 'mutation-id-reused' };
    return parseStoredMutation(previous.result_json) || result;
  }

  if (mutation.type === 'marker.delete' && !current) {
    const result = { mutationId: mutation.mutationId, accepted: true, version: 0, deleted: true, sequence: null };
    await env.DB.prepare(
      'INSERT INTO cloud_sync_mutations (user_id, mutation_id, request_json, result_json, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, mutation_id) DO NOTHING'
    ).bind(userId, mutation.mutationId, requestJson, JSON.stringify(result), Date.now()).run();
    return result;
  }

  const marker = mutation.type === 'marker.upsert' ? mutation.marker : current.marker;
  const deleted = mutation.type === 'marker.delete';
  const version = currentVersion + 1;
  const payload = JSON.stringify(marker);
  const now = Date.now();
  const writes = await env.DB.batch([
    env.DB.prepare('INSERT INTO cloud_sync_state (user_id, last_sequence) VALUES (?, 0) ON CONFLICT(user_id) DO NOTHING').bind(userId),
    env.DB.prepare(
      'INSERT INTO cloud_sync_mutations (user_id, mutation_id, request_json, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, mutation_id) DO NOTHING'
    ).bind(userId, mutation.mutationId, requestJson, now),
    env.DB.prepare(
      "INSERT INTO cloud_entities (user_id, entity_type, entity_id, parent_id, version, is_deleted, updated_at, payload_json) " +
        "SELECT ?, 'marker', ?, NULL, ?, ?, ?, ? WHERE changes() = 1 AND (? = 0 OR EXISTS (SELECT 1 FROM cloud_entities WHERE user_id = ? AND entity_type = 'marker' AND entity_id = ?)) " +
        'ON CONFLICT(user_id, entity_type, entity_id) DO UPDATE SET version = excluded.version, is_deleted = excluded.is_deleted, updated_at = excluded.updated_at, payload_json = excluded.payload_json ' +
        'WHERE cloud_entities.version = ?'
    ).bind(
      userId, mutation.entityId, version, deleted ? 1 : 0, now, payload,
      mutation.baseVersion, userId, mutation.entityId, mutation.baseVersion,
    ),
    env.DB.prepare('UPDATE cloud_sync_state SET last_sequence = last_sequence + 1 WHERE user_id = ? AND changes() = 1').bind(userId),
    env.DB.prepare(
      "INSERT INTO cloud_sync_changes (user_id, sequence, entity_type, entity_id, mutation_id, version, is_deleted, payload_json, created_at) " +
        "SELECT ?, last_sequence, 'marker', ?, ?, ?, ?, ?, ? FROM cloud_sync_state WHERE user_id = ? AND changes() = 1"
    ).bind(userId, mutation.entityId, mutation.mutationId, version, deleted ? 1 : 0, payload, now, userId),
  ]);

  if (!writes[2]?.meta?.changes) {
    previous = await env.DB.prepare(
      'SELECT request_json, result_json FROM cloud_sync_mutations WHERE user_id = ? AND mutation_id = ?'
    ).bind(userId, mutation.mutationId).first();
    if (previous?.request_json === requestJson) {
      const recovered = await recoverMutation(env, userId, mutation, requestJson, previous);
      if (recovered.accepted) return recovered;
      return recovered;
    }
    const latest = await currentMarker(env, userId, mutation.entityId);
    const result = {
      mutationId: mutation.mutationId,
      accepted: false,
      conflict: latest ? { version: latest.version, deleted: latest.deleted, marker: latest.marker } : { version: 0, deleted: false, marker: null },
    };
    await persistMutationResult(env, userId, mutation.mutationId, result);
    return result;
  }

  const event = await env.DB.prepare(
    'SELECT sequence FROM cloud_sync_changes WHERE user_id = ? AND mutation_id = ?'
  ).bind(userId, mutation.mutationId).first();
  const result = {
    mutationId: mutation.mutationId,
    accepted: true,
    version,
    deleted,
    sequence: Number(event?.sequence || 0),
    idempotent: false,
  };
  await persistMutationResult(env, userId, mutation.mutationId, result);

  const previousPhotos = current?.marker?.photos || [];
  const nextIds = new Set((mutation.type === 'marker.upsert' ? mutation.marker.photos : []).map(photo => photo.id));
  const removed = previousPhotos.filter(photo => !nextIds.has(photo.id));
  result.cleanupPending = await cleanupRemovedPhotos(env, userId, mutation, { photos: removed }, version, deleted, context);
  return result;
}

export async function pushCloudMutations(request, env, user, { json, readJson, hasTrustedOrigin, context }) {
  if (!hasTrustedOrigin(request)) return jsonResponse(json, { ok: false, error: '请求来源无效' }, 403);
  const parsed = await readJson(request);
  if (parsed.error) return jsonResponse(json, { ok: false, error: parsed.error }, 400);
  if (!parsed.value || typeof parsed.value !== 'object' || !Array.isArray(parsed.value.mutations) ||
      parsed.value.mutations.length > MAX_MUTATIONS_PER_PUSH) {
    return jsonResponse(json, { ok: false, error: '同步操作数量无效' }, 400);
  }
  await ensureLegacyImport(env, user.id);

  const mutations = [];
  const seen = new Set();
  for (const item of parsed.value.mutations) {
    const normalized = normalizeSyncMutation(item);
    if (normalized.error) return jsonResponse(json, { ok: false, error: normalized.error }, 400);
    if (seen.has(normalized.value.mutationId)) return jsonResponse(json, { ok: false, error: '同步操作编号重复' }, 400);
    seen.add(normalized.value.mutationId);
    mutations.push(normalized.value);
  }

  const results = [];
  for (const mutation of mutations) results.push(await processMutation(env, user.id, mutation, context));
  return jsonResponse(json, {
    ok: true,
    results,
    accepted: results.filter(result => result.accepted).length,
    conflicts: results.filter(result => !result.accepted).length,
  });
}

export async function pullCloudChanges(request, env, user, { json }) {
  const url = new URL(request.url);
  const cursor = Number(url.searchParams.get('cursor') || 0);
  const limit = Number(url.searchParams.get('limit') || 100);
  if (!Number.isSafeInteger(cursor) || cursor < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_MARKERS_PER_PULL) {
    return jsonResponse(json, { ok: false, error: '同步游标或分页数量无效' }, 400);
  }
  await ensureLegacyImport(env, user.id);
  const [rows, state] = await Promise.all([
    env.DB.prepare(
      'SELECT sequence, entity_id, mutation_id, version, is_deleted, payload_json, created_at FROM cloud_sync_changes WHERE user_id = ? AND sequence > ? ORDER BY sequence LIMIT ?'
    ).bind(user.id, cursor, limit + 1).all(),
    env.DB.prepare('SELECT last_sequence FROM cloud_sync_state WHERE user_id = ?').bind(user.id).first(),
  ]);
  const hasMore = (rows.results || []).length > limit;
  const page = (rows.results || []).slice(0, limit);
  const changes = [];
  for (const row of page) {
    const marker = JSON.parse(row.payload_json);
    let files = [];
    if (!row.is_deleted) {
      const objects = await env.DB.prepare(
        'SELECT photo_id, variant, size_bytes, content_type, sha256 FROM cloud_storage_objects WHERE user_id = ? AND marker_id = ? ORDER BY photo_id, variant'
      ).bind(user.id, row.entity_id).all();
      const photoIds = new Set((marker.photos || []).map(photo => photo.id));
      files = (objects.results || [])
        .filter(object => photoIds.has(object.photo_id))
        .map(object => ({
          photoId: object.photo_id,
          variant: object.variant,
          sizeBytes: Number(object.size_bytes),
          contentType: object.content_type,
          sha256: object.sha256,
          contentUrl: `/api/v2/photos/${encodeURIComponent(object.photo_id)}/content?variant=${object.variant}`,
        }));
    }
    changes.push({
      sequence: Number(row.sequence),
      markerId: row.entity_id,
      version: Number(row.version),
      deleted: Boolean(row.is_deleted),
      marker: row.is_deleted ? null : marker,
      files,
      createdAt: Number(row.created_at),
    });
  }
  return jsonResponse(json, {
    ok: true,
    changes,
    cursor: page.length ? Number(page.at(-1).sequence) : cursor,
    serverCursor: Number(state?.last_sequence || 0),
    hasMore,
  });
}

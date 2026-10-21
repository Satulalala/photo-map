const MEBIBYTE = 1024 * 1024;
const DEFAULT_USER_QUOTA_BYTES = 5 * 1024 * MEBIBYTE;
const UPLOAD_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/gif',
]);

function response(json, data, status = 200) {
  return json(data, status);
}

function isSafeId(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 160 &&
    value !== '.' && value !== '..' && /^[A-Za-z0-9._:-]+$/.test(value);
}

function quotaBytes(env) {
  const configured = Number(env.PHOTO_USER_QUOTA_BYTES);
  return Number.isSafeInteger(configured) && configured > 0 ? configured : DEFAULT_USER_QUOTA_BYTES;
}

export function validateUploadRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: '上传信息无效' };
  const { markerId, photoId, variant, size, contentType, sha256, mutationId, baseSha256 = '' } = input;
  if (!isSafeId(markerId) || !isSafeId(photoId)) return { error: '照片或地点编号无效' };
  if (variant !== 'original' && variant !== 'thumbnail') return { error: '照片类型无效' };
  const maxBytes = variant === 'thumbnail' ? 8 * MEBIBYTE : 25 * MEBIBYTE;
  if (!Number.isSafeInteger(size) || size <= 0 || size > maxBytes) return { error: '照片文件过大' };
  if (typeof contentType !== 'string' || !PHOTO_TYPES.has(contentType.toLowerCase())) {
    return { error: '照片格式暂不支持' };
  }
  if (typeof sha256 !== 'string' || !/^[a-f\d]{64}$/i.test(sha256)) return { error: '照片校验值无效' };
  if (baseSha256 !== '' && (typeof baseSha256 !== 'string' || !/^[a-f\d]{64}$/i.test(baseSha256))) {
    return { error: '旧照片校验值无效' };
  }
  if (typeof mutationId !== 'string' || !/^[A-Za-z0-9._:-]{1,100}$/.test(mutationId)) {
    return { error: '上传编号无效' };
  }
  return {
    value: {
      markerId,
      photoId,
      variant,
      size,
      contentType: contentType.toLowerCase(),
      sha256: sha256.toLowerCase(),
      baseSha256: baseSha256.toLowerCase(),
      mutationId,
    },
  };
}

export function buildPhotoObjectKey(userId, photoId, variant, uploadId) {
  if (!Number.isSafeInteger(Number(userId)) || Number(userId) <= 0 || !isSafeId(photoId) ||
      !['original', 'thumbnail'].includes(variant) || !isSafeId(uploadId)) {
    throw new TypeError('Invalid private photo object key');
  }
  return `users/${Number(userId)}/photos/${encodeURIComponent(photoId)}/${variant}/${encodeURIComponent(uploadId)}`;
}

export function parseByteRange(header, size) {
  if (typeof header !== 'string' || !Number.isSafeInteger(size) || size <= 0 || !header.startsWith('bytes=')) return null;
  const value = header.slice(6).trim();
  if (value.includes(',')) return null;
  const match = /^(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;

  let start;
  let end;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) return null;
    end = Math.min(end, size - 1);
  }
  return { offset: start, length: end - start + 1, start, end };
}

export async function drainPhotoCleanup(env, userId) {
  if (!env.PHOTOS) return 0;
  const pending = await env.DB.prepare(
    'SELECT cleanup_id, object_key FROM cloud_object_cleanup WHERE user_id = ? ORDER BY cleanup_id LIMIT 100'
  ).bind(userId).all();
  let removed = 0;
  for (const item of pending.results || []) {
    try {
      await env.PHOTOS.delete(item.object_key);
      await env.DB.prepare('DELETE FROM cloud_object_cleanup WHERE cleanup_id = ? AND user_id = ?')
        .bind(item.cleanup_id, userId).run();
      removed += 1;
    } catch {}
  }
  return removed;
}

function isPhotoStorageEnabled(env) {
  return env.CLOUD_PHOTO_STORAGE_ENABLED === 'true' && !!env.PHOTOS;
}

async function cleanupExpiredUploads(env, userId) {
  const now = Date.now();
  const expired = await env.DB.prepare(
    "SELECT upload_id, object_key, reserved_bytes, status FROM cloud_upload_sessions " +
      "WHERE user_id = ? AND expires_at <= ? AND status IN ('pending', 'uploaded')"
  ).bind(userId, now).all();

  for (const session of expired.results || []) {
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE cloud_storage_usage SET reserved_bytes = MAX(0, reserved_bytes - ?), updated_at = ? " +
          "WHERE user_id = ? AND EXISTS (SELECT 1 FROM cloud_upload_sessions WHERE upload_id = ? AND status IN ('pending', 'uploaded') AND expires_at <= ?)"
      ).bind(session.reserved_bytes, now, userId, session.upload_id, now),
      env.DB.prepare(
        "UPDATE cloud_upload_sessions SET status = 'expired' WHERE upload_id = ? AND user_id = ? AND status IN ('pending', 'uploaded') AND expires_at <= ?"
      ).bind(session.upload_id, userId, now),
    ]);
    if (session.status === 'uploaded') await env.PHOTOS.delete(session.object_key);
  }
}

export async function getStorageStatus(request, env, user, { json }) {
  if (!isPhotoStorageEnabled(env)) return response(json, { ok: false, error: '云端照片存储尚未开放' }, 503);
  await cleanupExpiredUploads(env, user.id);
  await drainPhotoCleanup(env, user.id);
  const usage = await env.DB.prepare(
    'SELECT used_bytes, reserved_bytes FROM cloud_storage_usage WHERE user_id = ?'
  ).bind(user.id).first();
  const cleanup = await env.DB.prepare(
    'SELECT COALESCE(SUM(size_bytes), 0) AS pending_bytes FROM cloud_object_cleanup WHERE user_id = ?'
  ).bind(user.id).first();
  const limitBytes = quotaBytes(env);
  const usedBytes = Number(usage?.used_bytes || 0);
  const reservedBytes = Number(usage?.reserved_bytes || 0);
  const cleanupPendingBytes = Number(cleanup?.pending_bytes || 0);
  return response(json, {
    ok: true,
    available: true,
    quotaBytes: limitBytes,
    usedBytes,
    reservedBytes,
    cleanupPendingBytes,
    remainingBytes: Math.max(0, limitBytes - usedBytes - reservedBytes - cleanupPendingBytes),
    maxOriginalBytes: 25 * MEBIBYTE,
    maxThumbnailBytes: 8 * MEBIBYTE,
  });
}

export async function startPhotoUpload(request, env, user, { json, readJson, hasTrustedOrigin }) {
  if (!hasTrustedOrigin(request)) return response(json, { ok: false, error: '请求来源无效' }, 403);
  if (!isPhotoStorageEnabled(env)) return response(json, { ok: false, error: '云端照片存储尚未开放' }, 503);
  const parsed = await readJson(request);
  if (parsed.error) return response(json, { ok: false, error: parsed.error }, 400);
  const validated = validateUploadRequest(parsed.value);
  if (validated.error) return response(json, { ok: false, error: validated.error }, 400);

  const input = validated.value;
  const marker = await env.DB.prepare(
    "SELECT version, payload_json FROM cloud_entities WHERE user_id = ? AND entity_type = 'marker' AND entity_id = ? AND is_deleted = 0"
  ).bind(user.id, input.markerId).first();
  if (!marker || !JSON.parse(marker.payload_json).photos.some(photo => photo.id === input.photoId)) {
    return response(json, { ok: false, error: '照片不属于当前账户或尚未同步' }, 404);
  }
  const existing = await env.DB.prepare(
    'SELECT * FROM cloud_upload_sessions WHERE user_id = ? AND mutation_id = ?'
  ).bind(user.id, input.mutationId).first();
  if (existing) {
    const sameRequest = existing.marker_id === input.markerId && existing.photo_id === input.photoId &&
      Number(existing.marker_version) === Number(marker.version) &&
      existing.variant === input.variant && existing.expected_size === input.size &&
      existing.expected_sha256 === input.sha256 && existing.content_type === input.contentType &&
      existing.expected_old_sha256 === input.baseSha256;
    if (!sameRequest) return response(json, { ok: false, error: '上传编号已用于其他内容' }, 409);
    if (existing.status === 'expired' || existing.status === 'conflict') {
      return response(json, { ok: false, error: '上传会话已失效，请重新开始' }, 410);
    }
    return response(json, {
      ok: true,
      uploadId: existing.upload_id,
      uploadUrl: `/api/v2/photos/uploads/${encodeURIComponent(existing.upload_id)}`,
      expiresAt: existing.expires_at,
      status: existing.status,
      idempotent: true,
    });
  }

  await cleanupExpiredUploads(env, user.id);
  const currentObject = await env.DB.prepare(
    'SELECT object_key, size_bytes, sha256 FROM cloud_storage_objects WHERE user_id = ? AND photo_id = ? AND variant = ?'
  ).bind(user.id, input.photoId, input.variant).first();
  if ((currentObject?.sha256 || '') !== input.baseSha256) {
    return response(json, { ok: false, error: '照片已在其他设备更新，请先同步' }, 409);
  }
  const uploadId = crypto.randomUUID();
  const objectKey = buildPhotoObjectKey(user.id, input.photoId, input.variant, uploadId);
  const now = Date.now();
  const maxQuota = quotaBytes(env);
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO cloud_storage_usage (user_id, used_bytes, reserved_bytes, updated_at) VALUES (?, 0, 0, ?) ON CONFLICT(user_id) DO NOTHING'
    ).bind(user.id, now),
    env.DB.prepare(
      "UPDATE cloud_storage_usage SET reserved_bytes = reserved_bytes + MAX(0, ? - COALESCE((SELECT size_bytes FROM cloud_storage_objects WHERE user_id = ? AND photo_id = ? AND variant = ?), 0)), updated_at = ? " +
        "WHERE user_id = ? AND used_bytes + reserved_bytes + MAX(0, ? - COALESCE((SELECT size_bytes FROM cloud_storage_objects WHERE user_id = ? AND photo_id = ? AND variant = ?), 0)) <= ? " +
        "AND EXISTS (SELECT 1 FROM cloud_entities WHERE user_id = ? AND entity_type = 'marker' AND entity_id = ? AND version = ? AND is_deleted = 0 AND EXISTS (SELECT 1 FROM json_each(payload_json, '$.photos') WHERE json_extract(value, '$.id') = ?)) " +
        "AND NOT EXISTS (SELECT 1 FROM cloud_upload_sessions WHERE user_id = ? AND mutation_id = ?)"
    ).bind(
      input.size, user.id, input.photoId, input.variant, now,
      user.id, input.size, user.id, input.photoId, input.variant, maxQuota,
      user.id, input.markerId, marker.version, input.photoId, user.id, input.mutationId,
    ),
    env.DB.prepare(
      "INSERT INTO cloud_upload_sessions (upload_id, user_id, mutation_id, marker_id, marker_version, photo_id, variant, expected_size, reserved_bytes, expected_sha256, content_type, object_key, expected_object_key, expected_old_sha256, expected_old_size, status, created_at, expires_at) " +
        "SELECT ?, ?, ?, ?, ?, ?, ?, ?, MAX(0, ? - COALESCE((SELECT size_bytes FROM cloud_storage_objects WHERE user_id = ? AND photo_id = ? AND variant = ?), 0)), ?, ?, ?, COALESCE((SELECT object_key FROM cloud_storage_objects WHERE user_id = ? AND photo_id = ? AND variant = ?), ''), ?, COALESCE((SELECT size_bytes FROM cloud_storage_objects WHERE user_id = ? AND photo_id = ? AND variant = ?), 0), 'pending', ?, ? WHERE changes() = 1"
    ).bind(
      uploadId, user.id, input.mutationId, input.markerId, marker.version, input.photoId, input.variant, input.size,
      input.size, user.id, input.photoId, input.variant, input.sha256, input.contentType, objectKey,
      user.id, input.photoId, input.variant, input.baseSha256, user.id, input.photoId, input.variant,
      now, now + UPLOAD_SESSION_TTL_MS,
    ),
  ]);

  const created = await env.DB.prepare(
    'SELECT * FROM cloud_upload_sessions WHERE user_id = ? AND mutation_id = ?'
  ).bind(user.id, input.mutationId).first();
  if (!created) {
    const marker = await env.DB.prepare(
      "SELECT 1 AS ok FROM cloud_entities WHERE user_id = ? AND entity_type = 'marker' AND entity_id = ? AND is_deleted = 0"
    ).bind(user.id, input.markerId).first();
    if (!marker) return response(json, { ok: false, error: '地点不属于当前账户或尚未同步' }, 404);
    return response(json, { ok: false, error: '账户云存储空间不足' }, 413);
  }

  return response(json, {
    ok: true,
    uploadId: created.upload_id,
    uploadUrl: `/api/v2/photos/uploads/${encodeURIComponent(created.upload_id)}`,
    expiresAt: created.expires_at,
    status: created.status,
    idempotent: false,
  }, 201);
}

export async function putPhotoUpload(request, env, user, uploadId, { json, hasTrustedOrigin }) {
  if (!hasTrustedOrigin(request)) return response(json, { ok: false, error: '请求来源无效' }, 403);
  if (!isPhotoStorageEnabled(env)) return response(json, { ok: false, error: '云端照片存储尚未开放' }, 503);
  const session = await env.DB.prepare(
    'SELECT * FROM cloud_upload_sessions WHERE upload_id = ? AND user_id = ?'
  ).bind(uploadId, user.id).first();
  if (!session) return response(json, { ok: false, error: '上传会话不存在' }, 404);
  if (session.status === 'complete') return response(json, { ok: true, alreadyUploaded: true });
  if (session.status === 'expired' || session.status === 'conflict' || session.expires_at <= Date.now()) {
    return response(json, { ok: false, error: '上传会话已失效' }, 410);
  }
  const size = Number(request.headers.get('Content-Length'));
  if (!Number.isSafeInteger(size) || size !== session.expected_size) {
    return response(json, { ok: false, error: '上传文件长度与声明不一致' }, 400);
  }
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== session.content_type) {
    return response(json, { ok: false, error: '上传文件类型与声明不一致' }, 400);
  }
  if (!request.body) return response(json, { ok: false, error: '照片内容为空' }, 400);

  try {
    const object = await env.PHOTOS.put(session.object_key, request.body, {
      sha256: session.expected_sha256,
      httpMetadata: { contentType: session.content_type, cacheControl: 'private, no-store' },
      customMetadata: { sha256: session.expected_sha256, uploadId: session.upload_id },
    });
    if (!object || object.size !== session.expected_size) {
      return response(json, { ok: false, error: '照片文件校验失败' }, 400);
    }
  } catch (error) {
    const status = /checksum|sha-?256|digest/i.test(error?.message || '') ? 400 : 502;
    return response(json, { ok: false, error: status === 400 ? '照片校验值不匹配' : '照片存储暂时不可用' }, status);
  }

  await env.DB.prepare(
    "UPDATE cloud_upload_sessions SET status = 'uploaded' WHERE upload_id = ? AND user_id = ? AND status IN ('pending', 'uploaded')"
  ).bind(session.upload_id, user.id).run();
  return response(json, { ok: true, uploaded: true });
}

export async function completePhotoUpload(request, env, user, uploadId, { json, hasTrustedOrigin, context }) {
  if (!hasTrustedOrigin(request)) return response(json, { ok: false, error: '请求来源无效' }, 403);
  if (!isPhotoStorageEnabled(env)) return response(json, { ok: false, error: '云端照片存储尚未开放' }, 503);
  const session = await env.DB.prepare(
    'SELECT * FROM cloud_upload_sessions WHERE upload_id = ? AND user_id = ?'
  ).bind(uploadId, user.id).first();
  if (!session) return response(json, { ok: false, error: '上传会话不存在' }, 404);
  if (session.status === 'complete') {
    return response(json, { ok: true, photoId: session.photo_id, variant: session.variant, idempotent: true });
  }
  if (session.status === 'expired' || session.status === 'conflict' || session.expires_at <= Date.now()) {
    return response(json, { ok: false, error: '上传会话已失效' }, 410);
  }
  if (session.status !== 'uploaded') return response(json, { ok: false, error: '照片尚未上传' }, 409);

  const marker = await env.DB.prepare(
    "SELECT version, payload_json FROM cloud_entities WHERE user_id = ? AND entity_type = 'marker' AND entity_id = ? AND is_deleted = 0"
  ).bind(user.id, session.marker_id).first();
  const markerPhotos = marker ? JSON.parse(marker.payload_json).photos : [];
  if (!marker || Number(marker.version) !== Number(session.marker_version) || !markerPhotos.some(photo => photo.id === session.photo_id)) {
    await env.DB.batch([
      env.DB.prepare(
        'UPDATE cloud_storage_usage SET reserved_bytes = MAX(0, reserved_bytes - ?), updated_at = ? WHERE user_id = ?'
      ).bind(session.reserved_bytes, Date.now(), user.id),
      env.DB.prepare(
        "UPDATE cloud_upload_sessions SET status = 'conflict' WHERE upload_id = ? AND user_id = ? AND status = 'uploaded'"
      ).bind(session.upload_id, user.id),
    ]);
    await env.PHOTOS.delete(session.object_key);
    return response(json, { ok: false, error: '照片已从地点中移除，请重新同步' }, 409);
  }

  const uploaded = await env.PHOTOS.head(session.object_key);
  if (!uploaded || uploaded.size !== session.expected_size || uploaded.customMetadata?.sha256 !== session.expected_sha256) {
    return response(json, { ok: false, error: '照片文件校验失败' }, 409);
  }

  const now = Date.now();
  const writes = await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO cloud_storage_objects (user_id, photo_id, marker_id, variant, object_key, size_bytes, content_type, sha256, updated_at) " +
        "SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM cloud_entities e WHERE e.user_id = ? AND e.entity_type = 'marker' AND e.entity_id = ? AND e.version = ? AND e.is_deleted = 0 AND EXISTS (SELECT 1 FROM json_each(e.payload_json, '$.photos') WHERE json_extract(value, '$.id') = ?)) " +
        'ON CONFLICT(user_id, photo_id, variant) DO UPDATE SET marker_id = excluded.marker_id, object_key = excluded.object_key, size_bytes = excluded.size_bytes, content_type = excluded.content_type, sha256 = excluded.sha256, updated_at = excluded.updated_at ' +
        "WHERE cloud_storage_objects.object_key = ? AND cloud_storage_objects.sha256 = ? AND EXISTS (SELECT 1 FROM cloud_entities e WHERE e.user_id = ? AND e.entity_type = 'marker' AND e.entity_id = ? AND e.version = ? AND e.is_deleted = 0 AND EXISTS (SELECT 1 FROM json_each(e.payload_json, '$.photos') WHERE json_extract(value, '$.id') = ?))"
    ).bind(
      user.id, session.photo_id, session.marker_id, session.variant, session.object_key,
      session.expected_size, session.content_type, session.expected_sha256, now,
      user.id, session.marker_id, session.marker_version, session.photo_id,
      session.expected_object_key, session.expected_old_sha256,
      user.id, session.marker_id, session.marker_version, session.photo_id,
    ),
    env.DB.prepare(
      'UPDATE cloud_storage_usage SET used_bytes = MAX(0, used_bytes + ? - ?), reserved_bytes = reserved_bytes - ?, updated_at = ? ' +
        'WHERE user_id = ? AND changes() = 1 AND reserved_bytes >= ?'
    ).bind(session.expected_size, session.expected_old_size, session.reserved_bytes, now, user.id, session.reserved_bytes),
    env.DB.prepare(
      "UPDATE cloud_upload_sessions SET status = 'complete', completed_at = ? WHERE upload_id = ? AND user_id = ? AND status = 'uploaded' AND changes() = 1"
    ).bind(now, session.upload_id, user.id),
    env.DB.prepare(
      "UPDATE cloud_entities SET version = version + 1, updated_at = ? WHERE user_id = ? AND entity_type = 'marker' AND entity_id = ? AND version = ? AND is_deleted = 0 AND changes() = 1"
    ).bind(now, user.id, session.marker_id, session.marker_version),
    env.DB.prepare('UPDATE cloud_sync_state SET last_sequence = last_sequence + 1 WHERE user_id = ? AND changes() = 1')
      .bind(user.id),
    env.DB.prepare(
      "INSERT INTO cloud_sync_changes (user_id, sequence, entity_type, entity_id, mutation_id, version, is_deleted, payload_json, created_at) " +
        "SELECT ?, last_sequence, 'marker', e.entity_id, ?, e.version, 0, e.payload_json, ? FROM cloud_sync_state s " +
        "JOIN cloud_entities e ON e.user_id = s.user_id AND e.entity_type = 'marker' " +
        "WHERE s.user_id = ? AND e.entity_id = ? AND changes() = 1"
    ).bind(user.id, `file:${session.upload_id}`, now, user.id, session.marker_id),
  ]);

  if (!writes[0]?.meta?.changes) {
    await env.DB.batch([
      env.DB.prepare(
        'UPDATE cloud_storage_usage SET reserved_bytes = MAX(0, reserved_bytes - ?), updated_at = ? WHERE user_id = ?'
      ).bind(session.reserved_bytes, now, user.id),
      env.DB.prepare(
        "UPDATE cloud_upload_sessions SET status = 'conflict' WHERE upload_id = ? AND user_id = ? AND status = 'uploaded'"
      ).bind(session.upload_id, user.id),
    ]);
    await env.PHOTOS.delete(session.object_key);
    return response(json, { ok: false, error: '照片文件已被其他设备更新，请重新同步后重试' }, 409);
  }
  if (!writes[5]?.meta?.changes) return response(json, { ok: false, error: '照片存储记录暂时无法完成' }, 503);

  if (session.expected_object_key && session.expected_object_key !== session.object_key) {
    const removeOld = env.PHOTOS.delete(session.expected_object_key).catch(() => {});
    if (context?.waitUntil) context.waitUntil(removeOld);
    else await removeOld;
  }
  await drainPhotoCleanup(env, user.id);
  const change = await env.DB.prepare(
    'SELECT sequence, version FROM cloud_sync_changes WHERE user_id = ? AND mutation_id = ?'
  ).bind(user.id, `file:${session.upload_id}`).first();
  return response(json, {
    ok: true,
    photoId: session.photo_id,
    variant: session.variant,
    sizeBytes: session.expected_size,
    sha256: session.expected_sha256,
    version: Number(change?.version || session.marker_version + 1),
    sequence: Number(change?.sequence || 0),
    idempotent: false,
  });
}

export async function readPhotoContent(request, env, user, photoId, variant) {
  if (!isPhotoStorageEnabled(env)) return new Response('Photo storage unavailable', { status: 503 });
  if (!isSafeId(photoId) || !['original', 'thumbnail'].includes(variant)) {
    return new Response('Not found', { status: 404 });
  }
  const record = await env.DB.prepare(
    "SELECT o.object_key, o.size_bytes, o.content_type, o.sha256, m.payload_json FROM cloud_storage_objects o " +
      "JOIN cloud_entities m ON m.user_id = o.user_id AND m.entity_type = 'marker' AND m.entity_id = o.marker_id AND m.is_deleted = 0 " +
      'WHERE o.user_id = ? AND o.photo_id = ? AND o.variant = ?'
  ).bind(user.id, photoId, variant).first();
  if (!record) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const markerPhotos = JSON.parse(record.payload_json).photos || [];
  if (!markerPhotos.some(photo => photo.id === photoId)) {
    return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  const etag = `"sha256-${record.sha256}"`;
  const headers = new Headers({
    'Content-Type': record.content_type,
    'Cache-Control': 'private, no-store',
    'Accept-Ranges': 'bytes',
    'ETag': etag,
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers });
  }

  let range = null;
  const rangeHeader = request.headers.get('Range');
  const ifRange = request.headers.get('If-Range');
  if (rangeHeader && (!ifRange || ifRange === etag)) {
    range = parseByteRange(rangeHeader, record.size_bytes);
    if (!range) {
      headers.set('Content-Range', `bytes */${record.size_bytes}`);
      return new Response(null, { status: 416, headers });
    }
  }
  const object = await env.PHOTOS.get(record.object_key, range ? { range: { offset: range.offset, length: range.length } } : undefined);
  if (!object || !object.body) return new Response('Not found', { status: 404, headers });
  headers.set('Content-Length', String(range ? range.length : record.size_bytes));
  if (range) headers.set('Content-Range', `bytes ${range.start}-${range.end}/${record.size_bytes}`);
  return new Response(object.body, { status: range ? 206 : 200, headers });
}

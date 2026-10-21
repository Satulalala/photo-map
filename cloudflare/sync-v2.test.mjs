import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSyncMutation, sanitizeCloudMarker } from './sync-v2.js';
import { createJsonDependencies, createTestD1, createTestR2, insertTestUser } from './test-support.mjs';
import { pushCloudMutations, pullCloudChanges } from './sync-v2.js';

test('sanitizes marker and photo metadata without copying local image data or paths', () => {
  const marker = sanitizeCloudMarker({
    id: 'marker-1', lat: 39.9, lng: 116.4, name: '北京', createdAt: 100, updatedAt: 200,
    photos: [
      { id: 'photo-1', note: '街景', data: 'data:image/jpeg;base64,private', originalPath: 'C:\\private\\a.jpg' },
      { id: 'photo-2', note: '夜景' },
    ],
  }, 300);

  assert.deepEqual(marker, {
    id: 'marker-1', lat: 39.9, lng: 116.4, name: '北京', createdAt: 100, updatedAt: 200,
    photoCount: 2,
    photos: [
      { id: 'photo-1', note: '街景', createdAt: 300, sortOrder: 0 },
      { id: 'photo-2', note: '夜景', createdAt: 300, sortOrder: 1 },
    ],
  });
  assert.equal(JSON.stringify(marker).includes('private'), false);
  assert.equal(JSON.stringify(marker).includes('C:'), false);
});

test('rejects invalid marker coordinates and duplicate photo ids', () => {
  assert.equal(sanitizeCloudMarker({ id: 'm', lat: 91, lng: 0 }, 100), null);
  assert.equal(sanitizeCloudMarker({
    id: 'm', lat: 0, lng: 0, photos: [{ id: 'p' }, { id: 'p' }],
  }, 100), null);
});

test('normalizes an idempotent versioned marker mutation', () => {
  const mutation = normalizeSyncMutation({
    mutationId: 'device-1:op-1',
    type: 'marker.upsert',
    entityId: 'marker-1',
    baseVersion: 3,
    marker: { id: 'marker-1', lat: 1, lng: 2, photos: [] },
  }, 500);
  assert.equal(mutation.error, undefined);
  assert.equal(mutation.value.baseVersion, 3);
  assert.equal(mutation.value.marker.photoCount, 0);
});

test('rejects inconsistent or unsupported mutation shapes', () => {
  const base = { mutationId: 'op-1', type: 'marker.upsert', entityId: 'marker-1', baseVersion: 0 };
  assert.ok(normalizeSyncMutation({ ...base, marker: { id: 'other', lat: 1, lng: 2 } }, 500).error);
  assert.ok(normalizeSyncMutation({ ...base, type: 'photo.delete' }, 500).error);
  assert.ok(normalizeSyncMutation({ ...base, baseVersion: -1 }, 500).error);
});

test('pushes and pulls stable marker versions, replays mutations idempotently, and rejects stale writes', async () => {
  const env = { DB: createTestD1() };
  const user = { id: 1 };
  insertTestUser(env, user.id);
  const dependencies = createJsonDependencies();
  const marker = { id: 'marker-1', lat: 39.9, lng: 116.4, name: '地点', photos: [{ id: 'photo-1', note: '备注' }] };
  const mutation = { mutationId: 'device-a:1', type: 'marker.upsert', entityId: marker.id, baseVersion: 0, marker };
  const request = () => new Request('https://api.test/api/v2/sync/push', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mutations: [mutation] }),
  });

  const first = await (await pushCloudMutations(request(), env, user, dependencies)).json();
  assert.equal(first.accepted, 1);
  assert.equal(first.results[0].version, 1);
  assert.equal(first.results[0].sequence, 1);

  const replay = await (await pushCloudMutations(request(), env, user, dependencies)).json();
  assert.equal(replay.accepted, 1);
  assert.equal(replay.results[0].idempotent, true);
  const pull = await (await pullCloudChanges(new Request('https://api.test/api/v2/sync/pull?cursor=0'), env, user, dependencies)).json();
  assert.equal(pull.changes.length, 1);
  assert.equal(pull.changes[0].marker.photos[0].note, '备注');

  const stale = await (await pushCloudMutations(new Request('https://api.test/api/v2/sync/push', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations: [{ ...mutation, mutationId: 'device-b:1', marker: { ...marker, name: '旧修改' } }] }),
  }), env, user, dependencies)).json();
  assert.equal(stale.accepted, 0);
  assert.equal(stale.results[0].conflict.version, 1);
  env.DB.close();
});

test('imports old v1 marker metadata into v2 once while leaving photos without cloud files', async () => {
  const env = { DB: createTestD1() };
  const user = { id: 2 };
  insertTestUser(env, user.id);
  const legacyMarker = { id: 'legacy-1', lat: 10, lng: 20, name: '旧地点', photos: [{ id: 'old-photo', note: '云端只有备注' }] };
  env.DB.prepare(
    'INSERT INTO sync_markers (user_id, marker_id, updated_at, created_at, payload_json) VALUES (?, ?, ?, ?, ?)'
  ).bind(user.id, legacyMarker.id, 10, 10, JSON.stringify(legacyMarker)).run();
  const dependencies = createJsonDependencies();
  const pullRequest = new Request('https://api.test/api/v2/sync/pull?cursor=0');
  const first = await (await pullCloudChanges(pullRequest, env, user, dependencies)).json();
  const second = await (await pullCloudChanges(pullRequest, env, user, dependencies)).json();
  assert.equal(first.changes.length, 1);
  assert.equal(first.changes[0].marker.photos[0].note, '云端只有备注');
  assert.equal(first.changes[0].files.length, 0);
  assert.equal(second.changes.length, 1);
  assert.equal(second.changes[0].sequence, first.changes[0].sequence);
  env.DB.close();
});

test('removing a photo metadata entry tombstones the snapshot, removes private blobs, and releases quota', async () => {
  const env = { DB: createTestD1(), PHOTOS: createTestR2(), CLOUD_PHOTO_STORAGE_ENABLED: 'true' };
  const user = { id: 3 };
  insertTestUser(env, user.id);
  const dependencies = createJsonDependencies();
  const marker = { id: 'marker-delete', lat: 1, lng: 2, photos: [{ id: 'photo-delete', note: 'remove me' }] };
  const push = mutation => pushCloudMutations(new Request('https://api.test/api/v2/sync/push', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mutations: [mutation] }),
  }), env, user, dependencies);
  await push({ mutationId: 'create-delete-test', type: 'marker.upsert', entityId: marker.id, baseVersion: 0, marker });
  const key = 'users/3/photos/photo-delete/original/old-version';
  await env.PHOTOS.put(key, Buffer.from('private photo'));
  env.DB.prepare('INSERT INTO cloud_storage_usage (user_id, used_bytes, reserved_bytes, updated_at) VALUES (?, ?, 0, ?)')
    .bind(user.id, Buffer.byteLength('private photo'), Date.now()).run();
  env.DB.prepare(
    'INSERT INTO cloud_storage_objects (user_id, photo_id, marker_id, variant, object_key, size_bytes, content_type, sha256, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(user.id, 'photo-delete', marker.id, 'original', key, Buffer.byteLength('private photo'), 'image/jpeg', 'a'.repeat(64), Date.now()).run();

  const result = await (await push({
    mutationId: 'remove-delete-test', type: 'marker.upsert', entityId: marker.id, baseVersion: 1,
    marker: { ...marker, photos: [] },
  })).json();
  assert.equal(result.accepted, 1);
  assert.equal(result.results[0].cleanupPending, 0);
  assert.equal(env.PHOTOS.objects.size, 0);
  const usage = env.DB.prepare('SELECT used_bytes FROM cloud_storage_usage WHERE user_id = ?').bind(user.id).first();
  assert.equal(usage.used_bytes, 0);
  env.DB.close();
});

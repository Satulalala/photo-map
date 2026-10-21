import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPhotoObjectKey,
  parseByteRange,
  validateUploadRequest,
  readPhotoContent,
  getStorageStatus,
  startPhotoUpload,
  putPhotoUpload,
  completePhotoUpload,
} from './photo-storage.js';
import { createHash } from 'node:crypto';
import { createJsonDependencies, createTestD1, createTestR2, insertTestUser } from './test-support.mjs';
import { pushCloudMutations } from './sync-v2.js';

test('validates supported upload metadata and per-variant limits', () => {
  const original = validateUploadRequest({
    markerId: 'marker-1',
    photoId: 'photo-1',
    variant: 'original',
    size: 1024,
    contentType: 'image/jpeg',
    sha256: 'a'.repeat(64),
    mutationId: 'upload-1',
  });
  assert.equal(original.error, undefined);
  assert.equal(original.value.size, 1024);

  const oversizedThumbnail = validateUploadRequest({
    markerId: 'marker-1', photoId: 'photo-1', variant: 'thumbnail',
    size: 9 * 1024 * 1024, contentType: 'image/webp', sha256: 'b'.repeat(64), mutationId: 'upload-2',
  });
  assert.equal(oversizedThumbnail.error, '照片文件过大');
});

test('rejects malformed ids, unsupported MIME types, empty files, and bad checksums', () => {
  const base = {
    markerId: 'marker-1', photoId: 'photo-1', variant: 'original',
    size: 100, contentType: 'image/jpeg', sha256: 'c'.repeat(64), mutationId: 'upload-3',
  };
  assert.ok(validateUploadRequest({ ...base, photoId: '../other-user' }).error);
  assert.ok(validateUploadRequest({ ...base, contentType: 'text/html' }).error);
  assert.ok(validateUploadRequest({ ...base, size: 0 }).error);
  assert.ok(validateUploadRequest({ ...base, sha256: 'not-a-checksum' }).error);
});

test('builds a stable account-prefixed private object key', () => {
  assert.equal(buildPhotoObjectKey(23, 'photo-1', 'thumbnail', 'upload-1'), 'users/23/photos/photo-1/thumbnail/upload-1');
  assert.throws(() => buildPhotoObjectKey(0, 'photo-1', 'original', 'upload-1'));
});

test('parses one valid byte range and rejects malformed or unsatisfiable ranges', () => {
  assert.deepEqual(parseByteRange('bytes=10-19', 100), { offset: 10, length: 10, start: 10, end: 19 });
  assert.deepEqual(parseByteRange('bytes=-8', 100), { offset: 92, length: 8, start: 92, end: 99 });
  assert.equal(parseByteRange('bytes=2-1', 100), null);
  assert.equal(parseByteRange('bytes=100-', 100), null);
  assert.equal(parseByteRange('bytes=0-1,4-5', 100), null);
});

test('does not read an object when the authenticated user has no owned photo row', async () => {
  let query = '';
  let bound = [];
  let r2Reads = 0;
  const response = await readPhotoContent(new Request('https://app.test/api/v2/photos/photo-1/content'), {
    DB: {
      prepare(sql) {
        query = sql;
        return { bind(...values) { bound = values; return { first: async () => null }; } };
      },
    },
    PHOTOS: { get: async () => { r2Reads += 1; return null; } },
    CLOUD_PHOTO_STORAGE_ENABLED: 'true',
  }, { id: 23 }, 'photo-1', 'original');

  assert.equal(response.status, 404);
  assert.match(query, /user_id\s*=\s*\?/);
  assert.deepEqual(bound, [23, 'photo-1', 'original']);
  assert.equal(r2Reads, 0);
});

test('uploads, verifies, accounts for, and privately serves original and ranged photo bytes', async () => {
  const env = {
    DB: createTestD1(),
    PHOTOS: createTestR2(),
    CLOUD_PHOTO_STORAGE_ENABLED: 'true',
    PHOTO_USER_QUOTA_BYTES: '1000',
  };
  const user = { id: 23 };
  insertTestUser(env, user.id);
  insertTestUser(env, 24);
  const dependencies = createJsonDependencies();
  const marker = { id: 'marker-1', lat: 39.9, lng: 116.4, photos: [{ id: 'photo-1', note: '海边' }] };
  await pushCloudMutations(new Request('https://api.test/api/v2/sync/push', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations: [{ mutationId: 'marker-create', type: 'marker.upsert', entityId: marker.id, baseVersion: 0, marker }] }),
  }), env, user, dependencies);

  const bytes = Buffer.from('photo image bytes');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const metadata = {
    markerId: marker.id, photoId: 'photo-1', variant: 'original', size: bytes.length,
    contentType: 'image/jpeg', sha256, mutationId: 'photo-upload-1',
  };
  const start = async () => startPhotoUpload(new Request('https://api.test/api/v2/photos/uploads', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metadata),
  }), env, user, dependencies);
  const created = await start();
  const session = await created.json();
  assert.equal(created.status, 201);
  const replay = await start();
  assert.equal(replay.status, 200);
  assert.equal((await getStorageStatus(new Request('https://api.test/api/v2/storage/status'), env, user, dependencies).then(r => r.json())).reservedBytes, bytes.length);

  const upload = await putPhotoUpload(new Request('https://api.test/api/v2/photos/uploads', {
    method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'Content-Length': String(bytes.length) }, body: bytes,
  }), env, user, session.uploadId, dependencies);
  assert.equal(upload.status, 200);
  const complete = await completePhotoUpload(new Request('https://api.test/api/v2/photos/uploads/complete', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  }), env, user, session.uploadId, dependencies);
  assert.equal(complete.status, 200);
  const replayComplete = await completePhotoUpload(new Request('https://api.test/api/v2/photos/uploads/complete', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  }), env, user, session.uploadId, dependencies);
  assert.equal((await replayComplete.json()).idempotent, true);

  const ranged = await readPhotoContent(new Request('https://api.test/api/v2/photos/photo-1/content', {
    headers: { Range: 'bytes=0-4' },
  }), env, user, 'photo-1', 'original');
  assert.equal(ranged.status, 206);
  assert.equal(await ranged.text(), 'photo');
  const otherAccount = await readPhotoContent(new Request('https://api.test/api/v2/photos/photo-1/content'), env, { id: 24 }, 'photo-1', 'original');
  assert.equal(otherAccount.status, 404);
  const status = await getStorageStatus(new Request('https://api.test/api/v2/storage/status'), env, user, dependencies);
  assert.equal((await status.json()).usedBytes, bytes.length);
  assert.equal(env.PHOTOS.objects.size, 1);
  env.DB.close();
});

test('rejects a file whose bytes do not match the reserved SHA-256', async () => {
  const env = { DB: createTestD1(), PHOTOS: createTestR2(), CLOUD_PHOTO_STORAGE_ENABLED: 'true' };
  const user = { id: 31 };
  insertTestUser(env, user.id);
  const dependencies = createJsonDependencies();
  const marker = { id: 'marker-2', lat: 1, lng: 2, photos: [{ id: 'photo-2', note: '' }] };
  await pushCloudMutations(new Request('https://api.test/api/v2/sync/push', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations: [{ mutationId: 'marker-create-2', type: 'marker.upsert', entityId: marker.id, baseVersion: 0, marker }] }),
  }), env, user, dependencies);
  const expected = Buffer.from('correct bytes');
  const metadata = {
    markerId: marker.id, photoId: 'photo-2', variant: 'original', size: expected.length,
    contentType: 'image/jpeg', sha256: createHash('sha256').update(expected).digest('hex'), mutationId: 'photo-upload-2',
  };
  const start = await startPhotoUpload(new Request('https://api.test/api/v2/photos/uploads', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metadata),
  }), env, user, dependencies);
  const { uploadId } = await start.json();
  const wrong = await putPhotoUpload(new Request('https://api.test/api/v2/photos/uploads', {
    method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'Content-Length': String(expected.length) }, body: Buffer.from('wrong bytes!'),
  }), env, user, uploadId, dependencies);
  assert.equal(wrong.status, 400);
  assert.equal(env.PHOTOS.objects.size, 0);
  env.DB.close();
});

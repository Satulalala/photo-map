import { createAuthFlows } from './auth-flows.js';
import * as photoStorage from './photo-storage.js';
import * as syncV2 from './sync-v2.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_COOKIE = 'photomap_session';
const SESSION_SECONDS = 24 * 60 * 60;
const DESKTOP_APP_ORIGINS = new Set([
  'photomap://app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
]);
// Production Workers caps WebCrypto PBKDF2 at 100,000 iterations.
// A separate server-held pepper protects password hashes if the database leaks.
const PBKDF2_ITERATIONS = 100_000;
const MAX_BODY_BYTES = 1_000_000;
const MAX_MARKERS_PER_PUSH = 500;
const MAX_PHOTOS_PER_MARKER = 250;

const SECURITY_HEADERS = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

function json(data, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS,
    ...extraHeaders,
  });
  return new Response(JSON.stringify(data), { status, headers });
}

function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function bytesToHex(bytes) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value) {
  if (!/^(?:[a-f\d]{2})+$/i.test(value)) return null;
  return Uint8Array.from(value.match(/.{2}/g), byte => Number.parseInt(byte, 16));
}

async function pepperedPassword(password, pepper) {
  if (typeof pepper !== 'string' || encoder.encode(pepper).length < 32) {
    throw new Error('PASSWORD_PEPPER must contain at least 32 bytes');
  }
  const key = await crypto.subtle.importKey('raw', encoder.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', key, encoder.encode(password));
}

async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16)), pepper) {
  const input = await pepperedPassword(password, pepper);
  const key = await crypto.subtle.importKey('raw', input, 'PBKDF2', false, ['deriveBits']);
  const hash = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
      key,
      256
    )
  );
  return `pbkdf2-sha256-peppered$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
}

async function verifyPassword(password, encoded, pepper) {
  const [scheme, iterationText, saltText, hashText] = String(encoded || '').split('$');
  const iterations = Number(iterationText);
  const salt = hexToBytes(saltText || '');
  const expected = hexToBytes(hashText || '');
  if (
    !['pbkdf2-sha256', 'pbkdf2-sha256-peppered'].includes(scheme) ||
    !Number.isInteger(iterations) ||
    iterations < 100_000 ||
    iterations > PBKDF2_ITERATIONS ||
    !salt ||
    salt.length !== 16 ||
    !expected ||
    expected.length !== 32
  ) {
    return false;
  }

  const input = scheme === 'pbkdf2-sha256-peppered'
    ? await pepperedPassword(password, pepper)
    : encoder.encode(password);
  const key = await crypto.subtle.importKey('raw', input, 'PBKDF2', false, ['deriveBits']);
  const actual = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
      key,
      256
    )
  );
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual[index] ^ expected[index];
  }
  return difference === 0;
}

async function createJwt(user, secret) {
  if (!secret || encoder.encode(secret).length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 bytes');
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = base64UrlEncode(
    encoder.encode(
      JSON.stringify({
        sub: String(user.id),
        email: user.email,
        ver: Number(user.auth_version || 0),
        iat: now,
        exp: now + SESSION_SECONDS,
      })
    )
  );
  const input = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(input));
  return `${input}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function readJwt(token, secret) {
  if (!secret || encoder.encode(secret).length < 32) return null;
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;

  try {
    const header = JSON.parse(decoder.decode(base64UrlDecode(parts[0])));
    const payload = JSON.parse(decoder.decode(base64UrlDecode(parts[1])));
    if (header.alg !== 'HS256' || !Number.isInteger(Number(payload.sub))) return null;
    if (!Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(parts[2]),
      encoder.encode(`${parts[0]}.${parts[1]}`)
    );
    return valid
      ? { id: Number(payload.sub), email: payload.email, authVersion: Number(payload.ver || 0) }
      : null;
  } catch {
    return null;
  }
}

function cookieValue(request, name) {
  const cookies = request.headers.get('Cookie') || '';
  for (const entry of cookies.split(';')) {
    const [key, ...value] = entry.trim().split('=');
    if (key === name) return value.join('=');
  }
  return null;
}

function sessionCookie(request, token, clear = false, crossSite = false) {
  const desktopRequest = crossSite || DESKTOP_APP_ORIGINS.has(request.headers.get('Origin'));
  const secure = new URL(request.url).protocol === 'https:' || desktopRequest ? '; Secure' : '';
  const sameSite = desktopRequest ? 'None' : 'Lax';
  const maxAge = clear ? 0 : SESSION_SECONDS;
  const value = clear ? '' : token;
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}${secure}`;
}

function hasTrustedOrigin(request) {
  const origin = request.headers.get('Origin');
  if (DESKTOP_APP_ORIGINS.has(origin)) return true;
  if (origin && origin !== new URL(request.url).origin) return false;
  return request.headers.get('Sec-Fetch-Site') !== 'cross-site';
}

async function readJson(request) {
  const contentLength = request.headers.get('Content-Length');
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) return { error: '请求内容过大' };

  const reader = request.body?.getReader();
  if (!reader) return { error: '请求内容为空' };
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      return { error: '请求内容过大' };
    }
    chunks.push(value);
  }

  try {
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { value: JSON.parse(decoder.decode(bytes)) };
  } catch {
    return { error: '请求格式错误' };
  }
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function hasJwtSecret(env) {
  return typeof env.JWT_SECRET === 'string' && encoder.encode(env.JWT_SECRET).length >= 32;
}

async function authRateLimited(env, request, email) {
  if (!env.AUTH_RATE_LIMITER) return false;
  const pathname = new URL(request.url).pathname;
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  const keyDigest = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`${pathname}:${clientIp}:${email}`)
  );
  const key = [...new Uint8Array(keyDigest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const { success } = await env.AUTH_RATE_LIMITER.limit({ key });
  return !success;
}

function userInfo(row) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    type: row.github_id ? 'github' : 'email',
  };
}

function authenticatedResponse(request, token, row) {
  return json(
    { ok: true, user: userInfo(row) },
    200,
    { 'Set-Cookie': sessionCookie(request, token) }
  );
}

async function register(request, env) {
  if (!hasTrustedOrigin(request)) return json({ ok: false, error: '请求来源无效' }, 403);
  const parsed = await readJson(request);
  if (parsed.error) return json({ ok: false, error: parsed.error }, 400);
  if (!parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }

  const email = normalizeEmail(parsed.value.email);
  const password = parsed.value.password;
  if (!email || typeof password !== 'string' || password.length < 6 || password.length > 128) {
    return json({ ok: false, error: '邮箱或密码格式无效' }, 400);
  }
  if (await authRateLimited(env, request, email)) {
    return json({ ok: false, error: '操作过于频繁，请稍后重试' }, 429);
  }

  const passwordHash = await hashPassword(password, undefined, env.PASSWORD_PEPPER);
  const result = await env.DB.prepare(
    'INSERT INTO users (email, password_hash, username, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO NOTHING'
  )
    .bind(email, passwordHash, email.split('@')[0], Date.now())
    .run();

  if (!result.meta.changes) return json({ ok: false, error: '邮箱已被注册' }, 409);
  const row = await env.DB.prepare(
    'SELECT id, email, username, github_id, auth_version FROM users WHERE email = ?'
  )
    .bind(email)
    .first();
  const token = await createJwt(row, env.JWT_SECRET);
  return authenticatedResponse(request, token, row);
}

async function login(request, env) {
  if (!hasTrustedOrigin(request)) return json({ ok: false, error: '请求来源无效' }, 403);
  const parsed = await readJson(request);
  if (parsed.error) return json({ ok: false, error: parsed.error }, 400);
  if (!parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }

  const email = normalizeEmail(parsed.value.email);
  const password = parsed.value.password;
  if (!email || typeof password !== 'string' || password.length < 1 || password.length > 128) {
    return json({ ok: false, error: '邮箱或密码错误' }, 401);
  }
  if (await authRateLimited(env, request, email)) {
    return json({ ok: false, error: '操作过于频繁，请稍后重试' }, 429);
  }

  const row = await env.DB.prepare(
    'SELECT id, email, username, password_hash, github_id, auth_version FROM users WHERE email = ?'
  )
    .bind(email)
    .first();
  const hasPasswordHash = typeof row?.password_hash === 'string' && row.password_hash.startsWith('pbkdf2-sha256');
  const passwordMatches = hasPasswordHash
    ? await verifyPassword(password, row.password_hash, env.PASSWORD_PEPPER)
    : await hashPassword(password, new Uint8Array(16), env.PASSWORD_PEPPER).then(() => false);
  if (!row || !passwordMatches) return json({ ok: false, error: '邮箱或密码错误' }, 401);

  const token = await createJwt(row, env.JWT_SECRET);
  return authenticatedResponse(request, token, row);
}

async function authenticatedUser(request, env) {
  const authorization = request.headers.get('Authorization') || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : cookieValue(request, SESSION_COOKIE);
  const claims = await readJwt(token, env.JWT_SECRET);
  if (!claims) return null;
  const user = await env.DB.prepare(
    'SELECT id, email, username, github_id, auth_version FROM users WHERE id = ?'
  )
    .bind(claims.id)
    .first();
  if (!user || Number(user.auth_version || 0) !== claims.authVersion) return null;
  return user;
}

const authFlows = createAuthFlows({
  json,
  readJson,
  normalizeEmail,
  hasTrustedOrigin,
  authRateLimited,
  authenticatedUser,
  userInfo,
  createJwt,
  sessionCookie,
  cookieValue,
  oauthStateCookie: (request, value, clear = false) => {
    const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
    const maxAge = clear ? 0 : 10 * 60;
    return `photomap_oauth_state=${clear ? '' : value}; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
  },
  hashPassword: (password, env) => hashPassword(password, undefined, env.PASSWORD_PEPPER),
});

function safeTimestamp(value, fallback) {
  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) && timestamp >= 0 ? timestamp : fallback;
}

function sanitizeMarker(marker, now) {
  if (!marker || typeof marker.id !== 'string' || !marker.id.trim() || marker.id.length > 160) return null;
  if (!Number.isFinite(marker.lat) || marker.lat < -90 || marker.lat > 90) return null;
  if (!Number.isFinite(marker.lng) || marker.lng < -180 || marker.lng > 180) return null;

  const photos = Array.isArray(marker.photos) ? marker.photos.slice(0, MAX_PHOTOS_PER_MARKER) : [];
  const sanitizedPhotos = photos
    .filter(photo => photo && typeof photo.id === 'string' && photo.id.length <= 160)
    .map(photo => ({
      id: photo.id,
      note: typeof photo.note === 'string' ? photo.note.slice(0, 5000) : '',
      createdAt: safeTimestamp(photo.createdAt, now),
    }));
  const createdAt = safeTimestamp(marker.createdAt, now);
  const updatedAt = safeTimestamp(marker.updatedAt, createdAt);

  return {
    id: marker.id,
    lat: marker.lat,
    lng: marker.lng,
    name: typeof marker.name === 'string' ? marker.name.slice(0, 500) : '',
    createdAt,
    updatedAt,
    photoCount: Math.max(
      sanitizedPhotos.length,
      Number.isSafeInteger(marker.photoCount) && marker.photoCount >= 0 ? marker.photoCount : 0
    ),
    photos: sanitizedPhotos,
  };
}

async function pushMarkers(request, env, user) {
  if (!hasTrustedOrigin(request)) return json({ ok: false, error: '请求来源无效' }, 403);
  const parsed = await readJson(request);
  if (parsed.error) return json({ ok: false, error: parsed.error }, 400);
  if (!parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }
  if (!Array.isArray(parsed.value.markers) || parsed.value.markers.length > MAX_MARKERS_PER_PUSH) {
    return json({ ok: false, error: '标记数量无效' }, 400);
  }

  const now = Date.now();
  const uniqueMarkers = new Map();
  for (const item of parsed.value.markers) {
    const marker = sanitizeMarker(item, now);
    if (!marker) continue;
    const existing = uniqueMarkers.get(marker.id);
    if (!existing || marker.updatedAt >= existing.updatedAt) uniqueMarkers.set(marker.id, marker);
  }

  let accepted = 0;
  const queries = [...uniqueMarkers.values()].map(marker =>
    env.DB.prepare(
      'INSERT INTO sync_markers (user_id, marker_id, updated_at, created_at, payload_json) VALUES (?, ?, ?, ?, ?) ' +
        'ON CONFLICT(user_id, marker_id) DO UPDATE SET updated_at = excluded.updated_at, created_at = excluded.created_at, payload_json = excluded.payload_json ' +
        'WHERE excluded.updated_at >= sync_markers.updated_at'
    ).bind(user.id, marker.id, marker.updatedAt, marker.createdAt, JSON.stringify(marker))
  );

  for (let offset = 0; offset < queries.length; offset += 50) {
    const results = await env.DB.batch(queries.slice(offset, offset + 50));
    accepted += results.reduce((total, result) => total + (result.meta.changes || 0), 0);
  }

  return json({ ok: true, serverTime: now, accepted });
}

async function pullMarkers(request, env, user) {
  const rawSince = new URL(request.url).searchParams.get('since') || '0';
  const since = Number(rawSince);
  if (!Number.isSafeInteger(since) || since < 0) return json({ ok: false, error: '时间戳无效' }, 400);

  const result = await env.DB.prepare(
    'SELECT payload_json FROM sync_markers WHERE user_id = ? AND updated_at > ? ORDER BY updated_at, marker_id'
  )
    .bind(user.id, since)
    .all();
  return json({
    ok: true,
    serverTime: Date.now(),
    markers: result.results.map(row => JSON.parse(row.payload_json)),
  });
}

function withSecurityHeaders(response, request) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  if (new URL(request.url).protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function withCors(response, request) {
  const origin = request.headers.get('Origin');
  if (!DESKTOP_APP_ORIGINS.has(origin)) return response;
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Range, If-None-Match, If-Range');
  headers.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range, ETag');
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Max-Age', '600');
  const vary = headers.get('Vary');
  headers.set('Vary', vary ? `${vary}, Origin` : 'Origin');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function routeApi(request, env, context) {
  const url = new URL(request.url);
  if (url.pathname === '/api/health' && request.method === 'GET') {
    const database = await env.DB.prepare('SELECT 1 AS ok').first();
    return json({
      ok: database?.ok === 1,
      service: 'photomap',
      storage: 'd1',
      photoStorage: env.CLOUD_PHOTO_STORAGE_ENABLED === 'true' && !!env.PHOTOS,
      authReady: hasJwtSecret(env),
    });
  }
  if ((url.pathname.startsWith('/api/v1/') || url.pathname.startsWith('/api/v2/')) && !hasJwtSecret(env)) {
    return json({ ok: false, error: '服务认证尚未配置' }, 503);
  }

  if (url.pathname === '/api/v1/auth/register' && request.method === 'POST') return register(request, env);
  if (url.pathname === '/api/v1/auth/login' && request.method === 'POST') return login(request, env);
  if (url.pathname === '/api/v1/auth/logout' && request.method === 'POST') {
    if (!hasTrustedOrigin(request)) return json({ ok: false, error: '请求来源无效' }, 403);
    return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(request, '', true) });
  }
  if (url.pathname === '/api/v1/auth/providers' && request.method === 'GET') return authFlows.providers(env);
  if (url.pathname === '/api/v1/auth/me' && request.method === 'GET') return authFlows.currentUser(request, env);
  if (url.pathname === '/api/v1/auth/github' && request.method === 'GET') return authFlows.startGitHub(request, env);
  if (url.pathname === '/api/v1/auth/github/callback' && request.method === 'GET') {
    return authFlows.finishGitHub(request, env);
  }
  if (url.pathname === '/api/v1/auth/password-reset/request' && request.method === 'POST') {
    return authFlows.requestPasswordReset(request, env, context);
  }
  if (url.pathname === '/api/v1/auth/password-reset/confirm' && request.method === 'POST') {
    return authFlows.confirmPasswordReset(request, env);
  }

  if (url.pathname.startsWith('/api/v2/')) {
    const user = await authenticatedUser(request, env);
    if (!user) return json({ ok: false, error: '未登录' }, 401);
    const dependencies = { json, readJson, hasTrustedOrigin, context };
    if (url.pathname === '/api/v2/storage/status' && request.method === 'GET') {
      return photoStorage.getStorageStatus(request, env, user, dependencies);
    }
    if (url.pathname === '/api/v2/photos/uploads' && request.method === 'POST') {
      return photoStorage.startPhotoUpload(request, env, user, dependencies);
    }
    if (url.pathname === '/api/v2/sync/push' && request.method === 'POST') {
      return syncV2.pushCloudMutations(request, env, user, dependencies);
    }
    if (url.pathname === '/api/v2/sync/pull' && request.method === 'GET') {
      return syncV2.pullCloudChanges(request, env, user, dependencies);
    }
    const completeMatch = /^\/api\/v2\/photos\/uploads\/([^/]+)\/complete$/.exec(url.pathname);
    if (completeMatch && request.method === 'POST') {
      return photoStorage.completePhotoUpload(request, env, user, decodeURIComponent(completeMatch[1]), dependencies);
    }
    const uploadMatch = /^\/api\/v2\/photos\/uploads\/([^/]+)$/.exec(url.pathname);
    if (uploadMatch && request.method === 'PUT') {
      return photoStorage.putPhotoUpload(request, env, user, decodeURIComponent(uploadMatch[1]), dependencies);
    }
    const contentMatch = /^\/api\/v2\/photos\/([^/]+)\/content$/.exec(url.pathname);
    if (contentMatch && request.method === 'GET') {
      return photoStorage.readPhotoContent(
        request, env, user, decodeURIComponent(contentMatch[1]), url.searchParams.get('variant') || 'original'
      );
    }
    return json({ ok: false, error: '接口不存在' }, 404);
  }

  if (url.pathname === '/api/v1/sync/push' && request.method === 'POST') {
    if (env.CLOUD_SYNC_V2_ENABLED === 'true') {
      return json({ ok: false, error: '当前客户端版本过旧，请更新后继续同步' }, 410);
    }
    const user = await authenticatedUser(request, env);
    if (!user) return json({ ok: false, error: '未登录' }, 401);
    return pushMarkers(request, env, user);
  }
  if (url.pathname === '/api/v1/sync/pull' && request.method === 'GET') {
    const user = await authenticatedUser(request, env);
    if (!user) return json({ ok: false, error: '未登录' }, 401);
    return pullMarkers(request, env, user);
  }

  return json({ ok: false, error: '接口不存在' }, 404);
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') && request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin');
      const status = DESKTOP_APP_ORIGINS.has(origin) || origin === url.origin ? 204 : 403;
      const response = withCors(new Response(null, { status }), request);
      return withSecurityHeaders(response, request);
    }
    try {
      if (url.pathname.startsWith('/api/')) {
        return withSecurityHeaders(withCors(await routeApi(request, env, context), request), request);
      }
      return withSecurityHeaders(await env.ASSETS.fetch(request), request);
    } catch (error) {
      console.error('PhotoMap Worker request failed:', error?.name || 'Error');
      const response = json({ ok: false, error: '服务暂时不可用，请稍后重试' }, 500);
      return url.pathname.startsWith('/api/')
        ? withSecurityHeaders(withCors(response, request), request)
        : withSecurityHeaders(response, request);
    }
  },
};

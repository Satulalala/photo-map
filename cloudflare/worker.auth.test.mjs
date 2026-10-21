import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { createAuthFlows } from './auth-flows.js';

test('Worker authentication in the actual Workers runtime', async t => {
  const runtime = new Miniflare(convertV4MiniflareOptions({
    workers: [{
      modules: ['worker.js', 'auth-flows.js', 'photo-storage.js', 'sync-v2.js'].map(file => ({
      type: 'ESModule',
      path: fileURLToPath(new URL(`./${file}`, import.meta.url)),
    })),
    compatibilityDate: '2026-10-10',
    bindings: {
      JWT_SECRET: 'local-auth-test-secret-with-at-least-32-bytes',
      PASSWORD_PEPPER: 'local-password-pepper-with-at-least-32-bytes',
      GITHUB_CLIENT_ID: 'test-client',
      GITHUB_CLIENT_SECRET: 'test-secret',
      AUTH_EMAIL_FROM: 'no-reply@mail.photomap.satula.top',
      AUTH_EMAIL_ENABLED: 'false',
      TENCENT_SECRET_ID: 'test-secret-id',
      TENCENT_SECRET_KEY: 'test-secret-key',
      TENCENT_SES_TEMPLATE_ID: '224741',
    },
    d1Databases: ['DB'],
    }],
  }));
  t.after(() => runtime.dispose());
  const database = await runtime.getD1Database('DB');
  for (const file of ['0001_create_users_and_sync_markers.sql', '0002_add_auth_providers_and_password_reset.sql']) {
    const sql = await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8');
    for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) {
      await database.prepare(statement).run();
    }
  }
  const origin = 'https://photomap.test';
  const call = (route, body, headers = {}) => runtime.dispatchFetch(`${origin}${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });
  const credentials = { email: 'worker-auth-test@example.invalid', password: 'test-password-2026' };
  let session;

  await t.test('provider status keeps rejected email templates disabled', async () => {
    const response = await call('/api/v1/auth/providers');
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).providers, { github: true, passwordRecovery: false });
    assert.equal((await call('/api/v1/auth/password-reset/request', { email: credentials.email })).status, 503);
  });
  await t.test('rejects foreign origins and malformed registration', async () => {
    assert.equal((await call('/api/v1/auth/register', credentials, { Origin: 'https://attacker.invalid' })).status, 403);
    assert.equal((await call('/api/v1/auth/register', { email: 'bad', password: 'x' })).status, 400);
  });
  await t.test('registers with an HttpOnly session and prevents duplicate accounts', async () => {
    const response = await call('/api/v1/auth/register', credentials);
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    assert.equal(data.user.email, credentials.email);
    assert.equal(data.token, undefined);
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    session = cookie.split(';')[0];
    assert.equal((await call('/api/v1/auth/register', credentials)).status, 409);
  });
  await t.test('validates the password and session', async () => {
    assert.equal((await call('/api/v1/auth/login', { ...credentials, password: 'incorrect' })).status, 401);
    assert.equal((await call('/api/v1/auth/login', credentials)).status, 200);
    assert.equal((await call('/api/v1/auth/me', undefined, { Cookie: session })).status, 200);
    assert.equal((await call('/api/v1/auth/me')).status, 401);
    const logout = await call('/api/v1/auth/logout', {});
    assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
  });
  await t.test('OAuth only redirects to trusted destinations and checks state', async () => {
    assert.equal((await call('/api/v1/auth/github?return_to=https://attacker.invalid')).status, 400);
    const response = await call(`/api/v1/auth/github?return_to=${encodeURIComponent(origin)}`);
    assert.equal(response.status, 302);
    const destination = new URL(response.headers.get('location'));
    assert.equal(destination.origin, 'https://github.com');
    assert.equal(destination.searchParams.get('redirect_uri'), `${origin}/api/v1/auth/github/callback`);
    assert.ok(destination.searchParams.get('state'));
    assert.match(response.headers.get('set-cookie'), /HttpOnly/);
    assert.equal((await call('/api/v1/auth/github/callback?code=fake&state=fake')).status, 400);
  });
  await t.test('password resets are single-use and invalidate previous sessions', async () => {
    const token = 'test-reset-token-with-more-than-32-characters';
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await database.prepare('SELECT id FROM users WHERE email = ?').bind(credentials.email).first();
    await database.prepare('INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(tokenHash, user.id, Date.now() + 60_000).run();
    const body = { token, password: 'new-test-password' };
    assert.equal((await call('/api/v1/auth/password-reset/confirm', body)).status, 200);
    assert.equal((await call('/api/v1/auth/me', undefined, { Cookie: session })).status, 401);
    assert.equal((await call('/api/v1/auth/login', credentials)).status, 401);
    assert.equal((await call('/api/v1/auth/login', { ...credentials, password: body.password })).status, 200);
    assert.equal((await call('/api/v1/auth/password-reset/confirm', body)).status, 400);
  });
  await t.test('verified GitHub emails cannot silently take over an existing password account', async context => {
    let githubEmail = credentials.email;
    context.mock.method(globalThis, 'fetch', async url => {
      if (String(url).includes('/login/oauth/access_token')) {
        return Response.json({ access_token: 'test-oauth-token' });
      }
      if (String(url).endsWith('/user/emails')) {
        return Response.json([{ email: githubEmail, primary: true, verified: true }]);
      }
      return Response.json({ id: 12345, login: 'test-github-user' });
    });
    const flows = createAuthFlows({
      json: (data, status = 200, headers) => Response.json(data, { status, headers }),
      normalizeEmail: value => value?.toLowerCase() || null,
      authenticatedUser: async () => null,
      userInfo: row => ({ id: row.id, email: row.email }),
      createJwt: async () => 'test-session-token',
      sessionCookie: () => 'photomap_session=test-session-token; HttpOnly; Secure',
      oauthStateCookie: () => 'photomap_oauth_state=; Max-Age=0',
      cookieValue: () => Buffer.from(JSON.stringify({
        state: 'test-state', returnTo: origin, expiresAt: Date.now() + 60_000,
      })).toString('base64url'),
    });
    const env = { DB: database, GITHUB_CLIENT_ID: 'test-client', GITHUB_CLIENT_SECRET: 'test-secret' };
    const request = () => new Request(`${origin}/api/v1/auth/github/callback?state=test-state&code=test-code`);
    const conflict = await flows.finishGitHub(request(), env);
    assert.equal(new URL(conflict.headers.get('location')).searchParams.get('auth_reason'), 'account_conflict');
    const unchanged = await database.prepare('SELECT github_id FROM users WHERE email = ?').bind(credentials.email).first();
    assert.equal(unchanged.github_id, null);
    githubEmail = 'new-github-user@example.invalid';
    const success = await flows.finishGitHub(request(), env);
    assert.equal(new URL(success.headers.get('location')).searchParams.get('auth'), 'github-success');
    assert.match(success.headers.get('set-cookie'), /photomap_session=/);
    assert.ok(!success.headers.get('location').includes('test-session-token'));
    await flows.finishGitHub(request(), env);
    const count = await database.prepare('SELECT COUNT(*) AS count FROM users WHERE github_id = ?').bind('12345').first();
    assert.equal(count.count, 1);
  });
  await t.test('SES receives only a token variable and the template preserves its fixed domain', async context => {
    let payload;
    context.mock.method(globalThis, 'fetch', async (url, options) => {
      assert.equal(url, 'https://ses.tencentcloudapi.com/');
      assert.equal(options.headers['X-TC-Action'], 'SendEmail');
      assert.equal(options.headers['X-TC-Region'], 'ap-hongkong');
      assert.match(options.headers.Authorization, /^TC3-HMAC-SHA256 Credential=/);
      payload = JSON.parse(options.body);
      return Response.json({ Response: { MessageId: 'test-only-message' } });
    });
    const flows = createAuthFlows({
      json: (data, status = 200) => Response.json(data, { status }),
      readJson: async request => ({ value: await request.json() }),
      normalizeEmail: value => value?.toLowerCase(),
      hasTrustedOrigin: () => true,
      authRateLimited: async () => false,
    });
    const tasks = [];
    const response = await flows.requestPasswordReset(new Request(`${origin}/api/v1/auth/password-reset/request`, {
      method: 'POST', body: JSON.stringify({ email: credentials.email }),
    }), {
      DB: database, AUTH_EMAIL_ENABLED: 'true', AUTH_EMAIL_FROM: 'no-reply@mail.photomap.satula.top',
      TENCENT_SECRET_ID: 'test-id', TENCENT_SECRET_KEY: 'test-key', TENCENT_SES_TEMPLATE_ID: '224741',
    }, { waitUntil: task => tasks.push(task) });
    assert.equal(response.status, 200);
    await Promise.all(tasks);
    assert.equal(payload.Template.TemplateID, 224741);
    const variables = JSON.parse(payload.Template.TemplateData);
    assert.deepEqual(Object.keys(variables), ['resetToken']);
    assert.match(variables.resetToken, /^[A-Za-z0-9_-]{43}$/);
    const tokenHash = createHash('sha256').update(variables.resetToken).digest('hex');
    const stored = await database.prepare('SELECT token_hash FROM password_reset_tokens WHERE token_hash = ?').bind(tokenHash).first();
    assert.equal(stored.token_hash, tokenHash);
    const html = await readFile(new URL('./password-reset-template.html', import.meta.url), 'utf8');
    assert.ok(html.includes('href="https://photomap.satula.top/#reset_password={{resetToken}}"'));
    assert.ok(!html.includes('{{resetUrl}}'));
  });
});

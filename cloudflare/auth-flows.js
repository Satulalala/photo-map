const encoder = new TextEncoder();
const decoder = new TextDecoder();
const OAUTH_STATE_COOKIE = 'photomap_oauth_state';
const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const LOCAL_APP_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
]);

function bytesToHex(bytes) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
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

function randomToken() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  return bytesToHex(new Uint8Array(digest));
}

function isEmailSenderConfigured(env) {
  const templateId = Number(env.TENCENT_SES_TEMPLATE_ID);
  const region = env.TENCENT_SES_REGION || 'ap-hongkong';
  return Boolean(
    env.AUTH_EMAIL_ENABLED === 'true' &&
      env.TENCENT_SECRET_ID &&
      env.TENCENT_SECRET_KEY &&
      Number.isSafeInteger(templateId) &&
      templateId > 0 &&
      ['ap-guangzhou', 'ap-hongkong'].includes(region) &&
      env.AUTH_EMAIL_FROM &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.AUTH_EMAIL_FROM)
  );
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function hmacSha256(key, value) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value)));
}

async function sendTencentSesEmail(env, recipient, resetToken) {
  const host = 'ses.tencentcloudapi.com';
  const region = env.TENCENT_SES_REGION || 'ap-hongkong';
  const templateId = Number(env.TENCENT_SES_TEMPLATE_ID);
  if (!isEmailSenderConfigured(env)) throw new Error('email_sender_unavailable');

  const payload = JSON.stringify({
    FromEmailAddress: `PhotoMap <${env.AUTH_EMAIL_FROM}>`,
    Subject: '重置 PhotoMap 密码',
    Destination: [recipient],
    Template: {
      TemplateID: templateId,
      TemplateData: JSON.stringify({ resetToken }),
    },
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const contentType = 'application/json; charset=utf-8';
  const signedHeaders = 'content-type;host';
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const canonicalRequest = [
    'POST',
    '/',
    '',
    canonicalHeaders,
    signedHeaders,
    await sha256Hex(payload),
  ].join('\n');
  const credentialScope = `${date}/ses/tc3_request`;
  const stringToSign = [
    'TC3-HMAC-SHA256',
    String(timestamp),
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');
  const secretDate = await hmacSha256(encoder.encode(`TC3${env.TENCENT_SECRET_KEY}`), date);
  const secretService = await hmacSha256(secretDate, 'ses');
  const secretSigning = await hmacSha256(secretService, 'tc3_request');
  const signature = bytesToHex(await hmacSha256(secretSigning, stringToSign));
  const authorization =
    `TC3-HMAC-SHA256 Credential=${env.TENCENT_SECRET_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`https://${host}/`, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': contentType,
      'X-TC-Action': 'SendEmail',
      'X-TC-Region': region,
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Version': '2020-10-02',
    },
    body: payload,
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.Response?.Error) throw new Error('tencent_ses_send_failed');
}

function normalizeReturnTo(request, value) {
  if (typeof value !== 'string') return null;
  try {
    const target = new URL(value);
    if (
      target.protocol === 'photomap:' &&
      target.host === 'app' &&
      (target.pathname === '/' || target.pathname === '/index.html')
    ) {
      return 'photomap://app/index.html';
    }

    const allowedOrigins = new Set([new URL(request.url).origin, ...LOCAL_APP_ORIGINS]);
    if ((target.protocol === 'https:' || target.protocol === 'http:') && allowedOrigins.has(target.origin)) {
      return `${target.origin}/`;
    }
  } catch {}
  return null;
}

function cookieIsSecure(request) {
  return new URL(request.url).protocol === 'https:';
}

function oauthStateCookie(request, value, clear = false) {
  const secure = cookieIsSecure(request) ? '; Secure' : '';
  const maxAge = clear ? 0 : OAUTH_STATE_TTL_SECONDS;
  const cookieValue = clear ? '' : value;
  return `${OAUTH_STATE_COOKIE}=${cookieValue}; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function readOAuthState(request, cookieValue) {
  const encoded = cookieValue(request, OAUTH_STATE_COOKIE);
  if (!encoded) return null;
  try {
    const value = JSON.parse(decoder.decode(base64UrlDecode(encoded)));
    if (
      typeof value.state === 'string' &&
      typeof value.returnTo === 'string' &&
      Number.isSafeInteger(value.expiresAt) &&
      value.expiresAt > Date.now()
    ) {
      return value;
    }
  } catch {}
  return null;
}

function oauthResultUrl(returnTo, status, reason) {
  const target = new URL(returnTo);
  target.searchParams.set('auth', status);
  if (reason) target.searchParams.set('auth_reason', reason);
  return target.toString();
}

function redirectResponse(location, cookies = []) {
  const headers = new Headers({
    Location: location,
    'Cache-Control': 'no-store',
  });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers });
}

function authResult(request, returnTo, status, reason, dependencies, extraCookies = []) {
  const cookies = [dependencies.oauthStateCookie(request, '', true), ...extraCookies];
  return redirectResponse(oauthResultUrl(returnTo, status, reason), cookies);
}

async function fetchGitHubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'PhotoMap',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('github_api_failed');
  return response.json();
}

async function githubPrimaryEmail(accessToken) {
  const emails = await fetchGitHubJson('https://api.github.com/user/emails', accessToken);
  if (!Array.isArray(emails)) throw new Error('github_email_unavailable');
  const primary = emails.find(entry => entry?.primary === true && entry?.verified === true);
  return primary?.email || null;
}

async function findOrCreateGitHubUser(env, githubUser, email, linkingUser) {
  const githubId = String(githubUser.id);
  const existingProviderUser = await env.DB.prepare(
    'SELECT id, email, username, github_id, auth_version FROM users WHERE github_id = ?'
  )
    .bind(githubId)
    .first();
  if (existingProviderUser) return existingProviderUser;

  const existingEmailUser = await env.DB.prepare(
    'SELECT id, email, username, github_id, auth_version FROM users WHERE email = ?'
  )
    .bind(email)
    .first();
  if (existingEmailUser) {
    // An unverified email registration must not inherit a verified GitHub account.
    // Linking an existing account requires its already authenticated session.
    if (existingEmailUser.github_id !== githubId && linkingUser?.id !== existingEmailUser.id) {
      throw new Error('github_account_conflict');
    }
    if (existingEmailUser.github_id && existingEmailUser.github_id !== githubId) {
      throw new Error('github_account_conflict');
    }
    await env.DB.prepare('UPDATE users SET github_id = ? WHERE id = ? AND github_id IS NULL')
      .bind(githubId, existingEmailUser.id)
      .run();
    const linkedUser = await env.DB.prepare(
      'SELECT id, email, username, github_id, auth_version FROM users WHERE id = ?'
    )
      .bind(existingEmailUser.id)
      .first();
    if (linkedUser?.github_id !== githubId) throw new Error('github_account_conflict');
    return linkedUser;
  }

  const username = typeof githubUser.login === 'string' ? githubUser.login.slice(0, 100) : email.split('@')[0];
  await env.DB.prepare(
    'INSERT INTO users (email, password_hash, username, created_at, github_id) VALUES (?, ?, ?, ?, ?) ' +
      'ON CONFLICT(email) DO NOTHING'
  )
    .bind(email, `oauth$github$${randomToken()}`, username, Date.now(), githubId)
    .run();

  const createdUser = await env.DB.prepare(
    'SELECT id, email, username, github_id, auth_version FROM users WHERE github_id = ?'
  )
    .bind(githubId)
    .first();
  if (createdUser) return createdUser;

  const racedUser = await env.DB.prepare(
    'SELECT id, email, username, github_id, auth_version FROM users WHERE email = ?'
  )
    .bind(email)
    .first();
  if (racedUser?.github_id === githubId) return racedUser;
  throw new Error('github_account_conflict');
}

export function createAuthFlows(dependencies) {
  const {
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
    oauthStateCookie,
  } = dependencies;

  return {
    providers(env) {
      return json({
        ok: true,
        providers: {
          github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
          passwordRecovery: isEmailSenderConfigured(env),
        },
      });
    },

    async currentUser(request, env) {
      const user = await authenticatedUser(request, env);
      if (!user) return json({ ok: false, error: '登录状态已失效，请重新登录' }, 401);
      return json({ ok: true, user: userInfo(user) });
    },

    async startGitHub(request, env) {
      const requestUrl = new URL(request.url);
      const returnTo = normalizeReturnTo(request, requestUrl.searchParams.get('return_to'));
      if (!returnTo) return json({ ok: false, error: '登录回调地址无效' }, 400);
      if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
        return authResult(request, returnTo, 'error', 'unavailable', dependencies);
      }

      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (env.AUTH_RATE_LIMITER) {
        const { success } = await env.AUTH_RATE_LIMITER.limit({ key: `github-start:${clientIp}` });
        if (!success) return authResult(request, returnTo, 'error', 'throttled', dependencies);
      }

      const state = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
      const statePayload = base64UrlEncode(
        encoder.encode(JSON.stringify({ state, returnTo, expiresAt: Date.now() + OAUTH_STATE_TTL_SECONDS * 1000 }))
      );
      const callbackUrl = env.GITHUB_CALLBACK_URL || `${requestUrl.origin}/api/v1/auth/github/callback`;
      const authorizationUrl = new URL('https://github.com/login/oauth/authorize');
      authorizationUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      authorizationUrl.searchParams.set('redirect_uri', callbackUrl);
      authorizationUrl.searchParams.set('scope', 'read:user user:email');
      authorizationUrl.searchParams.set('state', state);

      return redirectResponse(authorizationUrl.toString(), [oauthStateCookie(request, statePayload)]);
    },

    async finishGitHub(request, env) {
      const url = new URL(request.url);
      const stateData = readOAuthState(request, cookieValue);
      if (!stateData || stateData.state !== url.searchParams.get('state')) {
        return json({ ok: false, error: 'GitHub 登录状态已失效，请重试' }, 400, {
          'Set-Cookie': oauthStateCookie(request, '', true),
        });
      }

      const returnTo = normalizeReturnTo(request, stateData.returnTo);
      if (!returnTo) return json({ ok: false, error: '登录回调地址无效' }, 400);
      if (url.searchParams.has('error')) {
        const reason = url.searchParams.get('error') === 'access_denied' ? 'cancelled' : 'failed';
        return authResult(request, returnTo, 'error', reason, dependencies);
      }

      const code = url.searchParams.get('code');
      if (!code || !env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
        return authResult(request, returnTo, 'error', 'failed', dependencies);
      }

      try {
        const callbackUrl = env.GITHUB_CALLBACK_URL || `${url.origin}/api/v1/auth/github/callback`;
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'PhotoMap' },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: callbackUrl,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || typeof tokenData.access_token !== 'string') {
          throw new Error('github_token_exchange_failed');
        }

        const githubUser = await fetchGitHubJson('https://api.github.com/user', tokenData.access_token);
        if (!Number.isSafeInteger(githubUser.id) || githubUser.id <= 0) throw new Error('github_user_invalid');
        const email = normalizeEmail(await githubPrimaryEmail(tokenData.access_token));
        if (!email) throw new Error('github_email_unverified');

        const linkingUser = await authenticatedUser(request, env);
        const user = await findOrCreateGitHubUser(env, githubUser, email, linkingUser);
        const token = await createJwt(user, env.JWT_SECRET);
        const isDesktopReturn = returnTo.startsWith('photomap://');
        return redirectResponse(oauthResultUrl(returnTo, 'github-success'), [
          oauthStateCookie(request, '', true),
          sessionCookie(request, token, false, isDesktopReturn),
        ]);
      } catch (error) {
        console.error('PhotoMap GitHub sign-in failed:', error?.message === 'github_account_conflict' ? 'account_conflict' : 'provider_error');
        const reason = error?.message === 'github_account_conflict' ? 'account_conflict' : 'failed';
        return authResult(request, returnTo, 'error', reason, dependencies);
      }
    },

    async requestPasswordReset(request, env, context) {
      if (!hasTrustedOrigin(request)) return json({ ok: false, error: '请求来源无效' }, 403);
      if (!isEmailSenderConfigured(env)) {
        return json({ ok: false, error: '密码找回服务尚未配置' }, 503);
      }

      const parsed = await readJson(request);
      if (parsed.error || !parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
        return json({ ok: false, error: parsed.error || '请求格式错误' }, 400);
      }
      const email = normalizeEmail(parsed.value.email);
      if (!email) return json({ ok: false, error: '请输入有效邮箱地址' }, 400);
      if (await authRateLimited(env, request, email)) {
        return json({ ok: false, error: '操作过于频繁，请稍后重试' }, 429);
      }

      const user = await env.DB.prepare('SELECT id, email FROM users WHERE email = ?').bind(email).first();
      if (user) {
        const token = randomToken();
        const tokenHash = await hashToken(token);
        const expiresAt = Date.now() + PASSWORD_RESET_TTL_MS;
        await env.DB.batch([
          env.DB.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').bind(user.id),
          env.DB.prepare('INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
            .bind(tokenHash, user.id, expiresAt),
        ]);

        context.waitUntil(
          sendTencentSesEmail(env, user.email, token).catch(async error => {
            await env.DB.prepare('DELETE FROM password_reset_tokens WHERE token_hash = ?').bind(tokenHash).run();
            console.error('PhotoMap password reset email failed:', error?.code || error?.name || 'email_error');
          })
        );
      } else {
        await hashToken(randomToken());
      }

      return json({
        ok: true,
        message: '如果该邮箱已注册，我们会发送密码重置邮件，请查收。',
      });
    },

    async confirmPasswordReset(request, env) {
      if (!hasTrustedOrigin(request)) return json({ ok: false, error: '请求来源无效' }, 403);
      const parsed = await readJson(request);
      if (parsed.error || !parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
        return json({ ok: false, error: parsed.error || '请求格式错误' }, 400);
      }

      const { token, password } = parsed.value;
      if (typeof token !== 'string' || token.length < 40 || token.length > 100) {
        return json({ ok: false, error: '重置链接无效或已过期' }, 400);
      }
      if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
        return json({ ok: false, error: '密码长度需为 6 到 128 个字符' }, 400);
      }
      if (await authRateLimited(env, request, 'password-reset')) {
        return json({ ok: false, error: '操作过于频繁，请稍后重试' }, 429);
      }

      const tokenHash = await hashToken(token);
      const reset = await env.DB.prepare(
        'SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND expires_at > ?'
      )
        .bind(tokenHash, Date.now())
        .first();
      if (!reset) {
        return json({ ok: false, error: '重置链接无效或已过期' }, 400);
      }

      const user = await env.DB.prepare('SELECT auth_version FROM users WHERE id = ?').bind(reset.user_id).first();
      const passwordHash = await dependencies.hashPassword(password, env);
      const update = await env.DB.prepare(
        'UPDATE users SET password_hash = ?, auth_version = auth_version + 1 ' +
          'WHERE id = ? AND auth_version = ? AND EXISTS (' +
          'SELECT 1 FROM password_reset_tokens WHERE token_hash = ? AND expires_at > ?)'
      )
        .bind(passwordHash, reset.user_id, user?.auth_version ?? 0, tokenHash, Date.now())
        .run();
      if (!update.meta.changes) {
        return json({ ok: false, error: '重置链接无效或已过期' }, 400);
      }

      await env.DB.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').bind(reset.user_id).run();
      return json({ ok: true, message: '密码已重置，请使用新密码登录。' }, 200, {
        'Set-Cookie': sessionCookie(request, '', true),
      });
    },
  };
}

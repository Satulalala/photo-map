import { apiUrl, IS_WEB_BUILD } from './apiBase.js';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const MAP_SESSION_KEY = 'photo_map_entered';

// Navigation preference only; account access still depends on the server session.
export function hasMapSession() {
  try {
    return localStorage.getItem(MAP_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function rememberMapSession() {
  try {
    localStorage.setItem(MAP_SESSION_KEY, '1');
  } catch {}
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function removeToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

export function removeCurrentUser() {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {}
}

async function postAuth(path, payload, fallback) {
  let response;
  try {
    response = await fetch(apiUrl(path), {
      method: 'POST',
      credentials: IS_WEB_BUILD ? 'same-origin' : 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('网络连接失败，请检查网络后重试');
  }
  let data = null;
  try {
    data = await response.json();
  } catch {}
  if (!response.ok || !data?.ok) throw new Error(data?.error || fallback);
  return data;
}

async function saveAuthenticatedResponse(data) {
  if (data.token) setToken(data.token);
  else removeToken();
  setCurrentUser(data.user);
  return data.user;
}

export async function register(email, password) {
  return saveAuthenticatedResponse(await postAuth('/api/v1/auth/register', { email, password }, '注册失败'));
}

export async function login(email, password) {
  return saveAuthenticatedResponse(await postAuth('/api/v1/auth/login', { email, password }, '登录失败'));
}

export async function requestPasswordReset(email) {
  const data = await postAuth(
    '/api/v1/auth/password-reset/request',
    { email },
    '暂时无法发送重置邮件，请稍后重试'
  );
  return data.message;
}

export async function resetPassword(token, password) {
  const data = await postAuth(
    '/api/v1/auth/password-reset/confirm',
    { token, password },
    '密码重置失败，请重新获取重置邮件'
  );
  removeToken();
  removeCurrentUser();
  try {
    localStorage.removeItem(MAP_SESSION_KEY);
  } catch {}
  return data.message;
}

export async function getAuthProviders() {
  const response = await fetch(apiUrl('/api/v1/auth/providers'), {
    credentials: IS_WEB_BUILD ? 'same-origin' : 'include',
  });
  let data = null;
  try {
    data = await response.json();
  } catch {}
  if (!response.ok || !data?.ok || !data.providers) throw new Error('无法读取登录方式');
  return data.providers;
}

export async function getSessionUser() {
  const response = await fetch(apiUrl('/api/v1/auth/me'), {
    credentials: IS_WEB_BUILD ? 'same-origin' : 'include',
  });
  let data = null;
  try {
    data = await response.json();
  } catch {}
  if (!response.ok || !data?.ok || !data.user) {
    throw new Error(data?.error || '无法读取登录状态');
  }
  setCurrentUser(data.user);
  return data.user;
}

export function githubLoginUrl(returnTo) {
  const url = new URL(apiUrl('/api/v1/auth/github'), window.location.href);
  url.searchParams.set('return_to', returnTo);
  return url.toString();
}

export function logout() {
  removeToken();
  removeCurrentUser();
  try {
    localStorage.removeItem(MAP_SESSION_KEY);
  } catch {}
  void fetch(apiUrl('/api/v1/auth/logout'), {
    method: 'POST',
    credentials: IS_WEB_BUILD ? 'same-origin' : 'include',
  }).catch(() => {});
}

export function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { credentials: IS_WEB_BUILD ? 'same-origin' : 'include', ...options, headers });
}

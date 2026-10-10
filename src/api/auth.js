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

export async function register(email, password) {
  const res = await fetch(apiUrl('/api/v1/auth/register'), {
    method: 'POST',
    credentials: IS_WEB_BUILD ? 'same-origin' : 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || '注册失败');
  }
  if (data.token) setToken(data.token);
  else removeToken();
  setCurrentUser(data.user);
  return data.user;
}

export async function login(email, password) {
  const res = await fetch(apiUrl('/api/v1/auth/login'), {
    method: 'POST',
    credentials: IS_WEB_BUILD ? 'same-origin' : 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || '登录失败');
  }
  if (data.token) setToken(data.token);
  else removeToken();
  setCurrentUser(data.user);
  return data.user;
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

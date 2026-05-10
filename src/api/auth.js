const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const API_BASE = 'http://localhost:8080';

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
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || '注册失败');
  }
  setToken(data.token);
  setCurrentUser(data.user);
  return data.user;
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || '登录失败');
  }
  setToken(data.token);
  setCurrentUser(data.user);
  return data.user;
}

export function logout() {
  removeToken();
  removeCurrentUser();
}

export function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}

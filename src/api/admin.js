import { apiUrl } from './apiBase.js';

async function requestAdminApi(path, options = {}) {
  let response;
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: options.body
        ? { 'Content-Type': 'application/json', ...options.headers }
        : options.headers,
    });
  } catch {
    throw new Error('无法连接管理服务，请检查网络后重试');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {}
  if (!response.ok || !data?.ok) {
    const error = new Error(data?.error || '管理请求失败，请稍后重试');
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function getAdminSummary() {
  const result = await requestAdminApi('/api/v1/admin/summary');
  return result.summary;
}

export async function getAdminUsers({ query = '', cursor = null, limit = 25 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query) params.set('q', query);
  if (cursor) params.set('cursor', String(cursor));
  return requestAdminApi(`/api/v1/admin/users?${params.toString()}`);
}

export async function getAdminAudit({ cursor = null, limit = 25 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', String(cursor));
  return requestAdminApi(`/api/v1/admin/audit?${params.toString()}`);
}

export async function setAdminUserStatus(id, status, reason) {
  return requestAdminApi(`/api/v1/admin/users/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, reason }),
  });
}

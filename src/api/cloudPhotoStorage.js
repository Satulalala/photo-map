import { authFetch, getCurrentUser } from './auth.js';
import { apiUrl } from './apiBase.js';

async function readResponse(response) {
  let data = null;
  try { data = await response.json(); } catch {}
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || `云存储请求失败（${response.status}）`);
  }
  return data;
}

export async function getCloudStorageStatus() {
  return readResponse(await authFetch(apiUrl('/api/v2/storage/status')));
}

export async function fetchCloudPhoto(photoId, variant = 'original') {
  if (!getCurrentUser()?.id) return null;
  const response = await authFetch(apiUrl(
    `/api/v2/photos/${encodeURIComponent(photoId)}/content?variant=${variant}`
  ));
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`照片下载失败（${response.status}）`);
  }
  return response.blob();
}

export async function hashPhoto(blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

async function hashText(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function uploadCloudPhoto({ markerId, photoId, variant, blob, sha256, baseSha256 = '' }) {
  const mutationId = `file:${await hashText(`${photoId}:${variant}:${sha256}`)}`;
  const started = await readResponse(await authFetch(apiUrl('/api/v2/photos/uploads'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      markerId,
      photoId,
      variant,
      size: blob.size,
      contentType: blob.type || (variant === 'thumbnail' ? 'image/webp' : 'application/octet-stream'),
      sha256,
      baseSha256,
      mutationId,
    }),
  }));

  if (!started.alreadyUploaded) {
    const uploaded = await authFetch(apiUrl(started.uploadUrl), {
      method: 'PUT',
      headers: { 'Content-Type': blob.type || 'application/octet-stream' },
      body: blob,
    });
    await readResponse(uploaded);
    const completed = await authFetch(apiUrl(`${started.uploadUrl}/complete`), { method: 'POST' });
    const result = await readResponse(completed);
    return { sha256, sizeBytes: blob.size, variant, photoId, version: result.version };
  }
  const completed = await authFetch(apiUrl(`${started.uploadUrl}/complete`), { method: 'POST' });
  const result = await readResponse(completed);
  return { sha256, sizeBytes: blob.size, variant, photoId, version: result.version };
}

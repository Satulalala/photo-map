import { getCurrentUser } from './auth.js';
import { webStorage } from './webStorage.js';
import { fetchCloudPhoto } from './cloudPhotoStorage.js';
import { photoUrlCache, thumbnailCache } from '../utils/LRUCache.ts';

function cacheKey(photoId, variant) {
  const userId = getCurrentUser()?.id || 'guest';
  return `${webStorage.dbName}:${userId}:${variant}:${photoId}`;
}

export function getPhotoDisplayCacheKey(photoId, useThumbnail = false) {
  return cacheKey(photoId, useThumbnail ? 'thumbnail' : 'original');
}

function asBlob(value, fallbackType = 'image/jpeg') {
  if (value instanceof Blob) return value;
  if (typeof value !== 'string') return null;
  if (!value.startsWith('data:')) value = `data:${fallbackType};base64,${value}`;
  if (value.startsWith('data:')) {
    const [header, encoded] = value.split(',', 2);
    const type = /data:([^;]+)/.exec(header)?.[1] || fallbackType;
    const binary = atob(encoded || '');
    return new Blob([Uint8Array.from(binary, char => char.charCodeAt(0))], { type });
  }
  return null;
}

function toObjectUrl(value) {
  if (typeof value === 'string' && value.startsWith('data:')) return value;
  const blob = asBlob(value);
  return blob ? URL.createObjectURL(blob) : null;
}

async function makeThumbnail(original) {
  const source = URL.createObjectURL(original);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const scale = Math.min(200 / image.width, 200 / image.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.8));
  } finally {
    URL.revokeObjectURL(source);
  }
}

async function readLocalBlob(photoId, variant) {
  if (window.electronAPI?.readPhotoFile) {
    const file = variant === 'thumbnail' && window.electronAPI.readThumbnailFile
      ? await window.electronAPI.readThumbnailFile(photoId)
      : await window.electronAPI.readPhotoFile(photoId);
    if (file?.bytes) {
      const type = variant === 'thumbnail' ? 'image/webp' : contentTypeFromName(file.fileName);
      return new Blob([file.bytes], { type });
    }
    return null;
  }

  const photo = await window.electronAPI?.getStoredPhoto?.(photoId);
  if (!photo) return null;
  if (variant === 'thumbnail' && photo.thumbnailData) return asBlob(photo.thumbnailData, 'image/webp');
  const original = asBlob(photo.data);
  if (variant === 'original' || !original) return original;
  const thumbnail = await makeThumbnail(original);
  if (thumbnail) await window.electronAPI.storePhoto({ ...photo, thumbnailData: thumbnail });
  return thumbnail;
}

function contentTypeFromName(name = '') {
  const extension = name.split('.').pop()?.toLowerCase();
  return ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif' })[extension] || 'application/octet-stream';
}

async function saveLocalBlob(photoId, variant, blob) {
  if (window.electronAPI?.savePhotoFile) {
    const bytes = await blob.arrayBuffer();
    if (variant === 'thumbnail' && window.electronAPI.saveThumbnailFile) {
      return window.electronAPI.saveThumbnailFile(photoId, bytes);
    }
    if (variant === 'original') return window.electronAPI.savePhotoFile(photoId, bytes);
    return false;
  }
  const current = await window.electronAPI?.getStoredPhoto?.(photoId) || { id: photoId };
  const next = variant === 'thumbnail'
    ? { ...current, id: photoId, thumbnailData: blob }
    : { ...current, id: photoId, data: blob };
  return window.electronAPI?.storePhoto?.(next) || false;
}

export async function getPhotoDisplayUrl(photoId, useThumbnail = false) {
  if (!photoId) return null;
  const variant = useThumbnail ? 'thumbnail' : 'original';
  const cache = useThumbnail ? thumbnailCache : photoUrlCache;
  const key = cacheKey(photoId, variant);
  const cached = cache.get(key);
  if (cached) return cached;

  let blob = await readLocalBlob(photoId, variant).catch(() => null);
  if (!blob) {
    const legacyLocalLoader = useThumbnail
      ? window.electronAPI?.getThumbnailUrl
      : window.electronAPI?.getPhotoUrl;
    if (legacyLocalLoader && !window.electronAPI?.readPhotoFile && !window.electronAPI?.getStoredPhoto) {
      const localUrl = await legacyLocalLoader(photoId).catch(() => null);
      if (localUrl) {
        cache.set(key, localUrl);
        return localUrl;
      }
    }
    blob = await fetchCloudPhoto(photoId, variant).catch(() => null);
    if (!blob && useThumbnail) {
      let original = await readLocalBlob(photoId, 'original').catch(() => null);
      if (!original) {
        original = await fetchCloudPhoto(photoId, 'original').catch(() => null);
        if (original) await saveLocalBlob(photoId, 'original', original);
      }
      if (original) blob = await makeThumbnail(original);
    }
    if (blob) await saveLocalBlob(photoId, variant, blob);
  }

  if (!blob) return null;
  const url = toObjectUrl(blob);
  if (url) cache.set(key, url);
  return url;
}

export async function readLocalPhotoVariant(photoId, variant) {
  return readLocalBlob(photoId, variant);
}

export async function saveCloudPhotoLocally(photoId, variant) {
  const blob = await fetchCloudPhoto(photoId, variant);
  if (!blob) return null;
  await saveLocalBlob(photoId, variant, blob);
  const cache = variant === 'thumbnail' ? thumbnailCache : photoUrlCache;
  cache.delete(cacheKey(photoId, variant));
  return blob;
}

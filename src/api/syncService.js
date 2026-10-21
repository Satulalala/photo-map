import { getCurrentUser, authFetch } from './auth.js';
import { DEFAULT_API_BASE, getApiBase as getConfiguredApiBase } from './apiBase.js';
import { isMapLibreTestRoute } from '../utils/mapLibreTestMode.js';
import { hashPhoto, uploadCloudPhoto } from './cloudPhotoStorage.js';
import { readLocalPhotoVariant, saveCloudPhotoLocally } from './photoFileAccess.js';

const API_BASE_KEY = 'cloudSyncApiBase';
const SYNC_ENABLED_KEY = 'cloudSyncEnabled';
const MAX_PUSH = 100;

function now() {
  return Date.now();
}

function getApiBase() {
  return getConfiguredApiBase();
}

function safeParse(json, fallback) {
  try { return json ? JSON.parse(json) : fallback; } catch { return fallback; }
}

function getUserId() {
  const id = Number(getCurrentUser()?.id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function stateKey(userId = getUserId()) {
  return `cloudSyncState_v2:${new URL(getApiBase() || window.location.origin).origin}:${userId || 'guest'}`;
}

function emptyState() {
  return { cursor: 0, versions: {}, synced: {}, files: {}, conflicts: {} };
}

function loadState() {
  try { return { ...emptyState(), ...safeParse(localStorage.getItem(stateKey()), {}) }; }
  catch { return emptyState(); }
}

function saveState(state) {
  try { localStorage.setItem(stateKey(), JSON.stringify(state)); } catch {}
}

function sanitizeMarker(marker) {
  if (!marker || typeof marker.id !== 'string') return null;
  const photos = (marker.photos || []).map(photo => ({
    id: photo.id,
    note: photo.note || '',
    createdAt: photo.createdAt || marker.createdAt || now(),
  }));
  return {
    id: marker.id,
    lat: Number(marker.lat),
    lng: Number(marker.lng),
    name: marker.name || '',
    createdAt: marker.createdAt || now(),
    updatedAt: marker.updatedAt || marker.createdAt || now(),
    photoCount: photos.length,
    photos,
  };
}

function markerJson(marker) {
  return JSON.stringify(sanitizeMarker(marker));
}

async function hashText(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function requestJson(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers };
  const response = await authFetch(`${getApiBase()}${path}`, { ...options, headers });
  let data = null;
  try { data = await response.json(); } catch {}
  if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
  return data;
}

async function pullAll(state) {
  const latestChanges = new Map();
  let cursor = Number(state.cursor || 0);
  let count = 0;
  let hasMore = true;
  while (hasMore) {
    const response = await requestJson(`/api/v2/sync/pull?cursor=${cursor}&limit=100`);
    for (const change of response.changes || []) {
      latestChanges.set(change.markerId, change);
      count += 1;
    }
    cursor = Number(response.cursor || cursor);
    hasMore = Boolean(response.hasMore);
    if (hasMore && cursor === Number(state.cursor || 0)) throw new Error('云端同步游标未前进');
  }
  state.cursor = cursor;
  return { changes: [...latestChanges.values()].sort((a, b) => a.sequence - b.sequence), count };
}

function recordFiles(state, change) {
  if (change.deleted) {
    const marker = state.synced[change.markerId];
    for (const photo of marker?.photos || []) delete state.files[photo.id];
    return;
  }
  const photoIds = new Set((change.marker?.photos || []).map(photo => photo.id));
  for (const photo of state.synced[change.markerId]?.photos || []) {
    if (!photoIds.has(photo.id)) delete state.files[photo.id];
  }
  for (const photo of change.marker?.photos || []) state.files[photo.id] ||= {};
  for (const file of change.files || []) {
    state.files[file.photoId] ||= {};
    state.files[file.photoId][file.variant] = { sha256: file.sha256, sizeBytes: file.sizeBytes };
  }
}

async function reconcileRemote(changes, state, loadLocalMarkers, onApplyServerMarkers, onDeleteServerMarkers) {
  let local = new Map((await loadLocalMarkers()).map(marker => [marker.id, sanitizeMarker(marker)]));
  const apply = [];
  const remove = [];
  let conflicts = 0;

  for (const change of changes) {
    const current = local.get(change.markerId);
    const baseline = state.synced[change.markerId] || null;
    const remote = change.marker;
    const localDirty = Boolean(current && (!baseline || markerJson(current) !== markerJson(baseline)));
    const differs = current && remote && markerJson(current) !== markerJson(remote);

    if (localDirty && differs) {
      state.conflicts[change.markerId] = {
        localSnapshot: current,
        remoteSnapshot: remote,
        remoteVersion: change.version,
        deleted: Boolean(change.deleted),
      };
      state.versions[change.markerId] = change.version;
      recordFiles(state, change);
      conflicts += 1;
    } else if (change.deleted) {
      if (current && localDirty) {
        state.conflicts[change.markerId] = {
          localSnapshot: current,
          remoteSnapshot: null,
          remoteVersion: change.version,
          deleted: true,
        };
        state.versions[change.markerId] = change.version;
        conflicts += 1;
      } else {
        remove.push(change.markerId);
        delete state.synced[change.markerId];
        delete state.versions[change.markerId];
        delete state.conflicts[change.markerId];
        recordFiles(state, change);
      }
    } else if (remote) {
      if (!current || !localDirty || !differs) {
        apply.push(remote);
        state.synced[change.markerId] = remote;
        state.versions[change.markerId] = change.version;
        const fileConflict = current ? await reconcileRemoteFiles(change, current, state) : false;
        if (fileConflict) {
          state.conflicts[change.markerId] = {
            localSnapshot: current,
            remoteSnapshot: remote,
            remoteVersion: change.version,
            deleted: false,
            fileConflict: true,
          };
          conflicts += 1;
        } else {
          delete state.conflicts[change.markerId];
        }
        recordFiles(state, change);
      }
    }
  }

  if (remove.length) await onDeleteServerMarkers(remove);
  if (apply.length) await onApplyServerMarkers(apply);
  return { conflicts, applied: apply.length, deleted: remove.length };
}

async function reconcileRemoteFiles(change, localMarker, state) {
  const remote = new Map((change.files || []).map(file => [`${file.photoId}:${file.variant}`, file]));
  let hasConflict = false;
  for (const photo of localMarker.photos || []) {
    for (const variant of ['original', 'thumbnail']) {
      const key = `${photo.id}:${variant}`;
      const previousHash = state.files[photo.id]?.[variant]?.sha256 || '';
      const remoteHash = remote.get(key)?.sha256 || '';
      if (previousHash === remoteHash) continue;
      const localBlob = await readLocalPhotoVariant(photo.id, variant).catch(() => null);
      const localHash = localBlob ? await hashPhoto(localBlob) : '';
      const localChanged = previousHash ? Boolean(localHash && localHash !== previousHash) : Boolean(remoteHash && localHash && localHash !== remoteHash);
      if (localChanged && remoteHash !== localHash) {
        hasConflict = true;
      } else if (remoteHash && remoteHash !== localHash && (!previousHash || localHash === previousHash)) {
        await saveCloudPhotoLocally(photo.id, variant).catch(() => null);
      }
    }
  }
  return hasConflict;
}

async function pushLocalChanges(markers, state) {
  const current = new Map(markers.map(marker => [marker.id, sanitizeMarker(marker)]));
  const mutations = [];
  for (const [id, marker] of current) {
    const conflict = state.conflicts[id];
    if (conflict) {
      if (markerJson(marker) === markerJson(conflict.localSnapshot)) continue;
      state.synced[id] = conflict.remoteSnapshot;
      state.versions[id] = conflict.remoteVersion;
      delete state.conflicts[id];
    }
    if (state.synced[id] && markerJson(state.synced[id]) === markerJson(marker)) continue;
    const baseVersion = Number(state.versions[id] || 0);
    mutations.push({
      mutationId: `marker:${await hashText(`${id}:${baseVersion}:${markerJson(marker)}`)}`,
      type: 'marker.upsert',
      entityId: id,
      baseVersion,
      marker,
    });
  }

  for (const [id, marker] of Object.entries(state.synced)) {
    if (current.has(id)) continue;
    if (state.conflicts[id]) continue;
    const baseVersion = Number(state.versions[id] || 0);
    mutations.push({
      mutationId: `marker:${await hashText(`delete:${id}:${baseVersion}`)}`,
      type: 'marker.delete',
      entityId: id,
      baseVersion,
    });
  }

  let accepted = 0;
  for (let index = 0; index < mutations.length; index += MAX_PUSH) {
    const batch = mutations.slice(index, index + MAX_PUSH);
    const response = await requestJson('/api/v2/sync/push', {
      method: 'POST',
      body: JSON.stringify({ mutations: batch }),
    });
    for (const result of response.results || []) {
      const mutation = batch.find(item => item.mutationId === result.mutationId);
      if (!mutation) continue;
      if (result.accepted) {
        accepted += 1;
        if (mutation.type === 'marker.delete') {
          const oldMarker = state.synced[mutation.entityId];
          for (const photo of oldMarker?.photos || []) delete state.files[photo.id];
          delete state.synced[mutation.entityId];
          delete state.versions[mutation.entityId];
          delete state.conflicts[mutation.entityId];
        } else {
          state.synced[mutation.entityId] = mutation.marker;
          state.versions[mutation.entityId] = result.version;
          delete state.conflicts[mutation.entityId];
        }
      } else if (result.conflict) {
        state.conflicts[mutation.entityId] = {
          localSnapshot: mutation.marker || null,
          remoteSnapshot: result.conflict.marker,
          remoteVersion: result.conflict.version,
          deleted: Boolean(result.conflict.deleted),
        };
        state.versions[mutation.entityId] = result.conflict.version;
      } else if (result.error) {
        throw new Error(result.error);
      }
    }
  }
  return { accepted, current };
}

async function uploadMissingFiles(markers, state) {
  let uploaded = 0;
  for (const marker of markers) {
    if (state.conflicts[marker.id]) continue;
    for (const photo of marker.photos || []) {
      state.files[photo.id] ||= {};
      for (const variant of ['original', 'thumbnail']) {
        const blob = await readLocalPhotoVariant(photo.id, variant).catch(() => null);
        if (!blob?.size) continue;
        const sha256 = await hashPhoto(blob);
        if (state.files[photo.id][variant]?.sha256 === sha256) continue;
        const result = await uploadCloudPhoto({
          markerId: marker.id,
          photoId: photo.id,
          variant,
          blob,
          sha256,
          baseSha256: state.files[photo.id][variant]?.sha256 || '',
        });
        state.files[photo.id][variant] = { sha256, sizeBytes: blob.size };
        if (result.version) state.versions[marker.id] = result.version;
        uploaded += 1;
      }
    }
  }
  return uploaded;
}

const syncService = {
  isCloudSyncEnabled() {
    const userId = getUserId();
    if (!userId) return false;
    try { return localStorage.getItem(`${SYNC_ENABLED_KEY}:${userId}`) !== '0'; }
    catch { return true; }
  },

  setCloudSyncEnabled(enabled, userId = getUserId()) {
    if (!userId) return;
    try { localStorage.setItem(`${SYNC_ENABLED_KEY}:${userId}`, enabled ? '1' : '0'); } catch {}
  },

  getApiBase,

  setApiBase(apiBase) {
    try { localStorage.setItem(API_BASE_KEY, apiBase ?? DEFAULT_API_BASE); } catch {}
  },

  getConflictCount() {
    const state = loadState();
    return Object.keys(state.conflicts || {}).length;
  },

  enqueueSnapshot() {},

  async syncNow({ loadLocalMarkers, onApplyServerMarkers, onDeleteServerMarkers }) {
    if (isMapLibreTestRoute() || !getUserId() || !this.isCloudSyncEnabled()) {
      return { pushed: 0, pulled: 0, uploaded: 0, conflicts: 0, skipped: true };
    }
    if (!navigator.onLine) return { pushed: 0, pulled: 0, uploaded: 0, conflicts: 0, skipped: true };

    const state = loadState();
    const firstPull = await pullAll(state);
    const reconciled = await reconcileRemote(
      firstPull.changes, state, loadLocalMarkers, onApplyServerMarkers, onDeleteServerMarkers
    );
    let localMarkers = await loadLocalMarkers();
    const pushed = await pushLocalChanges(localMarkers, state);
    localMarkers = await loadLocalMarkers();
    const uploaded = await uploadMissingFiles(localMarkers, state);
    const secondPull = await pullAll(state);
    const finalReconcile = await reconcileRemote(
      secondPull.changes, state, loadLocalMarkers, onApplyServerMarkers, onDeleteServerMarkers
    );
    saveState(state);
    return {
      pushed: pushed.accepted,
      pulled: reconciled.applied + reconciled.deleted + finalReconcile.applied + finalReconcile.deleted,
      uploaded,
      conflicts: Object.keys(state.conflicts).length,
      skipped: false,
    };
  },
};

export default syncService;

import { getToken } from '../api/auth.js';

const SYNC_QUEUE_KEY = 'cloudSyncQueue_v1';
const SYNC_ENABLED_KEY = 'cloudSyncEnabled';
const SYNC_LAST_PULL_KEY = 'cloudSyncLastPullAt';
const API_BASE_KEY = 'cloudSyncApiBase';

const DEFAULT_API_BASE = 'http://localhost:8080';

function safeParse(json, fallback) {
  try {
    return json ? JSON.parse(json) : fallback;
  } catch {
    return fallback;
  }
}

function now() {
  return Date.now();
}

function getApiBase() {
  try {
    return localStorage.getItem(API_BASE_KEY) || DEFAULT_API_BASE;
  } catch {
    return DEFAULT_API_BASE;
  }
}

function getQueue() {
  try {
    return safeParse(localStorage.getItem(SYNC_QUEUE_KEY), []);
  } catch {
    return [];
  }
}

function setQueue(queue) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue.slice(-200)));
  } catch {}
}

function sanitizeMarkers(markers) {
  return (markers || []).map((m) => ({
    id: m.id,
    lat: m.lat,
    lng: m.lng,
    name: m.name || '',
    createdAt: m.createdAt || now(),
    updatedAt: m.updatedAt || m.createdAt || now(),
    photoCount: m.photoCount ?? m.photos?.length ?? 0,
    photos: (m.photos || []).map((p) => ({
      id: p.id,
      note: p.note || '',
      createdAt: p.createdAt || now(),
    })),
  }));
}

function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function post(path, body) {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function get(path) {
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const syncService = {
  isCloudSyncEnabled() {
    try {
      return localStorage.getItem(SYNC_ENABLED_KEY) === '1';
    } catch {
      return false;
    }
  },

  setCloudSyncEnabled(enabled) {
    try {
      localStorage.setItem(SYNC_ENABLED_KEY, enabled ? '1' : '0');
    } catch {}
  },

  getApiBase,

  setApiBase(apiBase) {
    try {
      localStorage.setItem(API_BASE_KEY, apiBase || DEFAULT_API_BASE);
    } catch {}
  },

  getQueueLength() {
    return getQueue().length;
  },

  enqueueSnapshot(markers) {
    const queue = getQueue();
    queue.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `q_${now()}`,
      type: 'snapshot',
      at: now(),
      payload: { markers: sanitizeMarkers(markers) },
    });
    setQueue(queue);
  },

  async syncNow({ loadLocalMarkers, onApplyServerMarkers }) {
    if (!navigator.onLine || !this.isCloudSyncEnabled()) {
      return { pushed: 0, pulled: 0, skipped: true };
    }

    const queue = getQueue();
    let pushed = 0;

    if (queue.length > 0) {
      const latest = queue[queue.length - 1];
      await post('/api/v1/sync/push', {
        deviceId: 'desktop-client',
        happenedAt: latest.at,
        ...latest.payload,
      });
      pushed = queue.length;
      setQueue([]);
    } else {
      const localMarkers = await loadLocalMarkers();
      await post('/api/v1/sync/push', {
        deviceId: 'desktop-client',
        happenedAt: now(),
        markers: sanitizeMarkers(localMarkers),
      });
      pushed = 1;
    }

    const since = Number(localStorage.getItem(SYNC_LAST_PULL_KEY) || 0);
    const pullData = await get(`/api/v1/sync/pull?since=${since}`);

    if (Array.isArray(pullData.markers) && pullData.markers.length > 0) {
      await onApplyServerMarkers(pullData.markers);
    }

    localStorage.setItem(SYNC_LAST_PULL_KEY, String(pullData.serverTime || now()));

    return {
      pushed,
      pulled: Array.isArray(pullData.markers) ? pullData.markers.length : 0,
      skipped: false,
    };
  },
};

export default syncService;

/**
 * 数据库查询缓存和批量更新队列
 */

// ========== 查询缓存系统 ==========
const queryCache = {
  allMarkers: null,
  allMarkersTime: 0,
  stats: null,
  statsTime: 0,
  markerDetails: new Map(),
  maxAge: 5000,
  maxDetailEntries: 50,
};

function isCacheValid(cacheTime) {
  return cacheTime && (Date.now() - cacheTime < queryCache.maxAge);
}

function invalidateCache(type = 'all') {
  if (type === 'all' || type === 'markers') {
    queryCache.allMarkers = null;
    queryCache.allMarkersTime = 0;
    queryCache.markerDetails.clear();
  }
  if (type === 'all' || type === 'stats') {
    queryCache.stats = null;
    queryCache.statsTime = 0;
  }
}

function invalidateMarkerCache(markerId) {
  queryCache.allMarkers = null;
  queryCache.allMarkersTime = 0;
  queryCache.markerDetails.delete(markerId);
  queryCache.stats = null;
  queryCache.statsTime = 0;
}

// ========== 批量更新队列 ==========
const updateQueue = {
  photoNotes: new Map(),
  flushTimer: null,
  flushDelay: 500,
};

function scheduleFlush(db) {
  if (updateQueue.flushTimer) return;
  updateQueue.flushTimer = setTimeout(() => {
    flushUpdateQueue(db);
    updateQueue.flushTimer = null;
  }, updateQueue.flushDelay);
}

function flushUpdateQueue(db) {
  if (!db || updateQueue.photoNotes.size === 0) return;

  const update = db.prepare(`UPDATE photos SET note = ? WHERE id = ?`);
  const selectPhotos = db.prepare(`SELECT id FROM photos WHERE marker_id = ? ORDER BY sort_order`);

  const batchUpdate = db.transaction(() => {
    for (const [markerId, notes] of updateQueue.photoNotes) {
      const photos = selectPhotos.all(markerId);
      for (const [indexStr, note] of notes) {
        const index = parseInt(indexStr);
        if (photos[index]) {
          update.run(note || '', photos[index].id);
        }
      }
      invalidateMarkerCache(markerId);
    }
  });

  batchUpdate();
  updateQueue.photoNotes.clear();
  console.log('批量更新已执行');
}

function clearFlushTimer() {
  if (updateQueue.flushTimer) {
    clearTimeout(updateQueue.flushTimer);
    updateQueue.flushTimer = null;
  }
}

module.exports = {
  queryCache,
  isCacheValid,
  invalidateCache,
  invalidateMarkerCache,
  updateQueue,
  scheduleFlush,
  flushUpdateQueue,
  clearFlushTimer,
};

/**
 * SQLite 数据库模块 - 使用 better-sqlite3
 * 优化内存占用，支持分页和范围查询
 * 包含查询缓存和批量更新优化
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

// ========== 查询缓存系统 ==========
const queryCache = {
  allMarkers: null,
  allMarkersTime: 0,
  stats: null,
  statsTime: 0,
  markerDetails: new Map(), // markerId -> { data, time }
  maxAge: 5000, // 缓存有效期 5 秒
  maxDetailEntries: 50, // 最多缓存 50 个标记详情
};

// 检查缓存是否有效
function isCacheValid(cacheTime) {
  return cacheTime && (Date.now() - cacheTime < queryCache.maxAge);
}

// 清除所有缓存（数据变更时调用）
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

// 清除单个标记的缓存
function invalidateMarkerCache(markerId) {
  queryCache.allMarkers = null;
  queryCache.allMarkersTime = 0;
  queryCache.markerDetails.delete(markerId);
  queryCache.stats = null;
  queryCache.statsTime = 0;
}

// ========== 批量更新队列 ==========
const updateQueue = {
  photoNotes: new Map(), // markerId -> { photoIndex -> note }
  flushTimer: null,
  flushDelay: 500, // 500ms 后批量执行
};

// 调度批量更新
function scheduleFlush() {
  if (updateQueue.flushTimer) return;
  updateQueue.flushTimer = setTimeout(() => {
    flushUpdateQueue();
    updateQueue.flushTimer = null;
  }, updateQueue.flushDelay);
}

// 执行批量更新
function flushUpdateQueue() {
  if (updateQueue.photoNotes.size === 0) return;
  
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

// ========== 数据库初始化 ==========
function initDatabase(userDataPath) {
  const dbPath = path.join(userDataPath, 'photo-map.db');
  
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  
  db = new Database(dbPath);
  
  // 启用 WAL 模式（更好的并发性能）
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000');
  db.pragma('temp_store = MEMORY');
  db.pragma('mmap_size = 268435456');
  
  // 创建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS markers (
      id TEXT PRIMARY KEY,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      name TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );
    
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      marker_id TEXT NOT NULL,
      file_id TEXT,
      note TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (marker_id) REFERENCES markers(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_markers_lat ON markers(lat);
    CREATE INDEX IF NOT EXISTS idx_markers_lng ON markers(lng);
    CREATE INDEX IF NOT EXISTS idx_markers_created ON markers(created_at);
    CREATE INDEX IF NOT EXISTS idx_photos_marker ON photos(marker_id);
    CREATE INDEX IF NOT EXISTS idx_markers_lat_lng ON markers(lat, lng);
    CREATE INDEX IF NOT EXISTS idx_photos_marker_order ON photos(marker_id, sort_order);
  `);
  
  console.log('数据库初始化完成:', dbPath);
  return db;
}

// ========== 数据迁移 ==========
function migrateFromStore(oldMarkers) {
  if (!oldMarkers || oldMarkers.length === 0) return;
  
  const insertMarker = db.prepare(`
    INSERT OR REPLACE INTO markers (id, lat, lng, name, created_at) VALUES (?, ?, ?, ?, ?)
  `);
  const insertPhoto = db.prepare(`
    INSERT OR REPLACE INTO photos (id, marker_id, file_id, note, sort_order) VALUES (?, ?, ?, ?, ?)
  `);
  
  let photoCount = 0;
  const migrate = db.transaction(() => {
    for (const m of oldMarkers) {
      insertMarker.run(m.id, m.lat, m.lng, m.name || null, m.createdAt || Date.now());
      if (m.photos && m.photos.length > 0) {
        m.photos.forEach((p, i) => {
          let fileId = null, note = '';
          if (typeof p === 'string') {
            fileId = null;
          } else if (p.id) {
            fileId = p.id;
            note = p.note || '';
          } else if (p.data) {
            fileId = null;
            note = p.note || '';
          }
          insertPhoto.run(`${m.id}_photo_${i}`, m.id, fileId, note, i);
          if (fileId) photoCount++;
        });
      }
    }
  });
  
  migrate();
  invalidateCache('all');
  console.log(`迁移完成: ${oldMarkers.length} 个标记点, ${photoCount} 张照片`);
}

function cleanupInvalidPhotos() {
  const result = db.prepare(`DELETE FROM photos WHERE file_id IS NULL`).run();
  if (result.changes > 0) {
    invalidateCache('all');
    console.log(`清理了 ${result.changes} 条无效照片记录`);
  }
  return result.changes;
}

// ========== 查询操作（带缓存）==========
function getAllMarkers() {
  // 检查缓存
  if (isCacheValid(queryCache.allMarkersTime) && queryCache.allMarkers) {
    return queryCache.allMarkers;
  }
  
  const markers = db.prepare(`
    SELECT m.*, 
           (SELECT COUNT(*) FROM photos WHERE marker_id = m.id AND file_id IS NOT NULL) as photo_count,
           (SELECT file_id FROM photos WHERE marker_id = m.id AND file_id IS NOT NULL ORDER BY sort_order LIMIT 1) as first_photo,
           (SELECT note FROM photos WHERE marker_id = m.id AND file_id IS NOT NULL ORDER BY sort_order LIMIT 1) as first_note
    FROM markers m
    ORDER BY m.created_at DESC
  `).all();
  
  const result = markers.map(m => ({
    id: m.id,
    lat: m.lat,
    lng: m.lng,
    name: m.name,
    createdAt: m.created_at,
    photoCount: m.photo_count,
    firstPhoto: m.first_photo ? { id: m.first_photo, note: m.first_note || '' } : null
  }));
  
  // 更新缓存
  queryCache.allMarkers = result;
  queryCache.allMarkersTime = Date.now();
  
  return result;
}

function getMarkersInBounds(minLat, maxLat, minLng, maxLng, limit = 500) {
  // 范围查询不缓存（参数变化频繁）
  const markers = db.prepare(`
    SELECT m.*, COUNT(p.id) as photo_count,
           (SELECT file_id FROM photos WHERE marker_id = m.id ORDER BY sort_order LIMIT 1) as first_photo
    FROM markers m
    LEFT JOIN photos p ON p.marker_id = m.id
    WHERE m.lat BETWEEN ? AND ? AND m.lng BETWEEN ? AND ?
    GROUP BY m.id
    ORDER BY m.created_at DESC
    LIMIT ?
  `).all(minLat, maxLat, minLng, maxLng, limit);
  
  return markers.map(m => ({
    id: m.id,
    lat: m.lat,
    lng: m.lng,
    name: m.name,
    createdAt: m.created_at,
    photoCount: m.photo_count,
    firstPhoto: m.first_photo ? { id: m.first_photo } : null
  }));
}

function getMarkerById(markerId) {
  // 检查缓存
  const cached = queryCache.markerDetails.get(markerId);
  if (cached && isCacheValid(cached.time)) {
    return cached.data;
  }
  
  const marker = db.prepare(`SELECT * FROM markers WHERE id = ?`).get(markerId);
  if (!marker) return null;
  
  const photos = db.prepare(`
    SELECT * FROM photos WHERE marker_id = ? ORDER BY sort_order
  `).all(markerId);
  
  const result = {
    id: marker.id,
    lat: marker.lat,
    lng: marker.lng,
    name: marker.name,
    createdAt: marker.created_at,
    photos: photos.map(p => ({ id: p.file_id, note: p.note }))
  };
  
  // 更新缓存（限制缓存数量）
  if (queryCache.markerDetails.size >= queryCache.maxDetailEntries) {
    const firstKey = queryCache.markerDetails.keys().next().value;
    queryCache.markerDetails.delete(firstKey);
  }
  queryCache.markerDetails.set(markerId, { data: result, time: Date.now() });
  
  return result;
}

function getStats() {
  // 检查缓存
  if (isCacheValid(queryCache.statsTime) && queryCache.stats) {
    return queryCache.stats;
  }
  
  const markerCount = db.prepare(`SELECT COUNT(*) as count FROM markers`).get().count;
  const photoCount = db.prepare(`SELECT COUNT(*) as count FROM photos WHERE file_id IS NOT NULL`).get().count;
  
  const result = { markerCount, photoCount };
  
  // 更新缓存
  queryCache.stats = result;
  queryCache.statsTime = Date.now();
  
  return result;
}

// ========== 写入操作（清除缓存）==========
function addMarker(marker) {
  const insertMarker = db.prepare(`
    INSERT INTO markers (id, lat, lng, name, created_at) VALUES (?, ?, ?, ?, ?)
  `);
  const insertPhoto = db.prepare(`
    INSERT INTO photos (id, marker_id, file_id, note, sort_order) VALUES (?, ?, ?, ?, ?)
  `);
  
  const add = db.transaction(() => {
    insertMarker.run(marker.id, marker.lat, marker.lng, marker.name || null, marker.createdAt || Date.now());
    if (marker.photos && marker.photos.length > 0) {
      marker.photos.forEach((p, i) => {
        const photoId = `${marker.id}_${i}_${Date.now()}`;
        insertPhoto.run(photoId, marker.id, p.id || null, p.note || '', i);
      });
    }
  });
  
  add();
  invalidateCache('all');
  return true;
}

function updateMarker(marker) {
  db.prepare(`UPDATE markers SET lat = ?, lng = ?, name = ? WHERE id = ?`)
    .run(marker.lat, marker.lng, marker.name || null, marker.id);
  invalidateMarkerCache(marker.id);
  return true;
}

function deleteMarker(markerId) {
  db.prepare(`DELETE FROM markers WHERE id = ?`).run(markerId);
  invalidateCache('all');
  return true;
}

function addPhotosToMarker(markerId, photos) {
  if (!photos || photos.length === 0) return true;
  
  const maxOrder = db.prepare(`SELECT MAX(sort_order) as max FROM photos WHERE marker_id = ?`).get(markerId);
  let order = (maxOrder?.max || 0) + 1;
  const now = Date.now();
  
  const insert = db.prepare(`
    INSERT INTO photos (id, marker_id, file_id, note, sort_order) VALUES (?, ?, ?, ?, ?)
  `);
  
  const batchInsert = db.transaction((items) => {
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      insert.run(`${markerId}_${order + i}_${now + i}`, markerId, p.id || null, p.note || '', order + i);
    }
  });
  
  batchInsert(photos);
  invalidateMarkerCache(markerId);
  return true;
}

// 更新照片备注（加入批量队列）
function updatePhotoNote(markerId, photoIndex, note) {
  // 加入更新队列
  if (!updateQueue.photoNotes.has(markerId)) {
    updateQueue.photoNotes.set(markerId, new Map());
  }
  updateQueue.photoNotes.get(markerId).set(photoIndex.toString(), note);
  
  // 调度批量执行
  scheduleFlush();
  return true;
}

// 批量更新照片备注（立即执行）
function batchUpdatePhotoNotes(markerId, notes) {
  const photos = db.prepare(`SELECT id FROM photos WHERE marker_id = ? ORDER BY sort_order`).all(markerId);
  const update = db.prepare(`UPDATE photos SET note = ? WHERE id = ?`);
  
  const batchUpdate = db.transaction(() => {
    for (let i = 0; i < notes.length && i < photos.length; i++) {
      if (notes[i] !== undefined) {
        update.run(notes[i] || '', photos[i].id);
      }
    }
  });
  
  batchUpdate();
  invalidateMarkerCache(markerId);
  return true;
}

function deletePhoto(markerId, photoIndex) {
  const photos = db.prepare(`SELECT id FROM photos WHERE marker_id = ? ORDER BY sort_order`).all(markerId);
  if (photos[photoIndex]) {
    db.prepare(`DELETE FROM photos WHERE id = ?`).run(photos[photoIndex].id);
  }
  invalidateMarkerCache(markerId);
  return true;
}

// ========== 搜索操作 ==========
function searchMarkers(keyword, limit = 50) {
  return db.prepare(`
    SELECT m.*, COUNT(p.id) as photo_count
    FROM markers m
    LEFT JOIN photos p ON p.marker_id = m.id
    WHERE m.name LIKE ?
    GROUP BY m.id
    ORDER BY m.created_at DESC
    LIMIT ?
  `).all(`%${keyword}%`, limit).map(m => ({
    id: m.id,
    lat: m.lat,
    lng: m.lng,
    name: m.name,
    createdAt: m.created_at,
    photoCount: m.photo_count
  }));
}

function searchPhotos(keyword, limit = 100) {
  return db.prepare(`
    SELECT p.*, m.name as marker_name, m.lat, m.lng
    FROM photos p
    JOIN markers m ON p.marker_id = m.id
    WHERE p.note LIKE ? AND p.file_id IS NOT NULL
    ORDER BY p.sort_order
    LIMIT ?
  `).all(`%${keyword}%`, limit).map(p => ({
    id: p.id,
    fileId: p.file_id,
    note: p.note,
    markerId: p.marker_id,
    markerName: p.marker_name,
    lat: p.lat,
    lng: p.lng
  }));
}

// ========== 关闭数据库 ==========
function closeDatabase() {
  // 先执行待处理的更新
  if (updateQueue.flushTimer) {
    clearTimeout(updateQueue.flushTimer);
    flushUpdateQueue();
  }
  
  if (db) {
    db.close();
    db = null;
  }
  
  // 清除缓存
  invalidateCache('all');
}

module.exports = {
  initDatabase,
  migrateFromStore,
  cleanupInvalidPhotos,
  getAllMarkers,
  getMarkersInBounds,
  getMarkerById,
  addMarker,
  updateMarker,
  deleteMarker,
  addPhotosToMarker,
  updatePhotoNote,
  batchUpdatePhotoNotes,
  deletePhoto,
  searchMarkers,
  searchPhotos,
  getStats,
  closeDatabase,
  invalidateCache, // 导出供外部使用
};

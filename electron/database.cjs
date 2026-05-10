/**
 * SQLite 数据库模块 - 使用 better-sqlite3
 * 优化内存占用，支持分页和范围查询
 * 包含查询缓存和批量更新优化
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const sqliteVec = require('sqlite-vec');
const {
  queryCache, isCacheValid, invalidateCache, invalidateMarkerCache,
  updateQueue, scheduleFlush, flushUpdateQueue, clearFlushTimer,
} = require('./db-cache.cjs');
const vec = require('./db-vector.cjs');
const { migrateFromStore: _migrateFromStore, cleanupInvalidPhotos: _cleanupInvalidPhotos } = require('./db-migrate.cjs');

let db = null;

// ========== 数据库初始化 ==========
function initDatabase(userDataPath) {
  const dbPath = path.join(userDataPath, 'photo-map.db');

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000');
  db.pragma('temp_store = MEMORY');
  db.pragma('mmap_size = 268435456');

  try {
    sqliteVec.load(db);
    console.log('sqlite-vec 向量搜索扩展已加载');
  } catch (e) {
    console.warn('sqlite-vec 加载失败:', e.message);
  }

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

  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS photo_embeddings USING vec0(
        id INTEGER PRIMARY KEY,
        embedding FLOAT[512] distance_metric=cosine
      );

      CREATE TABLE IF NOT EXISTS photo_embedding_meta (
        vec_id INTEGER UNIQUE NOT NULL,
        photo_id TEXT UNIQUE NOT NULL,
        marker_id TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_emb_meta_photo ON photo_embedding_meta(photo_id);
      CREATE INDEX IF NOT EXISTS idx_emb_meta_marker ON photo_embedding_meta(marker_id);
    `);
    console.log('向量搜索表已创建');
  } catch (e) {
    console.warn('向量表创建失败（sqlite-vec 可能不支持）:', e.message);
  }

  console.log('数据库初始化完成:', dbPath);
  return db;
}

// ========== 数据迁移 ==========
function migrateFromStore(oldMarkers) {
  return _migrateFromStore(db, invalidateCache, oldMarkers);
}

function cleanupInvalidPhotos() {
  return _cleanupInvalidPhotos(db, invalidateCache);
}

// ========== 查询操作（带缓存）==========
function getAllMarkers() {
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

  queryCache.allMarkers = result;
  queryCache.allMarkersTime = Date.now();

  return result;
}

function getMarkersInBounds(minLat, maxLat, minLng, maxLng, limit = 500) {
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

  if (queryCache.markerDetails.size >= queryCache.maxDetailEntries) {
    const firstKey = queryCache.markerDetails.keys().next().value;
    queryCache.markerDetails.delete(firstKey);
  }
  queryCache.markerDetails.set(markerId, { data: result, time: Date.now() });

  return result;
}

function getStats() {
  if (isCacheValid(queryCache.statsTime) && queryCache.stats) {
    return queryCache.stats;
  }

  const markerCount = db.prepare(`SELECT COUNT(*) as count FROM markers`).get().count;
  const photoCount = db.prepare(`SELECT COUNT(*) as count FROM photos WHERE file_id IS NOT NULL`).get().count;

  const result = { markerCount, photoCount };

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
  try {
    const photos = db.prepare(`SELECT file_id FROM photos WHERE marker_id = ? AND file_id IS NOT NULL`).all(markerId);
    for (const p of photos) {
      if (p.file_id) removePhotoEmbedding(p.file_id);
    }
  } catch {}
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

function updatePhotoNote(markerId, photoIndex, note) {
  if (!updateQueue.photoNotes.has(markerId)) {
    updateQueue.photoNotes.set(markerId, new Map());
  }
  updateQueue.photoNotes.get(markerId).set(photoIndex.toString(), note);
  scheduleFlush(db);
  return true;
}

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

// ========== 向量搜索（委托给 db-vector.cjs）==========
function addPhotoEmbedding(photoId, markerId, embedding) {
  return vec.addPhotoEmbedding(db, photoId, markerId, embedding);
}

function removePhotoEmbedding(photoId) {
  return vec.removePhotoEmbedding(db, photoId);
}

function searchByEmbedding(embedding, topK = 20) {
  return vec.searchByEmbedding(db, embedding, topK);
}

function hasEmbeddingTable() {
  return vec.hasEmbeddingTable(db);
}

function getEmbeddingCount() {
  return vec.getEmbeddingCount(db);
}

// ========== 关闭数据库 ==========
function closeDatabase() {
  clearFlushTimer();
  if (db) {
    flushUpdateQueue(db);
    db.close();
    db = null;
  }
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
  invalidateCache,
  addPhotoEmbedding,
  removePhotoEmbedding,
  searchByEmbedding,
  hasEmbeddingTable,
  getEmbeddingCount,
};

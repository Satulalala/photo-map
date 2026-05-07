/**
 * 数据库迁移和清理操作
 */

function migrateFromStore(db, invalidateCache, oldMarkers) {
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

function cleanupInvalidPhotos(db, invalidateCache) {
  const result = db.prepare(`DELETE FROM photos WHERE file_id IS NULL`).run();
  if (result.changes > 0) {
    invalidateCache('all');
    console.log(`清理了 ${result.changes} 条无效照片记录`);
  }
  return result.changes;
}

module.exports = { migrateFromStore, cleanupInvalidPhotos };

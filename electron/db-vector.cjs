/**
 * 向量搜索操作（sqlite-vec）
 */

function addPhotoEmbedding(db, photoId, markerId, embedding) {
  const vecStr = JSON.stringify(embedding);

  const insertVec = db.prepare(`INSERT INTO photo_embeddings(id, embedding) VALUES (NULL, ?)`);
  const insertMeta = db.prepare(`
    INSERT INTO photo_embedding_meta(vec_id, photo_id, marker_id) VALUES (?, ?, ?)
  `);

  const add = db.transaction(() => {
    removePhotoEmbedding(db, photoId);
    const result = insertVec.run(vecStr);
    const vecId = result.lastInsertRowid;
    insertMeta.run(Number(vecId), photoId, markerId);
  });

  add();
  return true;
}

function removePhotoEmbedding(db, photoId) {
  const meta = db.prepare(`SELECT vec_id FROM photo_embedding_meta WHERE photo_id = ?`).get(photoId);
  if (meta) {
    db.prepare(`DELETE FROM photo_embeddings WHERE id = ?`).run(meta.vec_id);
    db.prepare(`DELETE FROM photo_embedding_meta WHERE photo_id = ?`).run(photoId);
  }
  return true;
}

function searchByEmbedding(db, embedding, topK = 20) {
  const vecStr = JSON.stringify(embedding);

  const results = db.prepare(`
    SELECT pe.id, pe.distance, m.photo_id, m.marker_id
    FROM photo_embeddings pe
    JOIN photo_embedding_meta m ON pe.id = m.vec_id
    WHERE pe.embedding MATCH ? AND k = ?
  `).all(vecStr, topK);

  return results.map(r => ({
    photoId: r.photo_id,
    markerId: r.marker_id,
    score: Math.max(0, Math.min(1, 1 - r.distance)),
  }));
}

function hasEmbeddingTable(db) {
  try {
    return db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='photo_embeddings'`).get() !== undefined;
  } catch {
    return false;
  }
}

function getEmbeddingCount(db) {
  try {
    return db.prepare(`SELECT COUNT(*) as count FROM photo_embedding_meta`).get().count;
  } catch {
    return 0;
  }
}

module.exports = {
  addPhotoEmbedding,
  removePhotoEmbedding,
  searchByEmbedding,
  hasEmbeddingTable,
  getEmbeddingCount,
};

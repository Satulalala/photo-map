const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup(isLoaded = true) {
  const handlers = {};
  const indexed = new Set(['existing']);
  const photos = [{ id: 'existing' }, { id: 'missing' }];
  const encoded = [];
  const db = {
    getAllMarkers: () => [{ id: 'place' }],
    getMarkerById: () => ({ name: '地点', lat: 30, lng: 120, photos }),
    hasPhotoEmbedding: id => indexed.has(id),
    addPhotoEmbedding: id => indexed.add(id),
    searchByEmbedding: () => {
      assert.ok(indexed.has('missing'));
      return [{ photoId: 'missing', markerId: 'place', score: 0.9 }];
    },
  };
  const embedding = {
    getStatus: () => ({ isLoaded }),
    getTextEmbedding: async () => [1, 0],
    getImageEmbedding: async file => { encoded.push(path.basename(file)); return [1, 0]; },
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'ai-handlers.cjs'), 'utf8'), {
    module,
    require: name => {
      if (name === 'electron') return { ipcMain: { handle: (event, fn) => { handlers[event] = fn; } } };
      if (name === 'fs') return { existsSync: () => true };
      return require(name);
    },
  });
  module.exports({ getDb: () => db, getEmbedding: () => embedding, PHOTO_DIR: '/photos', log: { info() {}, error() {} } });
  return { search: text => handlers['search-photos-by-content'](null, { text }), encoded };
}

test('backfills missing image embeddings before searching and reuses existing ones', async () => {
  const { search, encoded } = setup();
  const results = await search('海边');
  assert.equal(results[0].photoId, 'missing');
  await search('海边');
  assert.deepEqual(encoded, ['missing']);
});

test('reports an unavailable model instead of returning empty search results', async () => {
  await assert.rejects(setup(false).search('海边'), /模型正在加载/);
});

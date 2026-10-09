const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

// 在 Electron 的实际运行时加载原生模块，不访问用户数据库或下载 AI 模型。
if (!process.versions.electron) {
  const result = spawnSync(require('electron'), [__filename], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    encoding: 'utf8',
  });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
} else {
  const db = require('better-sqlite3')(':memory:');
  require('sqlite-vec').load(db);
  assert.equal(db.prepare('SELECT 42 AS answer').get().answer, 42);
  console.log(`Electron ${process.versions.electron} / SQLite ${db.prepare('SELECT sqlite_version() AS v').get().v} / sqlite-vec ${db.prepare('SELECT vec_version() AS v').get().v}`);
  db.close();
  const sharp = require('sharp');
  assert.equal(typeof sharp, 'function');
  const ort = require('onnxruntime-node');
  assert.equal(typeof ort.InferenceSession, 'function');
  const transformers = require('@huggingface/transformers');
  for (const name of ['ChineseCLIPModel', 'BertTokenizer', 'ChineseCLIPFeatureExtractor']) {
    assert.equal(typeof transformers[name], 'function', `${name} export`);
  }
  console.log(`Sharp ${sharp.versions.sharp} / ONNX / Chinese CLIP exports: OK`);
}

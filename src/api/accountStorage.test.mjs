import test from 'node:test';
import assert from 'node:assert/strict';
import { getAccountStorageDirectory, getWebStorageDatabaseName } from './accountStorage.js';

test('keeps guest data in the legacy local database and partitions account data by API origin and id', () => {
  assert.equal(getAccountStorageDirectory(null), null);
  assert.equal(getWebStorageDatabaseName('', null, 'https://photomap.satula.top'), 'photo-map-db');
  assert.equal(getWebStorageDatabaseName('', 23, 'https://photomap.satula.top'), 'photo-map-https_photomap_satula_top-account-23');
  assert.notEqual(
    getWebStorageDatabaseName('https://api.example.test', 23, 'https://photomap.satula.top'),
    getWebStorageDatabaseName('https://api.example.test', 24, 'https://photomap.satula.top'),
  );
  assert.notEqual(
    getWebStorageDatabaseName('https://api.example.test', 23, 'https://photomap.satula.top'),
    getWebStorageDatabaseName('https://api.staging.example.test', 23, 'https://photomap.satula.top'),
  );
});

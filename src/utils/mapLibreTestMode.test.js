import { afterEach, describe, expect, it } from 'vitest';
import {
  assertPhotoMapWritesAllowed,
  DEFAULT_MAPLIBRE_STYLE_URL,
  getMapLibreStyleUrl,
  isMapLibreTestRoute,
} from './mapLibreTestMode.js';
import syncService from '../api/syncService.js';

const originalWindow = globalThis.window;

function setTestLocation(pathname, electronAPI) {
  globalThis.window = {
    location: { pathname },
    electronAPI,
  };
}

afterEach(() => {
  globalThis.window = originalWindow;
});

describe('MapLibre test mode', () => {
  it('matches only the independent web test route', () => {
    setTestLocation('/maplibre-test');
    expect(isMapLibreTestRoute()).toBe(true);

    setTestLocation('/maplibre-test/');
    expect(isMapLibreTestRoute()).toBe(true);

    setTestLocation('/map');
    expect(isMapLibreTestRoute()).toBe(false);
  });

  it('does not enable the test route inside native Electron', () => {
    setTestLocation('/maplibre-test', { loadMarkers() {} });
    expect(isMapLibreTestRoute()).toBe(false);
  });

  it('blocks writes to personal data stores while allowing reads and cache operations', () => {
    setTestLocation('/maplibre-test');
    expect(() => assertPhotoMapWritesAllowed('markers', 'readwrite')).toThrow(/只读模式/);
    expect(() => assertPhotoMapWritesAllowed(['photos', 'settings'], 'readwrite')).toThrow(/只读模式/);
    expect(() => assertPhotoMapWritesAllowed('markers', 'readonly')).not.toThrow();
    expect(() => assertPhotoMapWritesAllowed('cache', 'readwrite')).not.toThrow();
  });

  it('does not enqueue or send cloud sync data from the test route', async () => {
    setTestLocation('/maplibre-test');
    syncService.enqueueSnapshot([{ id: 'test-marker' }]);
    await expect(syncService.syncNow({
      loadLocalMarkers: async () => [{ id: 'test-marker' }],
      onApplyServerMarkers: async () => {},
    })).resolves.toEqual({ pushed: 0, pulled: 0, uploaded: 0, conflicts: 0, skipped: true });
  });

  it('uses the OpenFreeMap style as the configurable default', () => {
    expect(DEFAULT_MAPLIBRE_STYLE_URL).toBe('https://tiles.openfreemap.org/styles/liberty');
    expect(getMapLibreStyleUrl()).toBe(DEFAULT_MAPLIBRE_STYLE_URL);
  });
});

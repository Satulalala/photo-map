import { afterEach, expect, it, vi } from 'vitest';
import {
  attachNeighborTilePrefetch,
  getNeighborTileCacheSize,
  getNeighborTilePrefetchTargets,
} from './mapTilePrefetch.js';

afterEach(() => {
  vi.useRealTimers();
});

function createMapMock() {
  const listeners = new Map();
  const map = {
    getZoom: vi.fn(() => 12),
    getBearing: vi.fn(() => 18),
    getPitch: vi.fn(() => 0),
    getCenter: vi.fn(() => ({ lng: 10, lat: 20 })),
    getContainer: () => ({ clientWidth: 1000, clientHeight: 700 }),
    project: vi.fn(() => ({ x: 500, y: 350 })),
    unproject: vi.fn(([x, y]) => ({ lng: x, lat: y })),
    isMoving: vi.fn(() => false),
    isStyleLoaded: vi.fn(() => true),
    areTilesLoaded: vi.fn(() => true),
    flyTo: vi.fn(),
    on: vi.fn((event, handler) => listeners.set(event, handler)),
    off: vi.fn((event, handler) => {
      if (listeners.get(event) === handler) listeners.delete(event);
    }),
  };
  return { map, listeners };
}

it('finds four nearby camera targets without moving the current view', () => {
  const { map } = createMapMock();

  const targets = getNeighborTilePrefetchTargets(map);

  expect(targets).toHaveLength(4);
  expect(targets.map(({ lng, lat }) => [lng, lat])).toEqual([
    [-12, -162],
    [1012, -162],
    [-12, 862],
    [1012, 862],
  ]);
  expect(map.unproject).toHaveBeenCalledTimes(4);
});

it('reserves a bounded tile cache for the visible area and its nearby buffer', () => {
  expect(getNeighborTileCacheSize({ clientWidth: 1000, clientHeight: 700 })).toBe(25);
  expect(getNeighborTileCacheSize({ clientWidth: 0, clientHeight: 0 })).toBe(0);
});

it('waits for a stable viewport before preloading its surrounding tiles', () => {
  vi.useFakeTimers();
  const { map, listeners } = createMapMock();
  const cleanup = attachNeighborTilePrefetch(map);

  listeners.get('idle')();
  vi.advanceTimersByTime(700);

  expect(map.flyTo).toHaveBeenCalledTimes(4);
  expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({
    zoom: 12,
    bearing: 18,
    preloadOnly: true,
  }));

  cleanup();
  expect(map.off).toHaveBeenCalledWith('idle', expect.any(Function));
  expect(map.off).toHaveBeenCalledWith('moveend', expect.any(Function));
});

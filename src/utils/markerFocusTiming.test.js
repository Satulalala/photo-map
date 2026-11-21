import { describe, expect, it, vi, afterEach } from 'vitest';
import { computeMarkerFocusTiming, flyToMarkerTarget } from './markerFocusTiming.js';

function createMockMap({ zoom = 15, x = 500, y = 400, width = 1000, height = 800 } = {}) {
  const listeners = new Set();
  return {
    getZoom: vi.fn(() => zoom),
    getContainer: vi.fn(() => ({
      getBoundingClientRect: () => ({ width, height }),
    })),
    project: vi.fn(() => ({ x, y })),
    stop: vi.fn(),
    once: vi.fn((event, handler) => {
      if (event === 'moveend') listeners.add(handler);
    }),
    off: vi.fn((event, handler) => {
      if (event === 'moveend') listeners.delete(handler);
    }),
    flyTo: vi.fn(),
    emitMoveEnd: () => {
      [...listeners].forEach(fn => fn());
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('computeMarkerFocusTiming', () => {
  it('opens immediately with 0ms when already zoomed in and centered', () => {
    const map = createMockMap({ zoom: 16, x: 506, y: 392, width: 1000, height: 800 });
    const timing = computeMarkerFocusTiming(map, [117.22, 31.85], { reducedMotion: false });

    expect(timing.isCentered).toBe(true);
    expect(timing.shouldFly).toBe(false);
    expect(timing.flyDuration).toBe(0);
    expect(timing.openDelay).toBe(0);
    expect(timing.targetZoom).toBe(16);
  });

  it('keeps pan transitions unhurried while still scaling with screen center distance', () => {
    const nearMap = createMockMap({ zoom: 15, x: 580, y: 400 });
    const farMap = createMockMap({ zoom: 15, x: 960, y: 760 });

    const nearTiming = computeMarkerFocusTiming(nearMap, [117, 31], { reducedMotion: false });
    const farTiming = computeMarkerFocusTiming(farMap, [117, 31], { reducedMotion: false });

    expect(nearTiming.shouldFly).toBe(true);
    expect(nearTiming.flyDuration).toBeGreaterThanOrEqual(320);
    expect(nearTiming.flyDuration).toBeLessThan(farTiming.flyDuration);
    expect(farTiming.flyDuration).toBeLessThanOrEqual(680);
  });

  it('keeps zoom speed gentle (>=680ms) and opens cards faster when centered than off-center', () => {
    const centeredMild = createMockMap({ zoom: 13, x: 500, y: 400 });
    const centeredDeep = createMockMap({ zoom: 4, x: 500, y: 400 });
    const edgeDeep = createMockMap({ zoom: 4, x: 940, y: 750 });

    const t1 = computeMarkerFocusTiming(centeredMild, [117, 31], { reducedMotion: false });
    const t2 = computeMarkerFocusTiming(centeredDeep, [117, 31], { reducedMotion: false });
    const t3 = computeMarkerFocusTiming(edgeDeep, [117, 31], { reducedMotion: false });

    expect(t1.flyDuration).toBeGreaterThanOrEqual(680);
    expect(t2.flyDuration).toBeGreaterThan(t1.flyDuration);
    expect(t2.flyDuration).toBeLessThanOrEqual(1250);

    // 同等缩放层级下，已在屏幕中心的点不必等整段缓慢放大结束才出现卡片
    expect(t2.openDelay).toBeLessThan(t2.flyDuration);
    expect(t1.openDelay).toBeLessThan(t2.openDelay);
    expect(t2.openDelay).toBeLessThan(t3.openDelay);
  });

  it('returns 0ms durations when reduced motion is preferred', () => {
    const map = createMockMap({ zoom: 5, x: 900, y: 720 });
    const timing = computeMarkerFocusTiming(map, [117, 31], { reducedMotion: true });

    expect(timing.shouldFly).toBe(true);
    expect(timing.flyDuration).toBe(0);
    expect(timing.openDelay).toBe(0);
  });
});

describe('flyToMarkerTarget', () => {
  it('skips flyTo completely when marker is already zoomed in and centered', async () => {
    const map = createMockMap({ zoom: 15.5, x: 500, y: 400 });
    const flight = flyToMarkerTarget(map, [117.22, 31.85], { reducedMotion: false });

    expect(flight.timing.shouldFly).toBe(false);
    expect(map.flyTo).not.toHaveBeenCalled();
    await expect(flight.promise).resolves.toBeUndefined();
  });

  it('flies with gentle flyDuration and opens card at computed openDelay in card mode', async () => {
    vi.useFakeTimers();
    const map = createMockMap({ zoom: 10, x: 500, y: 400 });
    const flight = flyToMarkerTarget(map, [117.22, 31.85], {
      reducedMotion: false,
      waitMode: 'card',
    });

    expect(map.flyTo).toHaveBeenCalledWith({
      center: [117.22, 31.85],
      zoom: 15,
      duration: flight.timing.flyDuration,
    });

    let resolved = false;
    flight.promise.then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(flight.timing.openDelay - 1);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);
  });

  it('resolves and cleans up listener cleanly when cancelled mid-flight', async () => {
    const map = createMockMap({ zoom: 6, x: 900, y: 700 });
    const flight = flyToMarkerTarget(map, [117.22, 31.85], { reducedMotion: false });

    flight.cancel();
    await expect(flight.promise).resolves.toBeUndefined();
    expect(map.off).toHaveBeenCalledWith('moveend', expect.any(Function));
  });
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import MinimalLoader from './MinimalLoader.jsx';

let map;
beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {}))
  );
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false }))
  );
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  map = {
    on: vi.fn((event, callback) => {
      if (event === 'error') map.error = callback;
    }),
    once: vi.fn((event, callback) => {
      if (event === 'moveend') map.end = callback;
    }),
    flyTo: vi.fn(options => {
      if (!options.duration) map.end();
    }),
    easeTo: vi.fn(),
    setPadding: vi.fn(),
    jumpTo: vi.fn(),
    getContainer: vi.fn(() => document.createElement('div')),
    off: vi.fn(),
    remove: vi.fn(),
  };
  vi.stubGlobal('mapboxgl', {
    supported: () => true,
    Map: class {
      constructor(options) {
        map.options = options;
        return map;
      }
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete window.__entryMap;
  delete window.__loaderFinalState;
});

it('does not restart the entry button during flight after early map failure', () => {
  const complete = vi.fn();
  const enter = vi.fn();
  const { unmount } = render(<MinimalLoader onComplete={complete} onShowLogin={enter} />);
  expect(map.options.style).toBe('mapbox://styles/mapbox/streets-v12?optimize=true');
  expect(map.options.language).toBe('zh-Hans');
  expect(map.options.refreshExpiredTiles).toBe(true);
  act(() => map.error(new Error('map unavailable')));
  expect(complete).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: '进入地图' }));
  expect(map.jumpTo).toHaveBeenCalledWith(expect.objectContaining({ zoom: 13, preloadOnly: true }));
  expect(map.easeTo).toHaveBeenCalledWith(
    expect.objectContaining({
      padding: { top: 0, left: 0, right: 0, bottom: 0 },
      duration: 300,
    })
  );
  act(() => map.end());
  expect(map.easeTo).toHaveBeenCalledTimes(1);
  act(() => vi.advanceTimersByTime(3200));
  expect(screen.queryByRole('button', { name: '进入地图' })).toBeNull();
  expect(enter).not.toHaveBeenCalled();
  expect(map.flyTo).toHaveBeenLastCalledWith(
    expect.objectContaining({
      center: [117.28, 31.86],
      zoom: 13,
      duration: 2300,
    })
  );
  act(() => map.end());
  act(() => vi.advanceTimersByTime(0));
  expect(enter).toHaveBeenCalledOnce();
  expect(window.__entryMap).toBe(map);
  unmount();
  expect(map.remove).not.toHaveBeenCalled();
});

it('shows account choices only when the real map has loaded', () => {
  render(
    <MinimalLoader>
      <button>邮箱登录</button>
    </MinimalLoader>
  );
  expect(screen.queryByRole('button', { name: '邮箱登录' })).toBeNull();
  expect(screen.getByRole('button', { name: '正在加载地球…' })).toBeDisabled();
  const loaded = map.on.mock.calls.find(([event]) => event === 'load')[1];
  act(() => loaded());
  expect(screen.getByRole('button', { name: '邮箱登录' })).toBeVisible();
  expect(screen.getByRole('button', { name: '进入地图' })).toBeEnabled();
});

it('completes reduced motion entry when moveend fires synchronously', () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true }))
  );
  const enter = vi.fn();
  const { unmount } = render(<MinimalLoader onShowLogin={enter} />);
  act(() => map.error(new Error('map unavailable')));
  fireEvent.click(screen.getByRole('button', { name: '进入地图' }));
  act(() => vi.advanceTimersByTime(0));
  expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({ duration: 0 }));
  act(() => vi.advanceTimersByTime(1));
  expect(enter).toHaveBeenCalledOnce();
  unmount();
});

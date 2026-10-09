import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useMarkerListUI } from './useMarkerListUI.js';
import api from '../api/index.js';

afterEach(() => {
  delete window.electronAPI;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('debounces description searches and ignores results after the query is cleared', async () => {
  let finishSearch;
  vi.spyOn(api.photos, 'searchNotes').mockResolvedValue([]);
  const search = vi.spyOn(api.photos, 'searchByContent').mockImplementation(() =>
    new Promise(resolve => { finishSearch = resolve; })
  );
  const { result } = setup();
  act(() => {
    result.current.handleMarkerListSearch('海');
    result.current.handleMarkerListSearch('海边');
  });
  await waitFor(() => expect(search).toHaveBeenCalledWith('海边', 20));
  expect(search).toHaveBeenCalledOnce();
  act(() => result.current.handleMarkerListSearch(''));
  await act(async () => finishSearch([{ photoId: 'old' }]));
  expect(result.current.semanticResults).toEqual([]);
  expect(result.current.isSemanticSearching).toBe(false);
});

it('reports description search failures instead of silently treating them as no matches', async () => {
  vi.spyOn(api.photos, 'searchNotes').mockResolvedValue([]);
  vi.spyOn(api.photos, 'searchByContent').mockRejectedValue(new Error('模型正在加载'));
  const showToast = vi.fn();
  const { result } = renderHook(() => useMarkerListUI({ showToast }));
  act(() => result.current.handleMarkerListSearch('海边'));
  await waitFor(() => expect(showToast).toHaveBeenCalledWith('info', '模型正在加载'));
  expect(result.current.isSemanticSearching).toBe(false);
});

function setup() {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  window.electronAPI = {
    getMarkerDetail: vi.fn(async id => ({ id, photos: [{ id: `${id}-photo` }] })),
  };
  const listeners = new Set();
  const map = {
    stop: vi.fn(),
    once: vi.fn((event, handler) => listeners.add(handler)),
    off: vi.fn((event, handler) => listeners.delete(handler)),
    flyTo: vi.fn(),
    project: vi.fn(() => ({ x: 400, y: 300 })),
  };
  const setMarkerMenu = vi.fn();
  const hook = renderHook(() =>
    useMarkerListUI({
      batchMode: false,
      mapRef: { current: map },
      setMarkerMenu,
      showToast: vi.fn(),
    })
  );
  return { ...hook, map, setMarkerMenu, finish: () => [...listeners].forEach(fn => fn()) };
}

it('waits for map arrival and anchors the information to the final projected position', async () => {
  const { result, map, setMarkerMenu, finish } = setup();
  let pending;
  act(() => {
    pending = result.current.handleMarkerListMarkerClick({ id: 'a', lng: 120, lat: 30 });
  });
  await waitFor(() => expect(map.flyTo).toHaveBeenCalled());
  expect(setMarkerMenu).toHaveBeenCalledWith(null);
  expect(setMarkerMenu.mock.calls.some(([menu]) => menu?.marker)).toBe(false);
  await act(async () => {
    finish();
    await pending;
  });
  expect(setMarkerMenu).toHaveBeenLastCalledWith(
    expect.objectContaining({
      x: 400,
      y: 300,
      marker: expect.objectContaining({ id: 'a', photos: [{ id: 'a-photo' }] }),
    })
  );
});

it('cancels pending information when unmounted', async () => {
  const { result, map, setMarkerMenu, unmount, finish } = setup();
  let pending;
  act(() => {
    pending = result.current.handleMarkerListMarkerClick({ id: 'a', lng: 120, lat: 30 });
  });
  await waitFor(() => expect(map.flyTo).toHaveBeenCalled());
  unmount();
  finish();
  await pending;
  expect(setMarkerMenu.mock.calls.some(([menu]) => menu?.marker)).toBe(false);
});

it('only opens the latest selected marker after arrival', async () => {
  const { result, map, setMarkerMenu, finish } = setup();
  let first;
  let second;
  act(() => {
    first = result.current.handleMarkerListMarkerClick({ id: 'a', lng: 120, lat: 30 });
  });
  await waitFor(() => expect(map.flyTo).toHaveBeenCalledTimes(1));
  act(() => {
    second = result.current.handleMarkerListMarkerClick({ id: 'b', lng: 121, lat: 31 });
  });
  await waitFor(() => expect(map.flyTo).toHaveBeenCalledTimes(2));
  await act(async () => {
    finish();
    await Promise.all([first, second]);
  });
  const opened = setMarkerMenu.mock.calls.filter(([menu]) => menu?.marker);
  expect(opened).toHaveLength(1);
  expect(opened[0][0].marker.id).toBe('b');
});

it('handles synchronous arrival under reduced motion', async () => {
  const { result, map, setMarkerMenu, finish } = setup();
  map.flyTo.mockImplementation(finish);
  await act(async () => {
    await result.current.handleMarkerListMarkerClick({ id: 'a', lng: 120, lat: 30 });
  });
  expect(setMarkerMenu).toHaveBeenLastCalledWith(
    expect.objectContaining({ marker: expect.objectContaining({ id: 'a' }) })
  );
});

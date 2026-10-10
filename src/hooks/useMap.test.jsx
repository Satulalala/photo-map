import { useLayoutEffect } from 'react';
import { act, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useMap } from './useMap.js';
import { rememberMapSession } from '../api/auth.js';

afterEach(() => {
  localStorage.clear();
  delete window.__entryMap;
  delete window.electronAPI;
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('sets the access token before constructing the map on a direct page refresh', async () => {
  rememberMapSession();
  vi.stubEnv('VITE_MAPBOX_TOKEN', 'test-public-token');
  const map = { on: vi.fn(), once: vi.fn(), remove: vi.fn() };
  let tokenAtConstruction;
  let mapOptions;
  vi.stubGlobal('mapboxgl', {
    supported: () => true,
    Map: class {
      constructor(options) {
        mapOptions = options;
        tokenAtConstruction = window.mapboxgl.accessToken;
        return map;
      }
    },
  });
  renderHook(() => {
    const state = useMap({
      markers: [],
      newMarkerIds: new Set(),
      mapSettingsRef: { current: {} },
      getPhotoUrl: vi.fn(),
      previewPin: null,
      setPreviewPin: vi.fn(),
      setContextMenu: vi.fn(),
      setPlaceName: vi.fn(),
      setMarkerMenu: vi.fn(),
    });
    useLayoutEffect(() => {
      state.mapContainerRef.current = document.createElement('div');
    }, []);
    return state;
  });
  await waitFor(() => expect(tokenAtConstruction).toBe('test-public-token'));
  expect(mapOptions.refreshExpiredTiles).toBe(true);
  expect(mapOptions.maxTileCacheSize).toBeUndefined();
});

it('adopts a loaded map, enables controls and refreshes a marker preview after adding photos', async () => {
  rememberMapSession();
  const handler = () => ({ enable: vi.fn(), disable: vi.fn() });
  const canvas = document.createElement('div');
  const map = {
    getContainer: () => canvas,
    resize: vi.fn(),
    scrollZoom: handler(),
    doubleClickZoom: handler(),
    boxZoom: handler(),
    keyboard: handler(),
    touchZoomRotate: handler(),
    dragPan: handler(),
    dragRotate: handler(),
    setMinZoom: vi.fn(),
    setMaxZoom: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    remove: vi.fn(),
    isStyleLoaded: () => false,
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    flyTo: vi.fn(),
  };
  window.__entryMap = map;
  let markerElement;
  const createMarker = vi.fn();
  vi.stubGlobal('mapboxgl', {
    supported: () => true,
    Map: vi.fn(),
    Marker: class {
      constructor({ element }) { markerElement = element; createMarker(); }
      setLngLat() { return this; }
      addTo() {
        markerElement.style.transform = 'translate(400px, 300px)';
        return this;
      }
      getElement() { return markerElement; }
      remove() {}
    },
  });
  const args = {
    markers: [{ id: 'new-pin', lat: 31.8, lng: 117.2 }],
    newMarkerIds: new Set(['new-pin']),
    mapSettingsRef: { current: {} },
    getPhotoUrl: vi.fn(),
    previewPin: null,
    setPreviewPin: vi.fn(),
    setContextMenu: vi.fn(),
    setPlaceName: vi.fn(),
    markerMenu: null,
    setMarkerMenu: vi.fn(),
  };
  const { result, rerender } = renderHook(() => {
    const state = useMap(args);
    useLayoutEffect(() => {
      state.mapContainerRef.current = document.createElement('div');
    }, []);
    return state;
  });
  await waitFor(() => expect(result.current.mapLoaded).toBe(true));
  expect(map.once).not.toHaveBeenCalledWith('idle', expect.any(Function));
  expect(map.addLayer).toHaveBeenCalled();
  expect(result.current.mapContainerRef.current.firstChild).toBe(canvas);
  act(() => {
    result.current.zoomIn();
    result.current.zoomOut();
    result.current.goToMyLocation();
  });
  expect(map.zoomIn).toHaveBeenCalledOnce();
  expect(map.zoomOut).toHaveBeenCalledOnce();
  expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({ zoom: 15 }));

  // Entrance animation must never replace the Mapbox positioning transform.
  expect(markerElement.style.animation).toBe('');
  expect(markerElement.style.transform).toBe('translate(400px, 300px)');
  expect(markerElement.querySelector('.marker-visual-new svg')).not.toBeNull();

  // An upload first creates an empty pin, then supplies its cover photo.
  const thumbnail = 'data:image/png;base64,AA==';
  window.electronAPI = { getThumbnailUrl: vi.fn().mockResolvedValue(thumbnail) };
  args.markers = [{ ...args.markers[0], firstPhoto: { id: 'photo.jpg' }, photoCount: 1 }];
  rerender();
  await waitFor(() => expect(markerElement.querySelector('img')).toHaveAttribute('src', thumbnail));
  fireEvent.load(markerElement.querySelector('img'));
  expect(markerElement.querySelector('img').style.opacity).toBe('1');
  expect(createMarker).toHaveBeenCalledTimes(2);

  // Saving notes replaces the list summary with detail; keep its same preview.
  args.markers = [{ id: 'new-pin', lat: 31.8, lng: 117.2, photos: [{ id: 'photo.jpg', note: '11' }] }];
  rerender();
  expect(createMarker).toHaveBeenCalledTimes(2);
  expect(window.electronAPI.getThumbnailUrl).toHaveBeenCalledOnce();

  // A missing thumbnail can still show the original photo.
  window.electronAPI.getThumbnailUrl.mockResolvedValue(null);
  args.getPhotoUrl.mockResolvedValue(thumbnail);
  args.markers = [{ ...args.markers[0], photos: [{ id: 'other.jpg' }] }];
  rerender();
  await waitFor(() => expect(args.getPhotoUrl).toHaveBeenCalledWith({ id: 'other.jpg' }));
  await waitFor(() => expect(markerElement.querySelector('img')).toHaveAttribute('src', thumbnail));

  // The map listener reads the current detail state, not its initial closure.
  args.markerMenu = { marker: args.markers[0] };
  rerender();
  const mapClick = map.on.mock.calls.find(([event]) => event === 'click')[1];
  act(() => mapClick({}));
  expect(args.setMarkerMenu).toHaveBeenCalledWith(null);
  expect(args.setContextMenu).toHaveBeenCalledWith(null);
  expect(args.setPreviewPin).toHaveBeenCalledWith(null);
  expect(args.setPlaceName).not.toHaveBeenCalled();
});

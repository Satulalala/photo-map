import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.electronAPI
window.electronAPI = {
  loadMarkers: vi.fn(() => Promise.resolve([])),
  getMarkerDetail: vi.fn(() => Promise.resolve(null)),
  addMarker: vi.fn(() => Promise.resolve(true)),
  updateMarker: vi.fn(() => Promise.resolve(true)),
  deleteMarker: vi.fn(() => Promise.resolve(true)),
  selectPhotos: vi.fn(() => Promise.resolve([])),
  getPhotoUrl: vi.fn(() => Promise.resolve('')),
  getThumbnailUrl: vi.fn(() => Promise.resolve('')),
  getPlaceholderUrl: vi.fn(() => Promise.resolve('')),
  getCacheStats: vi.fn(() => Promise.resolve({ count: 0, size: 0 })),
  setTitleBarOverlay: vi.fn(() => Promise.resolve(true)),
};

// Mock mapboxgl
window.mapboxgl = {
  accessToken: 'test-token',
  Map: vi.fn(() => ({
    on: vi.fn(),
    remove: vi.fn(),
    flyTo: vi.fn(),
    getCenter: vi.fn(() => ({ lng: 117, lat: 32 })),
    getZoom: vi.fn(() => 10),
    project: vi.fn(() => ({ x: 100, y: 100 })),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    setLayoutProperty: vi.fn(),
    getSource: vi.fn(),
    getLayer: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
  })),
  Marker: vi.fn(() => ({
    setLngLat: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    getElement: vi.fn(() => ({ style: {} })),
  })),
};

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    this.callback([{ isIntersecting: true }]);
  }
  disconnect() {}
  unobserve() {}
}
window.IntersectionObserver = MockIntersectionObserver;

// Mock requestIdleCallback
window.requestIdleCallback = (cb) => setTimeout(cb, 0);

const PROTECTED_STORES = new Set(['markers', 'photos', 'settings']);

export const DEFAULT_MAPLIBRE_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export function isMapLibreTestRoute() {
  if (typeof window === 'undefined') return false;

  const isNativeElectron = Boolean(window.electronAPI && !window.electronAPI.__isWebAdapter);
  return !isNativeElectron && /^\/maplibre-test\/?$/.test(window.location.pathname);
}

export function getMapLibreStyleUrl() {
  return import.meta.env.VITE_MAPLIBRE_STYLE_URL?.trim() || DEFAULT_MAPLIBRE_STYLE_URL;
}

export function assertPhotoMapWritesAllowed(storeNames, mode = 'readonly') {
  if (!isMapLibreTestRoute() || mode !== 'readwrite') return;

  const names = Array.isArray(storeNames) ? storeNames : [storeNames];
  if (names.some(name => PROTECTED_STORES.has(name))) {
    throw new Error('MapLibre 测试页面为只读模式，未保存任何更改。');
  }
}

const configuredBase = import.meta.env.VITE_API_BASE_URL;
export const IS_WEB_BUILD = import.meta.env.VITE_APP_TARGET === 'web';
const API_BASE_KEY = 'cloudSyncApiBase';

export const DEFAULT_API_BASE = configuredBase ?? (IS_WEB_BUILD ? '' : 'https://photomap.satula.top');

export function getApiBase() {
  try {
    const savedBase = localStorage.getItem(API_BASE_KEY);
    if (savedBase !== null) return savedBase.trim().replace(/\/+$/, '');
  } catch {}
  return DEFAULT_API_BASE.replace(/\/+$/, '');
}

export function apiUrl(path) {
  return `${getApiBase()}${path}`;
}

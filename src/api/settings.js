/**
 * 设置与缓存 API
 */
import { isElectron, getDefaultSettings } from './utils.js';
import { webStorage } from './webStorage.js';

export const settingsApi = {
  async getAll() {
    if (isElectron()) {
      return window.electronAPI.getSettings?.() || getDefaultSettings();
    }
    return webStorage.settings.getAll();
  },

  async get(key) {
    const settings = await this.getAll();
    return settings[key];
  },

  async set(key, value) {
    if (isElectron()) {
      await window.electronAPI.setSetting?.(key, value);
    } else {
      await webStorage.settings.set(key, value);
    }
  },

  async setAll(settings) {
    if (isElectron()) {
      await window.electronAPI.setSettings?.(settings);
    } else {
      await webStorage.settings.setAll(settings);
    }
  },

  async reset() {
    const defaults = getDefaultSettings();
    await this.setAll(defaults);
    return defaults;
  },
};

export const cacheApi = {
  async getStats() {
    if (isElectron()) {
      return window.electronAPI.getCacheStats?.() || { count: 0, size: 0 };
    }
    return webStorage.cache.getStats();
  },

  async clear() {
    if (isElectron()) {
      await window.electronAPI.clearCache?.();
    } else {
      await webStorage.cache.clear();
    }
  },

  async clearExpired() {
    if (isElectron()) {
      return window.electronAPI.clearExpiredCache?.() || 0;
    }
    return webStorage.cache.clearExpired();
  },
};

/**
 * 地图相册 - 统一 API 入口
 *
 * 提供统一的数据访问接口，抽象底层存储实现
 * 支持 Electron（SQLite）和 Web（IndexedDB）两种环境
 *
 * @example
 * import api from './api';
 *
 * const markers = await api.markers.getAll();
 * const marker = await api.markers.create({ lat: 39.9, lng: 116.4 });
 * await api.photos.add(markerId, photoData);
 */

import { isElectron, isWeb, generateId, getDefaultSettings } from './utils.js';
import { markersApi, photosApi } from './markers.js';
import { settingsApi, cacheApi } from './settings.js';
import { geocodingApi } from './geocoding.js';
import { webStorage } from './webStorage.js';

// Web 环境下初始化 IndexedDB
if (isWeb()) {
  webStorage.init().catch(console.error);
}

export default {
  markers: markersApi,
  photos: photosApi,
  settings: settingsApi,
  cache: cacheApi,
  geocoding: geocodingApi,
};

export {
  markersApi,
  photosApi,
  settingsApi,
  cacheApi,
  geocodingApi,
  webStorage,
  generateId,
  getDefaultSettings,
  isElectron,
  isWeb,
};

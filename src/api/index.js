/**
 * 地图相册 - 统一 API 层
 * 
 * 提供统一的数据访问接口，抽象底层存储实现
 * 支持 Electron（SQLite）和 Web（IndexedDB）两种环境
 * 
 * @example
 * import api from './api';
 * 
 * // 获取所有标记
 * const markers = await api.markers.getAll();
 * 
 * // 创建标记
 * const marker = await api.markers.create({ lat: 39.9, lng: 116.4 });
 * 
 * // 添加照片
 * await api.photos.add(markerId, photoData);
 */

import { isElectron, isWeb } from './environment';

// ========== 环境检测 ==========

/** 是否为 Electron 环境 */
const IS_ELECTRON = typeof window !== 'undefined' && window.electronAPI;

/** 是否为 Web 环境 */
const IS_WEB = !IS_ELECTRON;

// ========== 标记 API ==========

/**
 * 标记相关 API
 */
export const markersApi = {
  /**
   * 获取所有标记
   * @returns {Promise<Array>} 标记列表
   */
  async getAll() {
    if (IS_ELECTRON) {
      return window.electronAPI.loadMarkers();
    }
    // Web 版本使用 IndexedDB
    return webStorage.markers.getAll();
  },

  /**
   * 根据 ID 获取标记
   * @param {string} id - 标记 ID
   * @returns {Promise<Object|null>} 标记对象
   */
  async getById(id) {
    if (IS_ELECTRON) {
      return window.electronAPI.getMarker(id);
    }
    return webStorage.markers.getById(id);
  },

  /**
   * 创建标记
   * @param {Object} data - 标记数据
   * @param {number} data.lat - 纬度
   * @param {number} data.lng - 经度
   * @param {string} [data.name] - 地点名称
   * @returns {Promise<Object>} 创建的标记
   */
  async create(data) {
    const marker = {
      id: generateId(),
      lat: data.lat,
      lng: data.lng,
      name: data.name || '',
      createdAt: Date.now(),
      photoCount: 0,
    };

    if (IS_ELECTRON) {
      await window.electronAPI.saveMarker(marker);
    } else {
      await webStorage.markers.save(marker);
    }

    return marker;
  },

  /**
   * 更新标记
   * @param {string} id - 标记 ID
   * @param {Object} data - 更新数据
   * @returns {Promise<Object>} 更新后的标记
   */
  async update(id, data) {
    const updateData = {
      id,
      ...data,
      updatedAt: Date.now(),
    };

    if (IS_ELECTRON) {
      await window.electronAPI.updateMarker(updateData);
    } else {
      await webStorage.markers.update(id, updateData);
    }

    return updateData;
  },

  /**
   * 删除标记
   * @param {string} id - 标记 ID
   * @returns {Promise<boolean>} 是否成功
   */
  async delete(id) {
    if (IS_ELECTRON) {
      await window.electronAPI.deleteMarker(id);
    } else {
      await webStorage.markers.delete(id);
    }
    return true;
  },

  /**
   * 搜索标记
   * @param {string} keyword - 搜索关键词
   * @returns {Promise<Array>} 匹配的标记列表
   */
  async search(keyword) {
    const markers = await this.getAll();
    const lowerKeyword = keyword.toLowerCase();
    
    return markers.filter(marker => 
      marker.name?.toLowerCase().includes(lowerKeyword)
    );
  },

  /**
   * 获取指定范围内的标记
   * @param {Object} bounds - 边界框
   * @returns {Promise<Array>} 范围内的标记列表
   */
  async getInBounds(bounds) {
    const markers = await this.getAll();
    
    return markers.filter(marker =>
      marker.lat >= bounds.minLat &&
      marker.lat <= bounds.maxLat &&
      marker.lng >= bounds.minLng &&
      marker.lng <= bounds.maxLng
    );
  },
};

// ========== 照片 API ==========

/**
 * 照片相关 API
 */
export const photosApi = {
  /**
   * 获取标记的所有照片
   * @param {string} markerId - 标记 ID
   * @returns {Promise<Array>} 照片列表
   */
  async getByMarkerId(markerId) {
    if (IS_ELECTRON) {
      return window.electronAPI.getPhotos(markerId);
    }
    return webStorage.photos.getByMarkerId(markerId);
  },

  /**
   * 根据 ID 获取照片
   * @param {string} markerId - 标记 ID
   * @param {string} photoId - 照片 ID
   * @returns {Promise<Object|null>} 照片对象
   */
  async getById(markerId, photoId) {
    const photos = await this.getByMarkerId(markerId);
    return photos.find(p => p.id === photoId) || null;
  },

  /**
   * 添加照片到标记
   * @param {string} markerId - 标记 ID
   * @param {Object} photoData - 照片数据
   * @returns {Promise<Object>} 添加的照片
   */
  async add(markerId, photoData) {
    const photo = {
      id: generateId(),
      ...photoData,
      createdAt: Date.now(),
    };

    if (IS_ELECTRON) {
      await window.electronAPI.addPhoto(markerId, photo);
    } else {
      await webStorage.photos.add(markerId, photo);
    }

    return photo;
  },

  /**
   * 批量添加照片
   * @param {string} markerId - 标记 ID
   * @param {Array} photosData - 照片数据数组
   * @returns {Promise<Array>} 添加的照片列表
   */
  async addBatch(markerId, photosData) {
    const photos = photosData.map(data => ({
      id: generateId(),
      ...data,
      createdAt: Date.now(),
    }));

    if (IS_ELECTRON) {
      for (const photo of photos) {
        await window.electronAPI.addPhoto(markerId, photo);
      }
    } else {
      await webStorage.photos.addBatch(markerId, photos);
    }

    return photos;
  },

  /**
   * 更新照片
   * @param {string} markerId - 标记 ID
   * @param {string} photoId - 照片 ID
   * @param {Object} data - 更新数据
   * @returns {Promise<Object>} 更新后的照片
   */
  async update(markerId, photoId, data) {
    const updateData = {
      ...data,
      updatedAt: Date.now(),
    };

    if (IS_ELECTRON) {
      await window.electronAPI.updatePhoto(markerId, photoId, updateData);
    } else {
      await webStorage.photos.update(markerId, photoId, updateData);
    }

    return { id: photoId, ...updateData };
  },

  /**
   * 删除照片
   * @param {string} markerId - 标记 ID
   * @param {string} photoId - 照片 ID
   * @returns {Promise<boolean>} 是否成功
   */
  async delete(markerId, photoId) {
    if (IS_ELECTRON) {
      await window.electronAPI.deletePhoto(markerId, photoId);
    } else {
      await webStorage.photos.delete(markerId, photoId);
    }
    return true;
  },

  /**
   * 搜索照片备注
   * @param {string} keyword - 搜索关键词
   * @returns {Promise<Array>} 匹配的照片列表（包含标记信息）
   */
  async searchNotes(keyword) {
    if (IS_ELECTRON) {
      return window.electronAPI.searchNotes(keyword);
    }
    return webStorage.photos.searchNotes(keyword);
  },

  /**
   * 获取照片 URL
   * @param {Object} photo - 照片对象
   * @returns {Promise<string>} 照片 URL
   */
  async getUrl(photo) {
    // 旧格式：直接是 base64
    if (photo.data && photo.data.startsWith('data:')) {
      return photo.data;
    }
    
    // 新格式：需要从文件读取
    if (IS_ELECTRON && photo.originalPath) {
      return window.electronAPI.getPhotoUrl(photo.originalPath);
    }
    
    // Web 版本
    if (photo.data) {
      return `data:image/jpeg;base64,${photo.data}`;
    }
    
    return '';
  },

  /**
   * 获取缩略图 URL
   * @param {Object} photo - 照片对象
   * @returns {Promise<string>} 缩略图 URL
   */
  async getThumbnailUrl(photo) {
    if (photo.thumbnail) {
      if (photo.thumbnail.startsWith('data:')) {
        return photo.thumbnail;
      }
      return `data:image/jpeg;base64,${photo.thumbnail}`;
    }
    
    // 没有缩略图时使用原图
    return this.getUrl(photo);
  },
};

// ========== 设置 API ==========

/**
 * 设置相关 API
 */
export const settingsApi = {
  /**
   * 获取所有设置
   * @returns {Promise<Object>} 设置对象
   */
  async getAll() {
    if (IS_ELECTRON) {
      return window.electronAPI.getSettings?.() || getDefaultSettings();
    }
    return webStorage.settings.getAll();
  },

  /**
   * 获取单个设置
   * @param {string} key - 设置键名
   * @returns {Promise<*>} 设置值
   */
  async get(key) {
    const settings = await this.getAll();
    return settings[key];
  },

  /**
   * 保存设置
   * @param {string} key - 设置键名
   * @param {*} value - 设置值
   * @returns {Promise<void>}
   */
  async set(key, value) {
    if (IS_ELECTRON) {
      await window.electronAPI.setSetting?.(key, value);
    } else {
      await webStorage.settings.set(key, value);
    }
  },

  /**
   * 批量保存设置
   * @param {Object} settings - 设置对象
   * @returns {Promise<void>}
   */
  async setAll(settings) {
    if (IS_ELECTRON) {
      await window.electronAPI.setSettings?.(settings);
    } else {
      await webStorage.settings.setAll(settings);
    }
  },

  /**
   * 重置设置为默认值
   * @returns {Promise<Object>} 默认设置
   */
  async reset() {
    const defaults = getDefaultSettings();
    await this.setAll(defaults);
    return defaults;
  },
};

// ========== 缓存 API ==========

/**
 * 缓存相关 API
 */
export const cacheApi = {
  /**
   * 获取缓存统计
   * @returns {Promise<Object>} 缓存统计
   */
  async getStats() {
    if (IS_ELECTRON) {
      return window.electronAPI.getCacheStats?.() || { count: 0, size: 0 };
    }
    return webStorage.cache.getStats();
  },

  /**
   * 清理缓存
   * @returns {Promise<void>}
   */
  async clear() {
    if (IS_ELECTRON) {
      await window.electronAPI.clearCache?.();
    } else {
      await webStorage.cache.clear();
    }
  },

  /**
   * 清理过期缓存
   * @returns {Promise<number>} 清理的项数
   */
  async clearExpired() {
    if (IS_ELECTRON) {
      return window.electronAPI.clearExpiredCache?.() || 0;
    }
    return webStorage.cache.clearExpired();
  },
};

// ========== 地理编码 API ==========

/**
 * 地理编码相关 API
 */
export const geocodingApi = {
  /**
   * 根据坐标获取地名
   * @param {number} lat - 纬度
   * @param {number} lng - 经度
   * @returns {Promise<string>} 地名
   */
  async reverseGeocode(lat, lng) {
    try {
      const token = window.mapboxgl?.accessToken;
      if (!token) {
        throw new Error('Mapbox token not found');
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
        `access_token=${token}&language=zh&limit=1`
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();
      
      if (data.features?.[0]) {
        const place = data.features[0].place_name_zh || data.features[0].place_name || '';
        // 移除邮编
        return place.replace(/\s*\d{5,6}\s*$/, '').replace(/,\s*$/, '');
      }

      return '';
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return '';
    }
  },

  /**
   * 搜索地点
   * @param {string} query - 搜索关键词
   * @returns {Promise<Array>} 搜索结果
   */
  async searchPlace(query) {
    try {
      const token = window.mapboxgl?.accessToken;
      if (!token) {
        throw new Error('Mapbox token not found');
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${token}&language=zh&limit=5`
      );

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data = await response.json();
      
      return (data.features || []).map(feature => ({
        id: feature.id,
        name: feature.text,
        fullName: feature.place_name_zh || feature.place_name,
        coordinate: {
          lng: feature.center[0],
          lat: feature.center[1],
        },
        category: feature.properties?.category,
      }));
    } catch (error) {
      console.error('Place search error:', error);
      return [];
    }
  },
};

// ========== Web 存储实现 ==========

/**
 * Web 版本存储实现（IndexedDB）
 */
const webStorage = {
  dbName: 'photo-map-db',
  dbVersion: 1,
  db: null,

  /**
   * 初始化数据库
   */
  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 创建标记存储
        if (!db.objectStoreNames.contains('markers')) {
          const markersStore = db.createObjectStore('markers', { keyPath: 'id' });
          markersStore.createIndex('createdAt', 'createdAt');
          markersStore.createIndex('name', 'name');
        }

        // 创建照片存储
        if (!db.objectStoreNames.contains('photos')) {
          const photosStore = db.createObjectStore('photos', { keyPath: 'id' });
          photosStore.createIndex('markerId', 'markerId');
          photosStore.createIndex('createdAt', 'createdAt');
        }

        // 创建设置存储
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  },

  /**
   * 获取事务
   */
  async getTransaction(storeNames, mode = 'readonly') {
    const db = await this.init();
    return db.transaction(storeNames, mode);
  },

  // 标记操作
  markers: {
    async getAll() {
      const tx = await webStorage.getTransaction('markers');
      const store = tx.objectStore('markers');
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },

    async getById(id) {
      const tx = await webStorage.getTransaction('markers');
      const store = tx.objectStore('markers');
      
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },

    async save(marker) {
      const tx = await webStorage.getTransaction('markers', 'readwrite');
      const store = tx.objectStore('markers');
      
      return new Promise((resolve, reject) => {
        const request = store.put(marker);
        request.onsuccess = () => resolve(marker);
        request.onerror = () => reject(request.error);
      });
    },

    async update(id, data) {
      const existing = await this.getById(id);
      if (!existing) throw new Error('Marker not found');
      
      const updated = { ...existing, ...data };
      return this.save(updated);
    },

    async delete(id) {
      const tx = await webStorage.getTransaction('markers', 'readwrite');
      const store = tx.objectStore('markers');
      
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    },
  },

  // 照片操作
  photos: {
    async getByMarkerId(markerId) {
      const tx = await webStorage.getTransaction('photos');
      const store = tx.objectStore('photos');
      const index = store.index('markerId');
      
      return new Promise((resolve, reject) => {
        const request = index.getAll(markerId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },

    async add(markerId, photo) {
      const tx = await webStorage.getTransaction('photos', 'readwrite');
      const store = tx.objectStore('photos');
      
      const photoWithMarker = { ...photo, markerId };
      
      return new Promise((resolve, reject) => {
        const request = store.put(photoWithMarker);
        request.onsuccess = () => resolve(photoWithMarker);
        request.onerror = () => reject(request.error);
      });
    },

    async addBatch(markerId, photos) {
      const tx = await webStorage.getTransaction('photos', 'readwrite');
      const store = tx.objectStore('photos');
      
      const results = [];
      for (const photo of photos) {
        const photoWithMarker = { ...photo, markerId };
        store.put(photoWithMarker);
        results.push(photoWithMarker);
      }
      
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(results);
        tx.onerror = () => reject(tx.error);
      });
    },

    async update(markerId, photoId, data) {
      const photos = await this.getByMarkerId(markerId);
      const photo = photos.find(p => p.id === photoId);
      if (!photo) throw new Error('Photo not found');
      
      const updated = { ...photo, ...data };
      return this.add(markerId, updated);
    },

    async delete(markerId, photoId) {
      const tx = await webStorage.getTransaction('photos', 'readwrite');
      const store = tx.objectStore('photos');
      
      return new Promise((resolve, reject) => {
        const request = store.delete(photoId);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    },

    async searchNotes(keyword) {
      const tx = await webStorage.getTransaction('photos');
      const store = tx.objectStore('photos');
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const photos = request.result;
          const lowerKeyword = keyword.toLowerCase();
          const results = photos.filter(p => 
            p.note?.toLowerCase().includes(lowerKeyword)
          );
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    },
  },

  // 设置操作
  settings: {
    async getAll() {
      const tx = await webStorage.getTransaction('settings');
      const store = tx.objectStore('settings');
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const items = request.result;
          const settings = {};
          items.forEach(item => {
            settings[item.key] = item.value;
          });
          resolve({ ...getDefaultSettings(), ...settings });
        };
        request.onerror = () => reject(request.error);
      });
    },

    async set(key, value) {
      const tx = await webStorage.getTransaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      
      return new Promise((resolve, reject) => {
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },

    async setAll(settings) {
      const tx = await webStorage.getTransaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      
      for (const [key, value] of Object.entries(settings)) {
        store.put({ key, value });
      }
      
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
  },

  // 缓存操作
  cache: {
    async getStats() {
      // 简单实现
      return { count: 0, size: 0 };
    },

    async clear() {
      // 清理 localStorage 中的缓存
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('photo-map-cache-')) {
          localStorage.removeItem(key);
        }
      });
    },

    async clearExpired() {
      return 0;
    },
  },
};

// ========== 工具函数 ==========

/**
 * 生成唯一 ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取默认设置
 */
function getDefaultSettings() {
  return {
    map: {
      style: 'streets',
      showHeatmap: false,
      showClusters: true,
      markerSize: 'medium',
    },
    performance: {
      hardwareAcceleration: true,
      cacheLimit: 100,
      lazyLoading: true,
      thumbnailQuality: 80,
    },
    storage: {
      dataPath: '',
      autoBackup: false,
      backupInterval: 7,
    },
    language: 'zh-CN',
    theme: 'system',
  };
}

// ========== 初始化 ==========

// Web 环境下初始化 IndexedDB
if (IS_WEB) {
  webStorage.init().catch(console.error);
}

// ========== 导出 ==========

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
  IS_ELECTRON,
  IS_WEB,
};
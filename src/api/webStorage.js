/**
 * Web 版本存储实现（IndexedDB）
 */
import { getDefaultSettings } from './utils.js';

export const webStorage = {
  dbName: 'photo-map-db',
  dbVersion: 1,
  db: null,

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = event => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('markers')) {
          const markersStore = db.createObjectStore('markers', { keyPath: 'id' });
          markersStore.createIndex('createdAt', 'createdAt');
          markersStore.createIndex('name', 'name');
        }

        if (!db.objectStoreNames.contains('photos')) {
          const photosStore = db.createObjectStore('photos', { keyPath: 'id' });
          photosStore.createIndex('markerId', 'markerId');
          photosStore.createIndex('createdAt', 'createdAt');
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  },

  async getTransaction(storeNames, mode = 'readonly') {
    const db = await this.init();
    return db.transaction(storeNames, mode);
  },

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
        request.onsuccess = async () => {
          const photos = request.result;
          const lowerKeyword = keyword.toLowerCase();
          const matched = photos.filter(p =>
            p.note?.toLowerCase().includes(lowerKeyword)
          );
          const enriched = await Promise.all(matched.map(async p => {
            try {
              const marker = await webStorage.markers.getById(p.markerId);
              if (marker) {
                return {
                  ...p,
                  fileId: p.id,
                  lat: marker.lat,
                  lng: marker.lng,
                  markerName: marker.name || '',
                };
              }
            } catch {}
            return { ...p, fileId: p.id };
          }));
          resolve(enriched);
        };
        request.onerror = () => reject(request.error);
      });
    },
  },

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

  cache: {
    async getStats() {
      return { count: 0, size: 0 };
    },

    async clear() {
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

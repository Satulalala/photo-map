/**
 * 标记与照片 API
 */
import { isElectron, generateId } from './utils.js';
import { webStorage } from './webStorage.js';
import { getPhotoDisplayUrl } from './photoFileAccess.js';

export const markersApi = {
  async getAll() {
    if (isElectron()) {
      return window.electronAPI.loadMarkers();
    }
    return webStorage.markers.getAll();
  },

  async getById(id) {
    if (isElectron()) {
      return window.electronAPI.getMarker(id);
    }
    return webStorage.markers.getById(id);
  },

  async create(data) {
    const marker = {
      id: generateId(),
      lat: data.lat,
      lng: data.lng,
      name: data.name || '',
      createdAt: Date.now(),
      photoCount: 0,
    };

    if (isElectron()) {
      await window.electronAPI.saveMarker(marker);
    } else {
      await webStorage.markers.save(marker);
    }

    return marker;
  },

  async update(id, data) {
    const updateData = {
      id,
      ...data,
      updatedAt: Date.now(),
    };

    if (isElectron()) {
      await window.electronAPI.updateMarker(updateData);
    } else {
      await webStorage.markers.update(id, updateData);
    }

    return updateData;
  },

  async upsertSnapshot(marker) {
    if (window.electronAPI?.upsertMarkerSnapshot) return window.electronAPI.upsertMarkerSnapshot(marker);
    const photos = Array.isArray(marker.photos) ? marker.photos : [];
    const existing = await webStorage.photos.getByMarkerId(marker.id);
    const incomingIds = new Set(photos.map(photo => photo.id));
    for (const photo of existing) {
      if (!incomingIds.has(photo.id)) await webStorage.photos.delete(marker.id, photo.id);
    }
    await webStorage.markers.save({ ...marker, photoCount: photos.length });
    if (photos.length) await webStorage.photos.addBatch(marker.id, photos);
    return true;
  },

  async delete(id) {
    if (isElectron()) {
      await window.electronAPI.deleteMarker(id);
    } else {
      const tx = await webStorage.getTransaction(['markers', 'photos'], 'readwrite');
      const photos = tx.objectStore('photos');
      const request = photos.index('markerId').openKeyCursor(id);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          photos.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
      tx.objectStore('markers').delete(id);
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    }
    return true;
  },

  async search(keyword) {
    const markers = await this.getAll();
    const lowerKeyword = keyword.toLowerCase();
    return markers.filter(marker =>
      marker.name?.toLowerCase().includes(lowerKeyword)
    );
  },

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

export const photosApi = {
  async getByMarkerId(markerId) {
    if (isElectron()) {
      return window.electronAPI.getPhotos(markerId);
    }
    return webStorage.photos.getByMarkerId(markerId);
  },

  async getById(markerId, photoId) {
    const photos = await this.getByMarkerId(markerId);
    return photos.find(p => p.id === photoId) || null;
  },

  async add(markerId, photoData) {
    const photo = {
      id: generateId(),
      ...photoData,
      createdAt: Date.now(),
    };

    if (isElectron()) {
      await window.electronAPI.addPhoto(markerId, photo);
    } else {
      await webStorage.photos.add(markerId, photo);
    }

    return photo;
  },

  async addBatch(markerId, photosData) {
    const photos = photosData.map(data => ({
      id: generateId(),
      ...data,
      createdAt: Date.now(),
    }));

    if (isElectron()) {
      for (const photo of photos) {
        await window.electronAPI.addPhoto(markerId, photo);
      }
    } else {
      await webStorage.photos.addBatch(markerId, photos);
    }

    return photos;
  },

  async update(markerId, photoId, data) {
    const updateData = {
      ...data,
      updatedAt: Date.now(),
    };

    if (isElectron()) {
      await window.electronAPI.updatePhoto(markerId, photoId, updateData);
    } else {
      await webStorage.photos.update(markerId, photoId, updateData);
    }

    return { id: photoId, ...updateData };
  },

  async delete(markerId, photoId) {
    if (isElectron()) {
      await window.electronAPI.deletePhoto(markerId, photoId);
    } else {
      await webStorage.photos.delete(markerId, photoId);
    }
    return true;
  },

  async searchNotes(keyword) {
    if (isElectron()) {
      return window.electronAPI.searchNotes(keyword);
    }
    return webStorage.photos.searchNotes(keyword);
  },

  async searchByContent() {
    return { available: false, results: [], reason: 'semantic-search-disabled' };
  },

  async batchGenerateEmbeddings() {
    return { available: false, count: 0, reason: 'semantic-search-disabled' };
  },

  async getEmbeddingStatus() {
    return { isLoaded: false, isLoading: false, hasError: false, error: null, modelName: '', available: false };
  },

  onEmbeddingProgress() {
    return () => {};
  },

  async getUrl(photo) {
    if (photo.data && photo.data.startsWith('data:')) {
      return photo.data;
    }

    if (photo.data instanceof Blob) return URL.createObjectURL(photo.data);
    if (isElectron() && photo.originalPath) {
      return window.electronAPI.getPhotoUrl(photo.originalPath);
    }
    if (photo.data) {
      return `data:image/jpeg;base64,${photo.data}`;
    }
    return photo.id ? getPhotoDisplayUrl(photo.id, false) : '';
  },

  async getThumbnailUrl(photo) {
    if (photo.thumbnail) {
      if (photo.thumbnail.startsWith('data:')) {
        return photo.thumbnail;
      }
      return `data:image/jpeg;base64,${photo.thumbnail}`;
    }

    return photo.id ? getPhotoDisplayUrl(photo.id, true) : this.getUrl(photo);
  },
};

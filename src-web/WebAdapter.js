/**
 * Web 版本适配器
 * 提供与 Electron API 兼容的接口，但使用 Web API 实现
 */
import { webStorage } from '../src/api/webStorage.js';

// 模拟 Electron API 的 Web 实现
class WebElectronAPI {
  constructor() {
    this.isWeb = true;
    this.isElectron = false;
    
    // 绑定所有方法到实例
    this.selectPhotos = this.selectPhotos.bind(this);
    this.getPhotoUrl = this.getPhotoUrl.bind(this);
    this.getThumbnailUrl = this.getThumbnailUrl.bind(this);
    this.generateThumbnail = this.generateThumbnail.bind(this);
    this.storePhoto = this.storePhoto.bind(this);
    this.getStoredPhoto = this.getStoredPhoto.bind(this);
    this.loadMarkers = this.loadMarkers.bind(this);
    this.saveMarkers = this.saveMarkers.bind(this);
    this.addMarker = this.addMarker.bind(this);
    this.updateMarker = this.updateMarker.bind(this);
    this.deleteMarker = this.deleteMarker.bind(this);
    this.addPhotosToMarker = this.addPhotosToMarker.bind(this);
    this.deletePhotoFromMarker = this.deletePhotoFromMarker.bind(this);
    this.getMarkerPhotos = this.getMarkerPhotos.bind(this);
    this.getPhotoInfo = this.getPhotoInfo.bind(this);
    this.loadGuestData = this.loadGuestData.bind(this);
  }

  // 照片管理 - 使用 Web File API
  async selectPhotos() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'image/*';
      
      input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        const photos = [];
        
        for (const file of files) {
          // 生成唯一 ID
          const id = crypto.randomUUID() + '.' + file.name.split('.').pop();
          
          // 转换为 base64（Web 版本暂时使用 base64）
          const reader = new FileReader();
          const data = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
          
          photos.push({ id, data, name: file.name, size: file.size });
        }
        
        resolve(photos);
      };
      
      input.click();
    });
  }

  // 获取照片 URL - Web 版本直接返回 base64
  async getPhotoUrl(photoId) {
    // 从 IndexedDB 或内存中获取
    const photo = await this.getStoredPhoto(photoId);
    if (photo?.data instanceof Blob) return URL.createObjectURL(photo.data);
    return photo?.data || null;
  }

  // 获取缩略图 URL
  async getThumbnailUrl(photoId) {
    // Web 版本可以使用 Canvas 生成缩略图
    const photo = await this.getStoredPhoto(photoId);
    if (photo?.thumbnailData instanceof Blob) return URL.createObjectURL(photo.thumbnailData);
    if (!photo?.data) return null;
    
    return this.generateThumbnail(photo.data);
  }

  // 生成缩略图（使用 Canvas）
  async generateThumbnail(imageData, size = 200) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 计算缩放比例
        const scale = Math.min(size / img.width, size / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        // 绘制缩略图
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.8));
      };
      img.src = imageData;
    });
  }

  // 存储照片到 IndexedDB
  async storePhoto(photo) {
    const transaction = await webStorage.getTransaction('photos', 'readwrite');
    return new Promise((resolve, reject) => {
      transaction.objectStore('photos').put(photo);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  // 从 IndexedDB 获取照片
  async getStoredPhoto(photoId) {
    const transaction = await webStorage.getTransaction('photos');
    const photo = await new Promise((resolve, reject) => {
      const request = transaction.objectStore('photos').get(photoId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (photo) return photo;
    if (webStorage.dbName !== 'photo-map-db') return null;
    // Keep legacy photos readable without deleting or replacing the old database.
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PhotoMapDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('photos')) {
          db.close();
          resolve(null);
          return;
        }
        const transaction = db.transaction(['photos'], 'readonly');
        const store = transaction.objectStore('photos');
        const getRequest = store.get(photoId);
        
        getRequest.onsuccess = () => { db.close(); resolve(getRequest.result); };
        getRequest.onerror = () => { db.close(); reject(getRequest.error); };
      };
    });
  }

  async loadGuestData() {
    const readStore = async (databaseName, storeName) => {
      const known = await indexedDB.databases?.();
      if (known && !known.some(database => database.name === databaseName)) return [];
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.close();
            resolve([]);
            return;
          }
          const tx = db.transaction(storeName, 'readonly');
          const get = tx.objectStore(storeName).getAll();
          get.onsuccess = () => { const values = get.result || []; db.close(); resolve(values); };
          get.onerror = () => { const error = get.error; db.close(); reject(error); };
        };
      });
    };
    const [markers, localPhotos, legacyPhotos] = await Promise.all([
      readStore('photo-map-db', 'markers'),
      readStore('photo-map-db', 'photos'),
      readStore('PhotoMapDB', 'photos'),
    ]);
    const photosById = new Map([...localPhotos, ...legacyPhotos].map(photo => [photo.id, photo]));
    return markers.map(marker => {
      const stored = localPhotos.filter(photo => photo.markerId === marker.id);
      const referenced = (marker.photos || []).map(photo => {
        const value = typeof photo === 'string' ? { id: photo } : photo;
        return { ...(photosById.get(value.id) || {}), ...value };
      });
      const photos = (stored.length ? stored : referenced).sort((a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      );
      return { ...marker, photos, photoCount: photos.length, firstPhoto: photos[0] || null };
    });
  }

  // 标记管理 - 使用 IndexedDB（与 api/index.js 的 webStorage 共用同一数据库）
  async loadMarkers() {
    try {
      const db = await webStorage.init();

      if (!db.objectStoreNames.contains('markers')) return [];

      // 读取所有标记
      const markers = await new Promise((resolve, reject) => {
        const tx = db.transaction('markers', 'readonly');
        const req = tx.objectStore('markers').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      console.log('📍 WebAdapter.loadMarkers: 读取到', markers.length, '个标记');

      if (!db.objectStoreNames.contains('photos') || markers.length === 0) return markers;

      // 为每个标记从 photos store 读取第一张照片的完整数据
      const markersWithPhotos = await Promise.all(markers.map(async marker => {
        const photos = await new Promise((resolve, reject) => {
          const tx = db.transaction('photos', 'readonly');
          const index = tx.objectStore('photos').index('markerId');
          const req = index.getAll(marker.id);
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
          return {
          ...marker,
          photoCount: photos.length,
          firstPhoto: photos.length > 0 ? photos[0] : null,
            photos: photos.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        };
      }));

      return markersWithPhotos;
    } catch (e) {
      console.error('loadMarkers 失败:', e);
      return [];
    }
  }

  async saveMarkers(markers) {
    // 不再使用 localStorage，数据由 api/index.js 的 webStorage 管理
    return true;
  }

  // 添加标记
  async addMarker(marker) {
    try {
      const db = await webStorage.init();
      const lightMarker = {
        id: marker.id,
        lat: marker.lat,
        lng: marker.lng,
        name: marker.name || '',
        photoCount: marker.photoCount || 0,
        firstPhoto: marker.firstPhoto ? { id: marker.firstPhoto.id, note: marker.firstPhoto.note || '' } : null,
        createdAt: marker.createdAt || Date.now()
      };
      const hasPhotos = db.objectStoreNames.contains('photos') && marker.photos && marker.photos.length > 0;
      const storeNames = hasPhotos ? ['markers', 'photos'] : ['markers'];
      const tx = db.transaction(storeNames, 'readwrite');
      tx.objectStore('markers').put(lightMarker);
      if (hasPhotos) {
        const photosStore = tx.objectStore('photos');
        marker.photos.forEach(photo => photosStore.put({ ...photo, markerId: marker.id }));
      }
      return await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(lightMarker);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch (e) {
      console.error('addMarker 失败:', e);
      return null;
    }
  }

  async upsertMarkerSnapshot(marker) {
    const db = await webStorage.init();
    const photos = Array.isArray(marker.photos) ? marker.photos : [];
    const tx = db.transaction(['markers', 'photos'], 'readwrite');
    tx.objectStore('markers').put({
      id: marker.id,
      lat: marker.lat,
      lng: marker.lng,
      name: marker.name || '',
      createdAt: marker.createdAt || Date.now(),
      updatedAt: marker.updatedAt || marker.createdAt || Date.now(),
      photoCount: photos.length,
      firstPhoto: photos[0] ? { id: photos[0].id, note: photos[0].note || '' } : null,
    });
    const photoStore = tx.objectStore('photos');
    const getRequest = photoStore.index('markerId').getAll(marker.id);
    getRequest.onsuccess = () => {
      const existingPhotos = new Map((getRequest.result || []).map(photo => [photo.id, photo]));
      const ids = new Set(photos.map(photo => photo.id));
      for (const existing of getRequest.result || []) {
        if (!ids.has(existing.id)) photoStore.delete(existing.id);
      }
      for (const [sortOrder, photo] of photos.entries()) {
        photoStore.put({ ...(existingPhotos.get(photo.id) || {}), ...photo, markerId: marker.id, sortOrder });
      }
    };
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  // 更新标记
  async updateMarker(updatedMarker) {
    try {
      const db = await webStorage.init();
      const tx = db.transaction('markers', 'readwrite');
      const store = tx.objectStore('markers');
      const getReq = store.get(updatedMarker.id);
      getReq.onsuccess = () => store.put({ ...(getReq.result || {}), ...updatedMarker });
      return await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch (e) {
      console.error('updateMarker 失败:', e);
      return false;
    }
  }

  // 删除标记
  async deleteMarker(markerId) {
    try {
      const db = await webStorage.init();
      const tx = db.transaction(['markers', 'photos'], 'readwrite');
      tx.objectStore('markers').delete(markerId);
      const photosStore = tx.objectStore('photos');
      const cursorReq = photosStore.index('markerId').openCursor(IDBKeyRange.only(markerId));
      cursorReq.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) { cursor.delete(); cursor.continue(); }
      };
      return await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch (e) {
      console.error('deleteMarker 失败:', e);
      return false;
    }
  }

  // 添加照片到标记
  async addPhotosToMarker({ markerId, photos }) {
    try {
      const markers = await this.loadMarkers();
      const marker = markers.find(m => m.id === markerId);
      if (marker) {
        if (!marker.photos) marker.photos = [];
        marker.photos.push(...photos);
        marker.photoCount = marker.photos.length;
        if (!marker.firstPhoto && photos.length > 0) {
          marker.firstPhoto = photos[0];
        }
        await this.saveMarkers(markers);
        
        // 存储照片数据
        for (const photo of photos) {
          await this.storePhoto({ ...photo, markerId });
        }
      }
      return true;
    } catch (e) {
      console.error('添加照片失败:', e);
      return false;
    }
  }

  // 从标记删除照片
  async deletePhotoFromMarker({ markerId, photoIndex }) {
    try {
      const markers = await this.loadMarkers();
      const marker = markers.find(m => m.id === markerId);
      if (marker && marker.photos) {
        marker.photos.splice(photoIndex, 1);
        marker.photoCount = marker.photos.length;
        marker.firstPhoto = marker.photos[0] || null;
        await this.saveMarkers(markers);
      }
      return true;
    } catch (e) {
      console.error('删除照片失败:', e);
      return false;
    }
  }

  // 获取标记的所有照片
  async getMarkerPhotos(markerId) {
    try {
      const markers = await this.loadMarkers();
      const marker = markers.find(m => m.id === markerId);
      return marker?.photos || [];
    } catch {
      return [];
    }
  }

  // 获取照片信息
  async getPhotoInfo(photoId) {
    const photo = await this.getStoredPhoto(photoId);
    return photo || null;
  }

  // 照片编辑 - 使用 Canvas API
  async rotatePhoto({ photoId, degrees }) {
    const photo = await this.getStoredPhoto(photoId);
    if (!photo?.data) return false;
    
    const rotatedData = await this.rotateImageData(photo.data, degrees);
    photo.data = rotatedData;
    
    await this.storePhoto(photo);
    return true;
  }

  async cropPhoto({ photoId, crop }) {
    const photo = await this.getStoredPhoto(photoId);
    if (!photo?.data) return false;
    
    const croppedData = await this.cropImageData(photo.data, crop);
    photo.data = croppedData;
    
    await this.storePhoto(photo);
    return true;
  }

  // 旋转图片数据
  async rotateImageData(imageData, degrees) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 根据旋转角度调整画布尺寸
        if (degrees === 90 || degrees === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        
        // 旋转画布
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.src = imageData;
    });
  }

  // 裁剪图片数据
  async cropImageData(imageData, crop) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = crop.width;
        canvas.height = crop.height;
        
        ctx.drawImage(
          img,
          crop.x, crop.y, crop.width, crop.height,
          0, 0, crop.width, crop.height
        );
        
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.src = imageData;
    });
  }

  // 日志功能 - 使用 console
  async log({ level, message }) {
    console[level]('[PhotoMap]', message);
  }

  // 获取缓存统计 - Web 版本返回模拟数据
  async getCacheStats() {
    return { count: 0, size: 0, path: 'IndexedDB' };
  }
}

// 创建全局 API 实例
if (typeof window !== 'undefined') {
  window.electronAPI = new WebElectronAPI();
  // 标记为 Web 环境，让 api/index.js 的 isElectron() 返回 false
  window.electronAPI.__isWebAdapter = true;
}

export default WebElectronAPI;

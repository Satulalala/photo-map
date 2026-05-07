/**
 * Web 版本适配器
 * 提供与 Electron API 兼容的接口，但使用 Web API 实现
 */

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
    return photo?.data || null;
  }

  // 获取缩略图 URL
  async getThumbnailUrl(photoId) {
    // Web 版本可以使用 Canvas 生成缩略图
    const photo = await this.getStoredPhoto(photoId);
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
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PhotoMapDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['photos'], 'readwrite');
        const store = transaction.objectStore('photos');
        
        store.put(photo);
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos', { keyPath: 'id' });
        }
      };
    });
  }

  // 从 IndexedDB 获取照片
  async getStoredPhoto(photoId) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PhotoMapDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['photos'], 'readonly');
        const store = transaction.objectStore('photos');
        const getRequest = store.get(photoId);
        
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }

  // 标记管理 - 使用 IndexedDB（与 api/index.js 的 webStorage 共用同一数据库）
  async loadMarkers() {
    try {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('photo-map-db', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('markers')) {
            db.createObjectStore('markers', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('photos')) {
            const ps = db.createObjectStore('photos', { keyPath: 'id' });
            ps.createIndex('markerId', 'markerId');
          }
        };
      });

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
          photos: photos
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
      return await new Promise((resolve, reject) => {
        const request = indexedDB.open('photo-map-db', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          // 只存轻量数据，不含大 base64
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
          // 用单个事务同时写 markers 和 photos
          const storeNames = hasPhotos ? ['markers', 'photos'] : ['markers'];
          const tx = db.transaction(storeNames, 'readwrite');

          tx.objectStore('markers').put(lightMarker);

          if (hasPhotos) {
            const photosStore = tx.objectStore('photos');
            marker.photos.forEach(photo => {
              photosStore.put({ ...photo, markerId: marker.id });
            });
          }

          tx.oncomplete = () => {
            console.log('📍 WebAdapter.addMarker: 标记已保存', lightMarker.id, '照片数:', marker.photos?.length || 0);
            resolve(lightMarker);
          };
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        };
      });
    } catch (e) {
      console.error('addMarker 失败:', e);
      return null;
    }
  }

  // 更新标记
  async updateMarker(updatedMarker) {
    try {
      return await new Promise((resolve, reject) => {
        const request = indexedDB.open('photo-map-db', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('markers', 'readwrite');
          const store = tx.objectStore('markers');
          // 先读取现有数据再合并
          const getReq = store.get(updatedMarker.id);
          getReq.onsuccess = () => {
            const existing = getReq.result || {};
            store.put({ ...existing, ...updatedMarker });
            tx.oncomplete = () => resolve(true);
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    } catch (e) {
      console.error('updateMarker 失败:', e);
      return false;
    }
  }

  // 删除标记
  async deleteMarker(markerId) {
    try {
      return await new Promise((resolve, reject) => {
        const request = indexedDB.open('photo-map-db', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(['markers', 'photos'], 'readwrite');
          tx.objectStore('markers').delete(markerId);
          // 同时删除该标记的所有照片
          const photosStore = tx.objectStore('photos');
          const idx = photosStore.index('markerId');
          const cursorReq = idx.openCursor(IDBKeyRange.only(markerId));
          cursorReq.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) { cursor.delete(); cursor.continue(); }
          };
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => reject(tx.error);
        };
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
          await this.storePhoto(photo);
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
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

  // 标记管理 - 使用 localStorage 或 IndexedDB
  async loadMarkers() {
    try {
      const stored = localStorage.getItem('photo-map-markers');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async saveMarkers(markers) {
    try {
      localStorage.setItem('photo-map-markers', JSON.stringify(markers));
      return true;
    } catch {
      return false;
    }
  }

  // 添加标记
  async addMarker(marker) {
    try {
      const markers = await this.loadMarkers();
      markers.push(marker);
      await this.saveMarkers(markers);
      return marker;
    } catch (e) {
      console.error('添加标记失败:', e);
      return null;
    }
  }

  // 更新标记
  async updateMarker(updatedMarker) {
    try {
      const markers = await this.loadMarkers();
      const index = markers.findIndex(m => m.id === updatedMarker.id);
      if (index !== -1) {
        markers[index] = { ...markers[index], ...updatedMarker };
        await this.saveMarkers(markers);
      }
      return true;
    } catch (e) {
      console.error('更新标记失败:', e);
      return false;
    }
  }

  // 删除标记
  async deleteMarker(markerId) {
    try {
      const markers = await this.loadMarkers();
      const filtered = markers.filter(m => m.id !== markerId);
      await this.saveMarkers(filtered);
      return true;
    } catch (e) {
      console.error('删除标记失败:', e);
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
}

export default WebElectronAPI;
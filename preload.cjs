const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 照片文件管理
  selectPhotos: () => ipcRenderer.invoke('select-photos'),
  getPhotoUrl: (photoId) => ipcRenderer.invoke('get-photo-url', photoId),
  getThumbnailUrl: (photoId) => ipcRenderer.invoke('get-thumbnail-url', photoId),
  getPlaceholderUrl: (photoId) => ipcRenderer.invoke('get-placeholder-url', photoId),
  getPhotoInfo: (photoId) => ipcRenderer.invoke('get-photo-info', photoId),
  deletePhotoFile: (photoId) => ipcRenderer.invoke('delete-photo-file', photoId),
  savePhotoFromBase64: (base64) => ipcRenderer.invoke('save-photo-from-base64', base64),
  
  // 数据库操作 - 标记
  loadMarkers: () => ipcRenderer.invoke('load-markers'),
  getMarkersInBounds: (bounds) => ipcRenderer.invoke('get-markers-in-bounds', bounds),
  getMarkerDetail: (markerId) => ipcRenderer.invoke('get-marker-detail', markerId),
  addMarker: (marker) => ipcRenderer.invoke('add-marker', marker),
  updateMarker: (marker) => ipcRenderer.invoke('update-marker', marker),
  deleteMarker: (markerId) => ipcRenderer.invoke('delete-marker', markerId),
  
  // 数据库操作 - 照片
  addPhotosToMarker: (markerId, photos) => ipcRenderer.invoke('add-photos-to-marker', { markerId, photos }),
  updatePhotoNote: (markerId, photoIndex, note) => ipcRenderer.invoke('update-photo-note', { markerId, photoIndex, note }),
  batchUpdatePhotoNotes: (markerId, notes) => ipcRenderer.invoke('batch-update-photo-notes', { markerId, notes }),
  deletePhoto: (markerId, photoIndex, fileId) => ipcRenderer.invoke('delete-photo', { markerId, photoIndex, fileId }),
  
  // 搜索和统计
  searchMarkers: (keyword) => ipcRenderer.invoke('search-markers', keyword),
  searchPhotos: (keyword) => ipcRenderer.invoke('search-photos', keyword),
  getStats: () => ipcRenderer.invoke('get-stats'),
  
  // 照片编辑
  rotatePhoto: (photoId, degrees) => ipcRenderer.invoke('rotate-photo', { photoId, degrees }),
  cropPhoto: (photoId, crop) => ipcRenderer.invoke('crop-photo', { photoId, crop }),
  
  // 兼容旧API
  saveMarkers: () => ipcRenderer.invoke('save-markers'),
  
  // 瓦片缓存
  cacheTile: (url, data) => ipcRenderer.invoke('cache-tile', { url, data }),
  getCachedTile: (url) => ipcRenderer.invoke('get-cached-tile', url),
  getCacheStats: () => ipcRenderer.invoke('get-cache-stats'),
  clearTileCache: () => ipcRenderer.invoke('clear-tile-cache'),
  
  // 窗口控制
  setTitleBarOverlay: (options) => ipcRenderer.invoke('set-titlebar-overlay', options),
  
  // 日志系统
  log: (level, message) => ipcRenderer.invoke('log', { level, message }),
  getLogPath: () => ipcRenderer.invoke('get-log-path'),
  openLogFolder: () => ipcRenderer.invoke('open-log-folder'),
  
  // 开发者工具
  openDevTools: () => ipcRenderer.invoke('open-devtools'),
  getRecentLogs: () => ipcRenderer.invoke('get-recent-logs')
});

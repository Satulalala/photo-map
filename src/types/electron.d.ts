import type { Marker, Photo, PhotoInfo, CacheStats, Stats, PhotoSearchResult } from './index';

export interface ElectronAPI {
  // 标记操作
  loadMarkers: () => Promise<Marker[]>;
  getMarkerDetail: (markerId: string) => Promise<Marker | null>;
  addMarker: (marker: Marker) => Promise<boolean>;
  updateMarker: (marker: Marker) => Promise<boolean>;
  deleteMarker: (markerId: string) => Promise<boolean>;
  getMarkersInBounds: (bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }) => Promise<Marker[]>;

  // 照片操作
  selectPhotos: () => Promise<{ id: string }[]>;
  getPhotoUrl: (photoId: string) => Promise<string | null>;
  getThumbnailUrl: (photoId: string) => Promise<string | null>;
  getPlaceholderUrl: (photoId: string) => Promise<string | null>;
  getPhotoInfo: (photoId: string) => Promise<PhotoInfo | null>;
  addPhotosToMarker: (markerId: string, photos: Photo[]) => Promise<boolean>;
  deletePhoto: (params: {
    markerId: string;
    photoIndex: number;
    fileId?: string;
  }) => Promise<boolean>;
  deletePhotoFile: (photoId: string) => Promise<boolean>;
  savePhotoFromBase64: (base64Data: string) => Promise<{ id: string } | null>;
  rotatePhoto: (params: { photoId: string; degrees: number }) => Promise<boolean>;
  cropPhoto: (params: {
    photoId: string;
    crop: { x: number; y: number; width: number; height: number };
  }) => Promise<boolean>;

  // 备注操作
  updatePhotoNote: (params: {
    markerId: string;
    photoIndex: number;
    note: string;
  }) => Promise<boolean>;
  batchUpdatePhotoNotes: (params: {
    markerId: string;
    notes: string[];
  }) => Promise<boolean>;

  // 搜索
  searchMarkers: (keyword: string) => Promise<Marker[]>;
  searchPhotos: (keyword: string) => Promise<PhotoSearchResult[]>;

  // 统计
  getStats: () => Promise<Stats>;

  // 缓存
  getCacheStats: () => Promise<CacheStats>;
  clearTileCache: () => Promise<boolean>;
  cacheTile: (params: { url: string; data: string }) => Promise<boolean>;
  getCachedTile: (url: string) => Promise<string | null>;

  // 窗口
  setTitleBarOverlay: (options: {
    color?: string;
    symbolColor?: string;
  }) => Promise<boolean>;

  // 日志
  log: (params: { level: string; message: string }) => Promise<void>;
  getLogPath: () => Promise<string>;
  openLogFolder: () => Promise<string>;

  // 兼容
  saveMarkers: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    mapboxgl: typeof import('mapbox-gl');
  }
}

export {};

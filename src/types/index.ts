// 照片类型
export interface Photo {
  id: string;
  note?: string;
  data?: string; // 旧格式 base64
}

// 标记点类型
export interface Marker {
  id: string;
  lat: number;
  lng: number;
  name?: string;
  createdAt?: number;
  photoCount?: number;
  photos?: Photo[];
  firstPhoto?: Photo | null;
}

// 照片查看器状态
export interface PhotoViewerState {
  photos: Photo[];
  index: number;
  markerId: string;
  returnToMenu?: MarkerMenuState | null;
}

// 标记菜单状态
export interface MarkerMenuState {
  x: number;
  y: number;
  marker: Marker;
}

// 右键菜单状态
export interface ContextMenuState {
  x: number;
  y: number;
  lat: number;
  lng: number;
}

// 备注面板状态
export interface NotesPanelState {
  markerId: string;
  marker: Marker;
  returnToMenu?: MarkerMenuState | null;
}

// 照片编辑器状态
export interface PhotoEditorState {
  photoId: string;
  photoUrl: string;
  markerId: string;
  photoIndex: number;
}

// 搜索结果类型
export interface SearchResult {
  id: string;
  name: string;
  address?: string;
  location: {
    lat: number;
    lng: number;
  };
  distance?: number;
}

// 照片搜索结果
export interface PhotoSearchResult {
  id: string;
  fileId: string;
  note: string;
  markerId: string;
  markerName?: string;
  lat: number;
  lng: number;
}

// 照片信息（EXIF）
export interface PhotoInfo {
  fileName: string;
  fileSize: number;
  fileDate: Date;
  width: number;
  height: number;
  format: string;
  space?: string;
  hasAlpha?: boolean;
  make?: string;
  model?: string;
  dateTime?: number;
  exposureTime?: number;
  fNumber?: number;
  iso?: number;
  focalLength?: number;
  flash?: number;
  gpsLat?: number;
  gpsLng?: number;
  orientation?: number;
}

// 缓存统计
export interface CacheStats {
  count: number;
  size: number;
  path?: string;
}

// 统计信息
export interface Stats {
  markerCount: number;
  photoCount: number;
}

// Toast 类型
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastState {
  type: ToastType;
  message: string;
}

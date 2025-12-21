/**
 * 地图相册 - TypeScript 类型定义
 * 
 * 本文件包含应用中所有核心类型定义
 */

// ========== 基础类型 ==========

/** 唯一标识符 */
export type ID = string;

/** 时间戳（毫秒） */
export type Timestamp = number;

/** 日期字符串（ISO 8601） */
export type DateString = string;

/** Base64 编码的图片数据 */
export type Base64Image = string;

/** 图片 URL */
export type ImageURL = string;

// ========== 坐标类型 ==========

/** 经纬度坐标 */
export interface Coordinate {
  /** 纬度 (-90 到 90) */
  lat: number;
  /** 经度 (-180 到 180) */
  lng: number;
}

/** 带高度的坐标 */
export interface Coordinate3D extends Coordinate {
  /** 海拔高度（米） */
  altitude?: number;
}

/** 地图边界框 */
export interface Bounds {
  /** 西南角 */
  sw: Coordinate;
  /** 东北角 */
  ne: Coordinate;
}

/** 简化的边界框 */
export interface SimpleBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** 地图视口 */
export interface Viewport {
  center: Coordinate;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

// ========== 照片类型 ==========

/** 照片数据格式 */
export type PhotoDataFormat = 'base64' | 'url' | 'blob';

/** 照片基础信息 */
export interface PhotoBase {
  /** 照片唯一标识 */
  id: ID;
  /** 照片备注 */
  note?: string;
  /** 创建时间 */
  createdAt: Timestamp | DateString;
  /** 更新时间 */
  updatedAt?: Timestamp | DateString;
}

/** 照片数据（旧格式 - Base64） */
export interface PhotoDataLegacy extends PhotoBase {
  /** Base64 编码的照片数据 */
  data: Base64Image;
  /** Base64 编码的缩略图数据 */
  thumbnail?: Base64Image;
}

/** 照片数据（新格式 - 文件引用） */
export interface PhotoDataNew extends PhotoBase {
  /** 原图文件路径或 URL */
  originalPath: string;
  /** 缩略图文件路径或 URL */
  thumbnailPath?: string;
  /** 文件大小（字节） */
  fileSize?: number;
  /** 文件类型 */
  mimeType?: string;
}

/** 照片数据（联合类型） */
export type PhotoData = PhotoDataLegacy | PhotoDataNew;

/** 照片元数据 */
export interface PhotoMetadata {
  /** 图片宽度 */
  width: number;
  /** 图片高度 */
  height: number;
  /** 文件大小（字节） */
  size: number;
  /** 文件类型 */
  type: string;
  /** 拍摄时间 */
  takenAt?: Timestamp | DateString;
  /** 相机型号 */
  camera?: string;
  /** 镜头信息 */
  lens?: string;
  /** 光圈值 */
  aperture?: number;
  /** 快门速度 */
  shutterSpeed?: string;
  /** ISO 感光度 */
  iso?: number;
  /** 焦距 */
  focalLength?: number;
  /** GPS 坐标 */
  gps?: Coordinate;
}

/** 完整照片对象 */
export interface Photo extends PhotoBase {
  /** 照片数据（Base64 或路径） */
  data?: Base64Image | string;
  /** 缩略图数据 */
  thumbnail?: Base64Image | string;
  /** 原图路径 */
  originalPath?: string;
  /** 缩略图路径 */
  thumbnailPath?: string;
  /** 元数据 */
  metadata?: PhotoMetadata;
}

/** 照片查看器状态 */
export interface PhotoViewerState {
  /** 照片列表 */
  photos: Photo[];
  /** 当前索引 */
  index: number;
  /** 所属标记 ID */
  markerId: ID;
}

/** 照片编辑器状态 */
export interface PhotoEditorState {
  /** 照片数据 */
  photo: Photo;
  /** 所属标记 ID */
  markerId: ID;
  /** 照片索引 */
  photoIndex: number;
}

// ========== 标记类型 ==========

/** 标记基础信息 */
export interface MarkerBase {
  /** 标记唯一标识 */
  id: ID;
  /** 纬度 */
  lat: number;
  /** 经度 */
  lng: number;
  /** 地点名称 */
  name?: string;
  /** 创建时间 */
  createdAt: Timestamp | DateString;
  /** 更新时间 */
  updatedAt?: Timestamp | DateString;
}

/** 标记（轻量版，用于列表显示） */
export interface MarkerLight extends MarkerBase {
  /** 照片数量 */
  photoCount: number;
  /** 第一张照片（用于预览） */
  firstPhoto?: Photo;
}

/** 标记（完整版，包含所有照片） */
export interface MarkerFull extends MarkerBase {
  /** 照片列表 */
  photos: Photo[];
}

/** 标记（联合类型） */
export type Marker = MarkerLight | MarkerFull;

/** 标记菜单状态 */
export interface MarkerMenuState {
  /** 标记数据 */
  marker: Marker;
  /** 屏幕位置 X */
  x: number;
  /** 屏幕位置 Y */
  y: number;
}

/** 标记排序方式 */
export type MarkerSortType = 'time' | 'name' | 'photoCount';

/** 标记筛选条件 */
export interface MarkerFilter {
  /** 搜索关键词 */
  keyword?: string;
  /** 时间范围 */
  dateRange?: {
    start: Timestamp | DateString;
    end: Timestamp | DateString;
  };
  /** 地理范围 */
  bounds?: SimpleBounds;
  /** 是否有照片 */
  hasPhotos?: boolean;
}

// ========== 地图类型 ==========

/** 地图样式 */
export type MapStyle = 'streets' | 'satellite' | 'dark' | 'light' | 'outdoors';

/** 地图样式配置 */
export interface MapStyleConfig {
  id: MapStyle;
  name: string;
  url: string;
}

/** 地图配置 */
export interface MapConfig {
  /** 访问令牌 */
  accessToken: string;
  /** 默认样式 */
  defaultStyle: MapStyle;
  /** 默认中心点 */
  defaultCenter: Coordinate;
  /** 默认缩放级别 */
  defaultZoom: number;
  /** 最小缩放级别 */
  minZoom: number;
  /** 最大缩放级别 */
  maxZoom: number;
}

/** 地图事件 */
export interface MapEvent {
  /** 事件类型 */
  type: string;
  /** 坐标 */
  lngLat: Coordinate;
  /** 屏幕坐标 */
  point: { x: number; y: number };
  /** 原始事件 */
  originalEvent: MouseEvent | TouchEvent;
}

/** 右键菜单状态 */
export interface ContextMenuState {
  /** 坐标 */
  lngLat: Coordinate;
  /** 屏幕位置 X */
  x: number;
  /** 屏幕位置 Y */
  y: number;
}

// ========== 搜索类型 ==========

/** 搜索结果类型 */
export type SearchResultType = 'place' | 'marker' | 'photo';

/** 地点搜索结果 */
export interface PlaceSearchResult {
  type: 'place';
  id: string;
  name: string;
  fullName: string;
  coordinate: Coordinate;
  category?: string;
}

/** 标记搜索结果 */
export interface MarkerSearchResult {
  type: 'marker';
  marker: Marker;
  matchField: 'name' | 'note';
  matchText: string;
}

/** 照片搜索结果 */
export interface PhotoSearchResult {
  type: 'photo';
  photo: Photo;
  marker: Marker;
  matchText: string;
}

/** 搜索结果（联合类型） */
export type SearchResult = PlaceSearchResult | MarkerSearchResult | PhotoSearchResult;

/** 搜索状态 */
export interface SearchState {
  /** 搜索关键词 */
  query: string;
  /** 搜索结果 */
  results: SearchResult[];
  /** 是否正在搜索 */
  isSearching: boolean;
  /** 搜索历史 */
  history: string[];
}

// ========== 设置类型 ==========

/** 地图设置 */
export interface MapSettings {
  /** 地图样式 */
  style: MapStyle;
  /** 是否显示热力图 */
  showHeatmap: boolean;
  /** 是否显示标记聚合 */
  showClusters: boolean;
  /** 标记大小 */
  markerSize: 'small' | 'medium' | 'large';
}

/** 性能设置 */
export interface PerformanceSettings {
  /** 是否启用硬件加速 */
  hardwareAcceleration: boolean;
  /** 缓存大小限制（MB） */
  cacheLimit: number;
  /** 是否启用懒加载 */
  lazyLoading: boolean;
  /** 缩略图质量 */
  thumbnailQuality: number;
}

/** 存储设置 */
export interface StorageSettings {
  /** 数据存储路径 */
  dataPath: string;
  /** 是否自动备份 */
  autoBackup: boolean;
  /** 备份间隔（天） */
  backupInterval: number;
}

/** 应用设置 */
export interface AppSettings {
  map: MapSettings;
  performance: PerformanceSettings;
  storage: StorageSettings;
  /** 语言 */
  language: 'zh-CN' | 'en-US';
  /** 主题 */
  theme: 'light' | 'dark' | 'system';
}

// ========== 缓存类型 ==========

/** 缓存项 */
export interface CacheItem<T> {
  /** 缓存键 */
  key: string;
  /** 缓存值 */
  value: T;
  /** 创建时间 */
  createdAt: Timestamp;
  /** 过期时间 */
  expiresAt?: Timestamp;
  /** 访问次数 */
  accessCount: number;
  /** 最后访问时间 */
  lastAccessedAt: Timestamp;
}

/** 缓存统计 */
export interface CacheStats {
  /** 缓存项数量 */
  count: number;
  /** 缓存大小（字节） */
  size: number;
  /** 命中次数 */
  hits: number;
  /** 未命中次数 */
  misses: number;
  /** 命中率 */
  hitRate: number;
}

// ========== API 类型 ==========

/** API 响应基础结构 */
export interface ApiResponse<T> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  errorCode?: string;
}

/** 分页参数 */
export interface PaginationParams {
  /** 页码（从 1 开始） */
  page: number;
  /** 每页数量 */
  pageSize: number;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  items: T[];
  /** 总数量 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
}

// ========== 事件类型 ==========

/** 应用事件类型 */
export type AppEventType =
  | 'marker:create'
  | 'marker:update'
  | 'marker:delete'
  | 'photo:add'
  | 'photo:update'
  | 'photo:delete'
  | 'map:move'
  | 'map:zoom'
  | 'search:query'
  | 'settings:change'
  | 'error:occurred';

/** 应用事件 */
export interface AppEvent<T = unknown> {
  type: AppEventType;
  payload: T;
  timestamp: Timestamp;
}

// ========== 错误类型 ==========

/** 应用错误代码 */
export type AppErrorCode =
  | 'NETWORK_ERROR'
  | 'DATABASE_ERROR'
  | 'FILE_ERROR'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_ERROR'
  | 'NOT_FOUND'
  | 'UNKNOWN_ERROR';

/** 应用错误 */
export interface AppError {
  code: AppErrorCode;
  message: string;
  details?: unknown;
  stack?: string;
}

// ========== 组件 Props 类型 ==========

/** 通用组件 Props */
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** 可见性 Props */
export interface VisibilityProps {
  visible?: boolean;
  onShow?: () => void;
  onHide?: () => void;
}

/** 加载状态 Props */
export interface LoadingProps {
  loading?: boolean;
  loadingText?: string;
}

/** 错误状态 Props */
export interface ErrorProps {
  error?: Error | string | null;
  onRetry?: () => void;
}

// ========== 导出 ==========

export default {
  // 这里可以导出类型守卫函数
};

// ========== 类型守卫 ==========

/** 检查是否为旧格式照片数据 */
export function isPhotoDataLegacy(photo: PhotoData): photo is PhotoDataLegacy {
  return 'data' in photo && typeof (photo as PhotoDataLegacy).data === 'string';
}

/** 检查是否为新格式照片数据 */
export function isPhotoDataNew(photo: PhotoData): photo is PhotoDataNew {
  return 'originalPath' in photo;
}

/** 检查是否为完整标记 */
export function isMarkerFull(marker: Marker): marker is MarkerFull {
  return 'photos' in marker && Array.isArray((marker as MarkerFull).photos);
}

/** 检查是否为轻量标记 */
export function isMarkerLight(marker: Marker): marker is MarkerLight {
  return 'photoCount' in marker;
}

/** 检查坐标是否有效 */
export function isValidCoordinate(coord: unknown): coord is Coordinate {
  if (typeof coord !== 'object' || coord === null) return false;
  const { lat, lng } = coord as Coordinate;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
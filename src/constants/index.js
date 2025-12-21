/**
 * 地图相册 - 全局常量定义
 * 
 * 本文件集中管理所有魔法数字和配置常量，
 * 提高代码可读性和可维护性。
 */

// ========== 地图配置 ==========

/** 地图默认中心点（中国中心） */
export const MAP_DEFAULT_CENTER = {
  lng: 104.0,
  lat: 35.0
};

/** 地图默认缩放级别 */
export const MAP_DEFAULT_ZOOM = 4;

/** 地图最小缩放级别 */
export const MAP_MIN_ZOOM = 2;

/** 地图最大缩放级别 */
export const MAP_MAX_ZOOM = 18;

/** 地图飞行动画时长（毫秒） */
export const MAP_FLY_DURATION = 1500;

/** 地图飞行到标记时的缩放级别 */
export const MAP_FLY_TO_MARKER_ZOOM = 15;

/** 地图样式 */
export const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12'
};

// ========== 标记配置 ==========

/** 标记图钉大小（像素） */
export const MARKER_PIN_SIZE = 32;

/** 标记图钉悬停放大比例 */
export const MARKER_HOVER_SCALE = 1.2;

/** 新标记动画时长（毫秒） */
export const MARKER_ANIMATION_DURATION = 500;

/** 标记聚合最小距离（像素） */
export const MARKER_CLUSTER_RADIUS = 50;

/** 标记聚合最大缩放级别 */
export const MARKER_CLUSTER_MAX_ZOOM = 14;

// ========== 照片配置 ==========

/** 缩略图宽度（像素） */
export const THUMBNAIL_WIDTH = 200;

/** 缩略图高度（像素） */
export const THUMBNAIL_HEIGHT = 200;

/** 缩略图质量（0-100） */
export const THUMBNAIL_QUALITY = 80;

/** 照片预览最大宽度（像素） */
export const PHOTO_PREVIEW_MAX_WIDTH = 1920;

/** 照片预览最大高度（像素） */
export const PHOTO_PREVIEW_MAX_HEIGHT = 1080;

/** 照片查看器缩放最小比例 */
export const PHOTO_VIEWER_MIN_SCALE = 0.5;

/** 照片查看器缩放最大比例 */
export const PHOTO_VIEWER_MAX_SCALE = 5;

/** 照片查看器缩放步进 */
export const PHOTO_VIEWER_ZOOM_STEP = 0.2;

/** 照片编辑器旋转步进（度） */
export const PHOTO_EDITOR_ROTATE_STEP = 90;

// ========== 缓存配置 ==========

/** 原图缓存最大数量 */
export const PHOTO_CACHE_MAX_SIZE = 15;

/** 缩略图缓存最大数量 */
export const THUMBNAIL_CACHE_MAX_SIZE = 50;

/** 地图瓦片缓存最大数量 */
export const TILE_CACHE_MAX_SIZE = 500;

/** 缓存清理间隔（毫秒） */
export const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5分钟

/** 缓存过期时间（毫秒） */
export const CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30分钟

// ========== 搜索配置 ==========

/** 搜索防抖延迟（毫秒） */
export const SEARCH_DEBOUNCE_DELAY = 300;

/** 搜索结果最大数量 */
export const SEARCH_MAX_RESULTS = 10;

/** 搜索历史最大数量 */
export const SEARCH_HISTORY_MAX_SIZE = 20;

// ========== 动画配置 ==========

/** 弹窗动画时长（毫秒） */
export const MODAL_ANIMATION_DURATION = 300;

/** 按钮点击动画时长（毫秒） */
export const BUTTON_CLICK_DURATION = 150;

/** 淡入淡出动画时长（毫秒） */
export const FADE_DURATION = 200;

/** 滑动动画时长（毫秒） */
export const SLIDE_DURATION = 250;

/** 弹性动画曲线 */
export const SPRING_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

/** 平滑动画曲线 */
export const SMOOTH_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

// ========== 网络配置 ==========

/** API 请求超时时间（毫秒） */
export const API_TIMEOUT = 10000;

/** 地理编码 API 超时时间（毫秒） */
export const GEOCODING_TIMEOUT = 5000;

/** IP 定位超时时间（毫秒） */
export const IP_LOCATION_TIMEOUT = 3000;

/** 网络重试次数 */
export const NETWORK_RETRY_COUNT = 3;

/** 网络重试延迟（毫秒） */
export const NETWORK_RETRY_DELAY = 1000;

// ========== 文件配置 ==========

/** 支持的图片格式 */
export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

/** 支持的图片扩展名 */
export const SUPPORTED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif'
];

/** 单张照片最大大小（字节） */
export const MAX_PHOTO_SIZE = 50 * 1024 * 1024; // 50MB

/** 批量导入最大数量 */
export const MAX_BATCH_IMPORT_COUNT = 100;

// ========== UI 配置 ==========

/** 虚拟列表项高度（像素） */
export const VIRTUAL_LIST_ITEM_HEIGHT = 80;

/** 虚拟列表可见项数量 */
export const VIRTUAL_LIST_VISIBLE_COUNT = 10;

/** 侧边栏宽度（像素） */
export const SIDEBAR_WIDTH = 320;

/** 工具栏高度（像素） */
export const TOOLBAR_HEIGHT = 48;

/** 搜索栏高度（像素） */
export const SEARCH_BAR_HEIGHT = 40;

/** 菜单最大高度（像素） */
export const MENU_MAX_HEIGHT = 400;

/** 弹窗最大宽度（像素） */
export const MODAL_MAX_WIDTH = 600;

/** 移动端断点（像素） */
export const MOBILE_BREAKPOINT = 768;

/** 平板断点（像素） */
export const TABLET_BREAKPOINT = 1024;

// ========== 热力图配置 ==========

/** 热力图半径（像素） */
export const HEATMAP_RADIUS = 30;

/** 热力图最大强度 */
export const HEATMAP_MAX_INTENSITY = 1;

/** 热力图颜色渐变 */
export const HEATMAP_COLORS = [
  'rgba(0, 0, 255, 0)',      // 透明
  'rgba(0, 0, 255, 0.5)',    // 蓝色
  'rgba(0, 255, 0, 0.5)',    // 绿色
  'rgba(255, 255, 0, 0.5)',  // 黄色
  'rgba(255, 0, 0, 0.5)'     // 红色
];

// ========== 性能配置 ==========

/** 内存警告阈值（MB） */
export const MEMORY_WARNING_THRESHOLD = 300;

/** 内存危险阈值（MB） */
export const MEMORY_DANGER_THRESHOLD = 500;

/** 帧率警告阈值（FPS） */
export const FPS_WARNING_THRESHOLD = 30;

/** 渲染批次大小 */
export const RENDER_BATCH_SIZE = 50;

/** 懒加载阈值（像素） */
export const LAZY_LOAD_THRESHOLD = 200;

// ========== 存储键名 ==========

/** 本地存储键名前缀 */
export const STORAGE_PREFIX = 'photo-map';

/** 设置存储键名 */
export const STORAGE_KEYS = {
  settings: `${STORAGE_PREFIX}-settings`,
  mapStyle: `${STORAGE_PREFIX}-map-style`,
  mapCenter: `${STORAGE_PREFIX}-map-center`,
  mapZoom: `${STORAGE_PREFIX}-map-zoom`,
  searchHistory: `${STORAGE_PREFIX}-search-history`,
  analyticsConsent: `${STORAGE_PREFIX}-analytics-consent`,
  theme: `${STORAGE_PREFIX}-theme`
};

// ========== 错误消息 ==========

/** 错误消息 */
export const ERROR_MESSAGES = {
  networkError: '网络连接失败，请检查网络设置',
  loadPhotoError: '照片加载失败，请重试',
  saveError: '保存失败，请重试',
  deleteError: '删除失败，请重试',
  importError: '导入失败，请检查文件格式',
  exportError: '导出失败，请重试',
  locationError: '定位失败，请检查位置权限',
  geocodingError: '地址解析失败，请重试',
  fileTooLarge: '文件过大，请选择小于50MB的图片',
  unsupportedFormat: '不支持的文件格式',
  maxPhotosReached: '已达到最大照片数量限制'
};

// ========== 成功消息 ==========

/** 成功消息 */
export const SUCCESS_MESSAGES = {
  saved: '保存成功',
  deleted: '删除成功',
  imported: '导入成功',
  exported: '导出成功',
  copied: '已复制到剪贴板',
  updated: '更新成功'
};

// ========== 版本信息 ==========

/** 应用版本 */
export const APP_VERSION = '1.0.0';

/** 数据库版本 */
export const DB_VERSION = 1;

/** API 版本 */
export const API_VERSION = 'v1';

export default {
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_MIN_ZOOM,
  MAP_MAX_ZOOM,
  MAP_FLY_DURATION,
  MAP_FLY_TO_MARKER_ZOOM,
  MAP_STYLES,
  MARKER_PIN_SIZE,
  MARKER_HOVER_SCALE,
  MARKER_ANIMATION_DURATION,
  MARKER_CLUSTER_RADIUS,
  MARKER_CLUSTER_MAX_ZOOM,
  THUMBNAIL_WIDTH,
  THUMBNAIL_HEIGHT,
  THUMBNAIL_QUALITY,
  PHOTO_PREVIEW_MAX_WIDTH,
  PHOTO_PREVIEW_MAX_HEIGHT,
  PHOTO_VIEWER_MIN_SCALE,
  PHOTO_VIEWER_MAX_SCALE,
  PHOTO_VIEWER_ZOOM_STEP,
  PHOTO_EDITOR_ROTATE_STEP,
  PHOTO_CACHE_MAX_SIZE,
  THUMBNAIL_CACHE_MAX_SIZE,
  TILE_CACHE_MAX_SIZE,
  CACHE_CLEANUP_INTERVAL,
  CACHE_EXPIRY_TIME,
  SEARCH_DEBOUNCE_DELAY,
  SEARCH_MAX_RESULTS,
  SEARCH_HISTORY_MAX_SIZE,
  MODAL_ANIMATION_DURATION,
  BUTTON_CLICK_DURATION,
  FADE_DURATION,
  SLIDE_DURATION,
  SPRING_EASING,
  SMOOTH_EASING,
  API_TIMEOUT,
  GEOCODING_TIMEOUT,
  IP_LOCATION_TIMEOUT,
  NETWORK_RETRY_COUNT,
  NETWORK_RETRY_DELAY,
  SUPPORTED_IMAGE_FORMATS,
  SUPPORTED_IMAGE_EXTENSIONS,
  MAX_PHOTO_SIZE,
  MAX_BATCH_IMPORT_COUNT,
  VIRTUAL_LIST_ITEM_HEIGHT,
  VIRTUAL_LIST_VISIBLE_COUNT,
  SIDEBAR_WIDTH,
  TOOLBAR_HEIGHT,
  SEARCH_BAR_HEIGHT,
  MENU_MAX_HEIGHT,
  MODAL_MAX_WIDTH,
  MOBILE_BREAKPOINT,
  TABLET_BREAKPOINT,
  HEATMAP_RADIUS,
  HEATMAP_MAX_INTENSITY,
  HEATMAP_COLORS,
  MEMORY_WARNING_THRESHOLD,
  MEMORY_DANGER_THRESHOLD,
  FPS_WARNING_THRESHOLD,
  RENDER_BATCH_SIZE,
  LAZY_LOAD_THRESHOLD,
  STORAGE_PREFIX,
  STORAGE_KEYS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  APP_VERSION,
  DB_VERSION,
  API_VERSION
};
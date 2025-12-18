/**
 * 内存管理工具
 * 提供缓存清理、内存监控等功能
 */

import { photoUrlCache, thumbnailCache, placeholderCache } from './LRUCache';

// 清理间隔（5分钟）
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// 定时清理器 ID
let cleanupTimerId: ReturnType<typeof setInterval> | null = null;

/**
 * 清理所有图片缓存
 */
export function clearAllImageCaches(): void {
  photoUrlCache.clear();
  thumbnailCache.clear();
  placeholderCache.clear();
  console.log('[内存管理] 已清理所有图片缓存');
}

/**
 * 清理指定照片的缓存
 */
export function clearPhotoCache(photoId: string): void {
  if (!photoId) return;
  photoUrlCache.delete(photoId);
  thumbnailCache.delete(photoId);
  placeholderCache.delete(photoId);
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): {
  photoUrl: number;
  thumbnail: number;
  placeholder: number;
  total: number;
} {
  return {
    photoUrl: photoUrlCache.size,
    thumbnail: thumbnailCache.size,
    placeholder: placeholderCache.size,
    total: photoUrlCache.size + thumbnailCache.size + placeholderCache.size,
  };
}

/**
 * 启动定时清理任务
 * 每 5 分钟检查并清理过期缓存
 */
export function startPeriodicCleanup(): void {
  if (cleanupTimerId) return; // 已经启动

  cleanupTimerId = setInterval(() => {
    const stats = getCacheStats();
    console.log('[内存管理] 定时检查缓存:', stats);

    // 如果缓存总数超过阈值，清理一部分
    if (stats.total > 100) {
      // 清理最旧的 20% 缓存
      const keysToRemove = Math.floor(photoUrlCache.size * 0.2);
      const photoKeys = photoUrlCache.keys();
      for (let i = 0; i < keysToRemove && i < photoKeys.length; i++) {
        photoUrlCache.delete(photoKeys[i]);
      }
      console.log('[内存管理] 已清理', keysToRemove, '个原图缓存');
    }
  }, CLEANUP_INTERVAL);

  console.log('[内存管理] 定时清理任务已启动，间隔:', CLEANUP_INTERVAL / 1000, '秒');
}

/**
 * 停止定时清理任务
 */
export function stopPeriodicCleanup(): void {
  if (cleanupTimerId) {
    clearInterval(cleanupTimerId);
    cleanupTimerId = null;
    console.log('[内存管理] 定时清理任务已停止');
  }
}

/**
 * 获取内存使用信息（仅开发模式可用）
 */
export function getMemoryInfo(): {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
} | null {
  // @ts-ignore - performance.memory 是非标准 API
  if (typeof performance !== 'undefined' && performance.memory) {
    // @ts-ignore
    const memory = performance.memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };
  }
  return null;
}

/**
 * 格式化字节数为可读字符串
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

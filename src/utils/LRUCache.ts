/**
 * LRU (Least Recently Used) 缓存实现
 * 当缓存达到最大容量时，自动淘汰最久未使用的条目
 * 支持自定义清理回调，用于释放 Blob URL 等资源
 */
class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, V>;
  private onEvict?: (key: K, value: V) => void;

  constructor(maxSize: number = 50, onEvict?: (key: K, value: V) => void) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.onEvict = onEvict;
  }

  /**
   * 获取缓存值，同时将其移至最近使用位置
   */
  get(key: K): V | null {
    if (!this.cache.has(key)) return null;

    // 移至末尾（最近使用）
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * 设置缓存值，必要时淘汰最久未使用的条目
   */
  set(key: K, value: V): void {
    // 如果已存在，先删除（后面会重新添加到末尾）
    if (this.cache.has(key)) {
      const oldValue = this.cache.get(key)!;
      this.cache.delete(key);
      // 如果值不同，释放旧值
      if (oldValue !== value && this.onEvict) {
        this.onEvict(key, oldValue);
      }
    } else if (this.cache.size >= this.maxSize) {
      // 缓存已满，删除最久未使用的（第一个）
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        const evictedValue = this.cache.get(firstKey)!;
        this.cache.delete(firstKey);
        // 调用清理回调释放资源
        if (this.onEvict) {
          this.onEvict(firstKey, evictedValue);
        }
      }
    }

    this.cache.set(key, value);
  }

  /**
   * 检查是否存在
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * 删除指定条目
   */
  delete(key: K): boolean {
    if (this.cache.has(key)) {
      const value = this.cache.get(key)!;
      this.cache.delete(key);
      // 调用清理回调释放资源
      if (this.onEvict) {
        this.onEvict(key, value);
      }
      return true;
    }
    return false;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    // 清空前释放所有资源
    if (this.onEvict) {
      this.cache.forEach((value, key) => {
        this.onEvict!(key, value);
      });
    }
    this.cache.clear();
  }

  /**
   * 获取当前缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 获取所有键
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }
}

/**
 * Blob URL 清理回调
 * 释放 Blob URL 占用的内存
 */
const revokeBlobUrl = (_key: string, value: string) => {
  if (value && value.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(value);
    } catch {
      // 忽略释放失败的情况
    }
  }
};

/**
 * 创建照片 URL 缓存实例
 * 减少缓存容量以降低内存占用
 * 原图: 15张 (每张可能几MB)
 * 缩略图: 50张 (每张约5KB)
 * 占位图: 100张 (每张约500字节)
 * 淘汰时自动释放 Blob URL
 */
export const photoUrlCache = new LRUCache<string, string>(15, revokeBlobUrl);
export const thumbnailCache = new LRUCache<string, string>(50, revokeBlobUrl);
export const placeholderCache = new LRUCache<string, string>(100, revokeBlobUrl);

export default LRUCache;

/**
 * API 工具函数和环境检测
 */

/** 动态检测是否为 Electron 环境 */
export function isElectron() {
  return typeof window !== 'undefined' &&
         window.electronAPI &&
         typeof window.electronAPI.loadMarkers === 'function' &&
         !window.electronAPI.__isWebAdapter;
}

/** 是否为 Web 环境 */
export function isWeb() {
  return !isElectron();
}

/** 生成唯一 ID */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/** 获取默认设置 */
export function getDefaultSettings() {
  return {
    map: {
      style: 'streets',
      showHeatmap: false,
      showClusters: true,
      markerSize: 'medium',
    },
    performance: {
      hardwareAcceleration: true,
      cacheLimit: 100,
      lazyLoading: true,
      thumbnailQuality: 80,
    },
    storage: {
      dataPath: '',
      autoBackup: false,
      backupInterval: 7,
    },
    language: 'zh-CN',
    theme: 'system',
  };
}

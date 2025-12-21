/**
 * 组件统一导出
 * 
 * 组件按功能模块分类：
 * - ui/       通用 UI 组件（Toast, ErrorBoundary, Loaders）
 * - photo/    照片相关组件（PhotoViewer, PhotoEditor, LazyPhoto）
 * - map/      地图相关组件（MarkerListItem）
 * - layout/   布局组件（SettingsPanel, LoginPage）
 * - monitor/  监控组件（MemoryMonitor, PerformanceMonitor）
 * 
 * @example
 * // 推荐：从子模块导入
 * import { Toast, ErrorBoundary } from '@components/ui';
 * import { PhotoViewer, LazyPhoto } from '@components/photo';
 * import { MarkerListItem } from '@components/map';
 * import { SettingsPanel, LoginPage } from '@components/layout';
 * import { MemoryMonitor, PerformanceMonitor } from '@components/monitor';
 * 
 * // 兼容：从根目录导入（向后兼容）
 * import { Toast, PhotoViewer, MarkerListItem } from '@components';
 */

// ========== UI 组件 ==========
export { default as Toast } from './Toast.jsx';
export { default as ErrorBoundary, withErrorBoundary, useErrorHandler, AsyncErrorBoundary, NetworkErrorBoundary } from './ErrorBoundary.jsx';

// Loaders
export { default as MinimalLoader } from './MinimalLoader.jsx';
export { default as ParticleMorphLoader } from './ParticleMorphLoader.jsx';
export { default as ArknightsLoader } from './ArknightsLoader.jsx';
export { default as GSAPFilmLoader } from './GSAPFilmLoader.jsx';
export { default as LottieFilmLoader } from './LottieFilmLoader.jsx';
export { default as ThreeFilmLoader } from './ThreeFilmLoader.jsx';

// ========== 照片组件 ==========
export { default as PhotoViewer } from './PhotoViewer.jsx';
export { default as PhotoEditor } from './PhotoEditor.jsx';
export { default as PhotoSearchPanel } from './PhotoSearchPanel.jsx';
export { default as LazyPhoto } from './LazyPhoto.jsx';

// ========== 地图组件 ==========
export { default as MarkerListItem } from './MarkerListItem.jsx';

// ========== 布局组件 ==========
export { default as SettingsPanel } from './SettingsPanel.jsx';
export { default as LoginPage } from './LoginPage.jsx';

// ========== 监控组件 ==========
export { default as MemoryMonitor } from './MemoryMonitor.jsx';
export { default as PerformanceMonitor, useRenderTime, onRenderCallback } from './PerformanceMonitor.jsx';

// ========== 子模块导出 ==========
export * as ui from './ui';
export * as photo from './photo';
export * as map from './map';
export * as layout from './layout';
export * as monitor from './monitor';

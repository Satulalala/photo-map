# Web 版本优化功能指南

本文档介绍地图相册 Web 版本的优化功能，包括 CDN 加速、PWA 支持、SEO 优化、Web Analytics 和错误处理。

## 功能概览

### 1. CDN 管理器 (CDN Manager)
- **文件**: `src/utils/cdnManager.js`
- **功能**: 静态资源 CDN 加速，支持多 CDN 备用
- **特性**:
  - 支持 jsDelivr、unpkg 等公共 CDN
  - 自动故障转移和健康检查
  - 资源预加载和缓存管理
  - 超时控制和错误处理

### 2. PWA 管理器 (PWA Manager)
- **文件**: `src/utils/pwaManager.js`
- **Service Worker**: `public/sw.js`
- **功能**: 渐进式 Web 应用支持
- **特性**:
  - 离线缓存和网络优先策略
  - 应用安装提示和更新通知
  - 后台同步和推送通知
  - 网络状态监控

### 3. SEO 管理器 (SEO Manager)
- **文件**: `src/utils/seoManager.js`
- **功能**: 搜索引擎优化
- **特性**:
  - 动态 meta 标签管理
  - Open Graph 和 Twitter Card 支持
  - 结构化数据 (JSON-LD)
  - Sitemap 和 robots.txt 生成

### 4. Web Analytics
- **文件**: `src/utils/webAnalytics.js`
- **功能**: 用户行为分析
- **特性**:
  - 支持 Google Analytics 4 和百度统计
  - 自定义事件跟踪和批量发送
  - 性能指标收集
  - 用户同意管理

### 5. 错误边界 (Error Boundary)
- **文件**: `src/components/ErrorBoundary.jsx`
- **样式**: `src/styles/components/error-boundary.css`
- **功能**: 错误处理和用户体验
- **特性**:
  - React 错误边界和异步错误处理
  - 网络错误检测
  - 错误报告和重试机制
  - 优雅的错误 UI

## 使用方法

### CDN 管理器

```javascript
import cdnManager from './utils/cdnManager.js';

// 加载 CSS 资源
await cdnManager.loadCSS('leaflet@1.9.4/dist/leaflet.css');

// 加载 JavaScript 资源
await cdnManager.loadJS('react@18.2.0/umd/react.production.min.js');

// 预加载资源
cdnManager.preloadResources([
  { resource: 'react', version: '18.2.0', type: 'script' },
  { resource: 'leaflet', version: '1.9.4', type: 'style' }
]);

// 检查 CDN 健康状态
const health = await cdnManager.checkCDNHealth();
console.log('CDN 状态:', health);
```

### PWA 管理器

```javascript
import { usePWA } from './utils/pwaManager.js';

function MyComponent() {
  const { 
    isOnline, 
    isPWA, 
    canInstall, 
    promptInstall, 
    checkForUpdates 
  } = usePWA();

  return (
    <div>
      <p>网络状态: {isOnline ? '在线' : '离线'}</p>
      <p>PWA 模式: {isPWA ? '是' : '否'}</p>
      {canInstall && (
        <button onClick={promptInstall}>安装应用</button>
      )}
      <button onClick={checkForUpdates}>检查更新</button>
    </div>
  );
}
```

### SEO 管理器

```javascript
import { useSEO } from './utils/seoManager.js';

function PhotoPage({ photo }) {
  const { updateSEO, setPhotoSEO } = useSEO();

  useEffect(() => {
    // 为照片页面设置 SEO
    setPhotoSEO(photo);
  }, [photo]);

  // 或者手动更新 SEO
  const handleUpdateSEO = () => {
    updateSEO({
      title: '我的照片',
      description: '查看这张美丽的照片',
      image: photo.url
    });
  };
}
```

### Web Analytics

```javascript
import { useAnalytics } from './utils/webAnalytics.js';

function MapComponent() {
  const { 
    trackEvent, 
    trackPhoto, 
    trackMap, 
    trackSearch 
  } = useAnalytics();

  const handlePhotoUpload = (photo) => {
    trackPhoto('upload', {
      id: photo.id,
      hasGPS: !!(photo.lat && photo.lng),
      fileSize: photo.size
    });
  };

  const handleMapMove = (mapData) => {
    trackMap('move', {
      zoom: mapData.zoom,
      center: mapData.center
    });
  };

  const handleSearch = (query, results) => {
    trackSearch(query, results.length);
  };
}
```

### 错误边界

```javascript
import ErrorBoundary, { withErrorBoundary, useErrorHandler } from './components/ErrorBoundary.jsx';

// 1. 使用组件包装
function App() {
  return (
    <ErrorBoundary name="App" title="应用错误">
      <MyComponent />
    </ErrorBoundary>
  );
}

// 2. 使用高阶组件
const SafeComponent = withErrorBoundary(MyComponent, {
  name: 'MyComponent',
  title: '组件错误'
});

// 3. 在函数组件中使用 Hook
function MyComponent() {
  const { captureError } = useErrorHandler();

  const handleAsyncError = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      captureError(error, { context: 'async operation' });
    }
  };
}
```

## 配置说明

### 环境变量

在 `.env` 文件中配置以下变量：

```bash
# Google Analytics 4
REACT_APP_GA4_ID=G-XXXXXXXXXX

# 百度统计
REACT_APP_BAIDU_ANALYTICS_ID=xxxxxxxxxxxxxxxx

# 自定义分析端点
REACT_APP_ANALYTICS_ENDPOINT=/api/analytics

# 自定义 CDN
CUSTOM_CDN_URL=https://your-cdn.com
```

### PWA 配置

`public/manifest.json` 已配置完整的 PWA 支持：

- 应用图标和启动画面
- 快捷方式和文件处理
- 分享目标和协议处理
- 离线支持

### Service Worker 缓存策略

- **静态资源**: Cache First (缓存优先)
- **API 请求**: Network First (网络优先)
- **图片资源**: Cache First (缓存优先)
- **其他资源**: Stale While Revalidate (过期重新验证)

## 性能优化

### 1. 资源加载优化
- CDN 加速静态资源
- 预加载关键资源
- 故障转移机制

### 2. 缓存策略
- Service Worker 智能缓存
- 离线资源管理
- 缓存大小控制

### 3. 分析数据优化
- 批量发送减少请求
- 离线队列支持
- 用户同意管理

### 4. 错误处理优化
- 优雅降级
- 错误重试机制
- 用户友好的错误界面

## 监控和调试

### 1. 开发工具
- Chrome DevTools Application 面板
- Lighthouse PWA 审计
- Network 面板监控缓存

### 2. 控制台日志
```javascript
// 查看 PWA 状态
console.log(pwaManager.getStatus());

// 查看分析报告
console.log(webAnalytics.getAnalyticsReport());

// 查看 SEO 报告
console.log(seoManager.getSEOReport());

// 查看 CDN 统计
console.log(cdnManager.getCacheStats());
```

### 3. 性能监控
- 页面加载时间
- 资源加载失败率
- 用户交互响应时间
- 错误发生频率

## 最佳实践

### 1. SEO 优化
- 为每个页面设置独特的 title 和 description
- 使用结构化数据提升搜索结果
- 优化图片 alt 属性和文件名

### 2. PWA 体验
- 提供离线功能
- 快速启动和响应
- 原生应用般的体验

### 3. 分析数据
- 尊重用户隐私
- 收集有意义的数据
- 定期分析和优化

### 4. 错误处理
- 提供清晰的错误信息
- 允许用户重试操作
- 记录错误用于改进

## 故障排除

### 常见问题

1. **Service Worker 不工作**
   - 检查 HTTPS 环境
   - 确认 sw.js 路径正确
   - 查看浏览器控制台错误

2. **CDN 资源加载失败**
   - 检查网络连接
   - 验证 CDN URL 可访问
   - 查看故障转移日志

3. **分析数据不发送**
   - 确认用户已同意
   - 检查网络连接
   - 验证配置参数

4. **SEO 标签不更新**
   - 确认在正确时机调用
   - 检查 React 渲染时机
   - 验证 DOM 操作权限

### 调试命令

```javascript
// 强制更新 Service Worker
navigator.serviceWorker.getRegistration().then(reg => {
  if (reg) reg.update();
});

// 清除所有缓存
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});

// 重置分析同意
localStorage.removeItem('analytics_consent');

// 查看错误边界状态
document.querySelectorAll('.error-boundary').length;
```

## 更新日志

### v1.0.0 (2024-12-21)
- ✅ 实现 CDN 管理器
- ✅ 实现 PWA 管理器和 Service Worker
- ✅ 实现 SEO 管理器
- ✅ 实现 Web Analytics
- ✅ 实现错误边界组件
- ✅ 更新 manifest.json 完整 PWA 支持
- ✅ 创建离线页面
- ✅ 集成到主应用

---

最后更新: 2024-12-21  
版本: v1.0.0  
作者: Photo Map Team
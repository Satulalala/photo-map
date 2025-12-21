# 监控系统设置指南

## 📊 概述

本项目集成了完整的监控系统，包括：
- **版本管理**: 语义化版本控制和自动发布
- **错误监控**: Sentry 集成的崩溃报告
- **性能监控**: 实时性能指标收集

## 🔧 配置步骤

### 1. Sentry 错误监控设置

#### 1.1 创建 Sentry 项目
1. 访问 [Sentry.io](https://sentry.io) 并创建账户
2. 创建新项目，选择 "Electron" 平台
3. 获取 DSN 和认证令牌

#### 1.2 配置环境变量
```bash
# .env 文件
SENTRY_DSN=https://your-key@sentry.io/project-id
SENTRY_ORG=your-organization
SENTRY_PROJECT=photo-map
SENTRY_AUTH_TOKEN=your-auth-token
```

#### 1.3 安装依赖
```bash
npm install @sentry/electron @sentry/webpack-plugin
```

### 2. 版本管理设置

#### 2.1 安装 semantic-release
```bash
npm install --save-dev semantic-release @semantic-release/changelog @semantic-release/git @semantic-release/github
```

#### 2.2 配置 GitHub Token
在 GitHub 仓库设置中添加 Secret：
- `GITHUB_TOKEN`: 用于自动发布

#### 2.3 使用版本管理
```bash
# 升级补丁版本 (1.0.0 -> 1.0.1)
npm run version:bump

# 升级次版本 (1.0.0 -> 1.1.0)
npm run version:bump:minor

# 升级主版本 (1.0.0 -> 2.0.0)
npm run version:bump:major

# 创建预发布版本
npm run version:prerelease

# 查看版本信息
npm run version:info

# 生成版本文件
npm run version:generate
```

### 3. 性能监控设置

#### 3.1 配置监控端点
```bash
# .env 文件
PERFORMANCE_ENDPOINT=/api/performance
ANALYTICS_ENDPOINT=/api/analytics
```

#### 3.2 在应用中初始化
```javascript
// src/main.jsx
import monitoring from './utils/monitoring.js';

// 初始化监控
monitoring.init({
  sentry: {
    dsn: process.env.SENTRY_DSN,
    enabled: process.env.NODE_ENV === 'production'
  },
  performance: {
    enabled: process.env.NODE_ENV === 'production'
  }
});
```

## 📈 使用指南

### 错误监控

#### 手动报告错误
```javascript
import monitoring from './utils/monitoring.js';

try {
  // 可能出错的代码
} catch (error) {
  monitoring.trackError(error, {
    context: 'photo_upload',
    userId: 'user123'
  });
}
```

#### React 错误边界
```jsx
import { ErrorBoundary } from './utils/errorReporting.js';

function App() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### 性能监控

#### 跟踪用户操作
```javascript
import { useMonitoring } from './utils/monitoring.js';

function PhotoUpload() {
  const { trackUserAction, trackPerformance } = useMonitoring();

  const handleUpload = async () => {
    const startTime = performance.now();
    
    try {
      await uploadPhoto();
      trackUserAction('photo_upload', 'success');
    } catch (error) {
      trackUserAction('photo_upload', 'error');
    } finally {
      const duration = performance.now() - startTime;
      trackPerformance('photo_upload_duration', duration);
    }
  };
}
```

#### 监控组件性能
```javascript
import { usePerformanceMonitor } from './utils/performanceMonitor.js';

function ExpensiveComponent() {
  const { timeFunction, mark } = usePerformanceMonitor('ExpensiveComponent');

  useEffect(() => {
    mark('data_fetch_start');
    
    timeFunction(() => {
      // 耗时操作
      processLargeDataset();
    }, 'data_processing');
    
    mark('data_fetch_end');
  }, []);
}
```

### 事件跟踪

#### 页面访问
```javascript
import { useMonitoring } from './utils/monitoring.js';

function PhotoGallery() {
  const { trackPageView } = useMonitoring();

  useEffect(() => {
    trackPageView('photo_gallery', {
      photoCount: photos.length,
      viewMode: 'grid'
    });
  }, []);
}
```

#### 自定义事件
```javascript
monitoring.trackEvent('feature_used', {
  feature: 'photo_editor',
  tool: 'crop',
  duration: 1500
});
```

## 🚀 自动化发布

### GitHub Actions 配置

项目已配置自动化 CI/CD 流程：

1. **测试阶段**: 运行测试、代码检查、构建验证
2. **发布阶段**: 自动版本升级、生成 CHANGELOG、创建 GitHub Release
3. **构建阶段**: 多平台桌面应用构建
4. **部署阶段**: Web 版本自动部署到 Netlify

### 提交信息规范

使用 [Conventional Commits](https://conventionalcommits.org/) 规范：

```bash
# 新功能
git commit -m "feat: add photo batch upload"

# 修复 bug
git commit -m "fix: resolve memory leak in image processing"

# 文档更新
git commit -m "docs: update API documentation"

# 性能优化
git commit -m "perf: improve image loading speed"

# 重构
git commit -m "refactor: reorganize component structure"

# 测试
git commit -m "test: add unit tests for photo editor"

# 构建相关
git commit -m "chore: update dependencies"
```

### 版本发布流程

1. **开发**: 在 `develop` 分支进行开发
2. **测试**: 创建 PR 到 `main` 分支
3. **发布**: 合并到 `main` 分支触发自动发布
4. **预发布**: 推送到 `beta` 或 `alpha` 分支创建预发布版本

## 📊 监控面板

### 实时监控数据

```javascript
// 获取实时性能数据
const metrics = performanceMonitor.getRealTimeMetrics();
console.log('内存使用:', metrics.memory);
console.log('网络状态:', metrics.connection);
console.log('页面性能:', metrics.timing);
```

### 生成监控报告

```bash
# 生成完整监控报告
npm run monitor:report

# 导出监控数据
npm run monitor:export
```

### 核心 Web 指标

监控系统自动收集以下指标：

- **LCP (Largest Contentful Paint)**: 最大内容绘制时间
- **FID (First Input Delay)**: 首次输入延迟
- **CLS (Cumulative Layout Shift)**: 累积布局偏移
- **内存使用**: JavaScript 堆内存使用情况
- **网络性能**: 连接类型和速度
- **用户交互**: 点击、滚动等操作延迟

## 🔍 故障排查

### 常见问题

#### 1. Sentry 初始化失败
```javascript
// 检查 DSN 配置
console.log('Sentry DSN:', process.env.SENTRY_DSN);

// 检查网络连接
fetch('https://sentry.io/api/0/projects/')
  .then(response => console.log('Sentry 连接正常'))
  .catch(error => console.error('Sentry 连接失败:', error));
```

#### 2. 性能数据不准确
```javascript
// 检查 Performance API 支持
if (!window.performance) {
  console.warn('Performance API 不支持');
}

// 检查 PerformanceObserver 支持
if (!window.PerformanceObserver) {
  console.warn('PerformanceObserver 不支持');
}
```

#### 3. 版本发布失败
```bash
# 检查 Git 状态
git status

# 检查提交信息格式
npm run version:validate "feat: add new feature"

# 手动触发发布
npm run release:dry  # 预览发布
npm run release      # 实际发布
```

### 调试模式

```javascript
// 启用详细日志
localStorage.setItem('monitoring_debug', 'true');

// 禁用生产环境监控（测试用）
monitoring.setEnabled(false);

// 手动发送测试数据
monitoring.trackEvent('test_event', { debug: true });
```

## 📋 最佳实践

### 1. 错误处理
- 在关键操作周围添加 try-catch
- 为异步操作添加错误处理
- 使用 React 错误边界捕获组件错误

### 2. 性能监控
- 监控关键用户路径的性能
- 设置性能预算和告警
- 定期审查性能报告

### 3. 数据隐私
- 不收集敏感用户信息
- 使用匿名用户 ID
- 遵守数据保护法规

### 4. 监控成本控制
- 设置合理的采样率
- 过滤无用的错误信息
- 定期清理历史数据

## 🔗 相关资源

- [Sentry 文档](https://docs.sentry.io/)
- [Semantic Release 文档](https://semantic-release.gitbook.io/)
- [Web Vitals 指南](https://web.dev/vitals/)
- [Performance API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [Conventional Commits 规范](https://conventionalcommits.org/)

---

**配置完成后，项目将具备完整的监控能力，帮助您及时发现和解决问题，持续改进应用质量。**
import errorReporting from './errorReporting.js';
import performanceMonitor from './performanceMonitor.js';

class MonitoringService {
  constructor() {
    this.isInitialized = false;
    this.config = {
      sentry: {
        dsn: import.meta.env?.VITE_SENTRY_DSN || '',
        environment: import.meta.env?.MODE || 'production',
        enabled: import.meta.env?.PROD ?? false
      },
      performance: {
        enabled: import.meta.env?.PROD ?? false,
        endpoint: import.meta.env?.VITE_PERFORMANCE_ENDPOINT || '/api/performance'
      }
    };
  }

  async init(customConfig = {}) {
    if (this.isInitialized) return;

    // 合并配置
    this.config = { ...this.config, ...customConfig };

    try {
      // 获取版本信息
      const versionInfo = await this.getVersionInfo();
      
      // 初始化错误报告
      if (this.config.sentry.enabled) {
        errorReporting.init({
          dsn: this.config.sentry.dsn,
          version: versionInfo.version,
          environment: this.config.sentry.environment
        });
        
        // 设置用户上下文
        errorReporting.setUser({
          id: this.generateUserId(),
          platform: process.platform,
          version: versionInfo.version
        });
        
        // 设置标签
        errorReporting.setTag('version', versionInfo.version);
        errorReporting.setTag('platform', process.platform);
        errorReporting.setTag('build', versionInfo.gitHash);
      }

      // 初始化性能监控
      if (this.config.performance.enabled) {
        performanceMonitor.setEnabled(true);
      }

      this.isInitialized = true;
      console.log('✅ Monitoring service initialized');
      
      // 记录初始化事件
      this.trackEvent('monitoring_initialized', {
        version: versionInfo.version,
        platform: process.platform
      });

    } catch (error) {
      console.error('❌ Failed to initialize monitoring:', error);
    }
  }

  // 获取版本信息
  async getVersionInfo() {
    try {
      const response = await fetch('/src/version.json');
      return await response.json();
    } catch {
      return {
        version: '1.0.0',
        buildDate: new Date().toISOString(),
        gitHash: 'unknown',
        gitBranch: 'unknown'
      };
    }
  }

  // 生成匿名用户ID
  generateUserId() {
    let userId = localStorage.getItem('monitoring_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('monitoring_user_id', userId);
    }
    return userId;
  }

  // 统一的事件跟踪
  trackEvent(eventName, properties = {}) {
    try {
      // 添加通用属性
      const eventData = {
        ...properties,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        platform: process.platform
      };

      // 发送到错误报告系统
      errorReporting.addBreadcrumb(eventName, 'user', eventData);
      
      // 记录到性能监控
      performanceMonitor.recordMetric('event', {
        name: eventName,
        properties: eventData
      });

      // 发送到自定义分析端点
      this.sendAnalytics('event', {
        name: eventName,
        properties: eventData
      });

    } catch (error) {
      console.warn('Failed to track event:', error);
    }
  }

  // 跟踪页面访问
  trackPageView(pageName, properties = {}) {
    this.trackEvent('page_view', {
      page: pageName,
      ...properties
    });
  }

  // 跟踪用户操作
  trackUserAction(action, target, properties = {}) {
    this.trackEvent('user_action', {
      action,
      target,
      ...properties
    });
  }

  // 跟踪性能指标
  trackPerformance(metricName, value, unit = 'ms') {
    performanceMonitor.recordMetric('custom_metric', {
      name: metricName,
      value,
      unit,
      timestamp: Date.now()
    });
  }

  // 跟踪错误
  trackError(error, context = {}) {
    errorReporting.captureError(error, {
      ...context,
      timestamp: Date.now(),
      url: window.location.href
    });
  }

  // 跟踪警告
  trackWarning(message, context = {}) {
    errorReporting.captureInfo(message, 'warning', context);
  }

  // 发送分析数据
  async sendAnalytics(type, data) {
    if (!import.meta.env?.PROD) return;

    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          data,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.warn('Failed to send analytics:', error);
    }
  }

  // 获取监控状态
  getStatus() {
    return {
      initialized: this.isInitialized,
      errorReporting: errorReporting.isInitialized,
      performanceMonitoring: performanceMonitor.isEnabled,
      config: this.config
    };
  }

  // 生成监控报告
  async generateReport() {
    const report = {
      timestamp: Date.now(),
      status: this.getStatus(),
      performance: performanceMonitor.getPerformanceSummary(),
      coreWebVitals: await performanceMonitor.getCoreWebVitals(),
      realTimeMetrics: performanceMonitor.getRealTimeMetrics(),
      version: await this.getVersionInfo()
    };

    return report;
  }

  // 导出监控数据
  exportData() {
    const data = {
      timestamp: Date.now(),
      performance: performanceMonitor.getPerformanceSummary(),
      config: this.config,
      status: this.getStatus()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// 创建全局实例
const monitoring = new MonitoringService();

// 自动初始化（在生产环境）
if (import.meta.env?.PROD) {
  monitoring.init().catch(console.error);
}

// React Hook for monitoring
export const useMonitoring = () => {
  return {
    trackEvent: monitoring.trackEvent.bind(monitoring),
    trackPageView: monitoring.trackPageView.bind(monitoring),
    trackUserAction: monitoring.trackUserAction.bind(monitoring),
    trackPerformance: monitoring.trackPerformance.bind(monitoring),
    trackError: monitoring.trackError.bind(monitoring),
    trackWarning: monitoring.trackWarning.bind(monitoring)
  };
};

export default monitoring;
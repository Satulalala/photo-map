import { useEffect } from 'react';

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.isEnabled = import.meta.env?.PROD ?? false;
    this.reportingEndpoint = import.meta.env?.VITE_PERFORMANCE_ENDPOINT || '/api/performance';
    
    if (this.isEnabled) {
      this.init();
    }
  }

  init() {
    // 初始化性能观察器
    this.initPerformanceObserver();
    this.initMemoryMonitor();
    this.initNetworkMonitor();
    this.initUserInteractionMonitor();
    
    // 定期报告
    this.startPeriodicReporting();
    
    console.log('✅ Performance monitoring initialized');
  }

  // 初始化性能观察器
  initPerformanceObserver() {
    if (!window.PerformanceObserver) return;

    try {
      // 监控导航性能
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('navigation', {
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            type: entry.entryType
          });
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });

      // 监控资源加载
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('resource', {
            name: entry.name,
            duration: entry.duration,
            size: entry.transferSize,
            type: entry.initiatorType
          });
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });

      // 监控长任务
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('longtask', {
            duration: entry.duration,
            startTime: entry.startTime,
            attribution: entry.attribution
          });
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });

    } catch (error) {
      console.warn('Performance Observer not fully supported:', error);
    }
  }

  // 内存监控
  initMemoryMonitor() {
    if (!performance.memory) return;

    setInterval(() => {
      const memory = performance.memory;
      this.recordMetric('memory', {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        timestamp: Date.now()
      });
    }, 30000); // 每30秒记录一次
  }

  // 网络监控
  initNetworkMonitor() {
    if (!navigator.connection) return;

    const connection = navigator.connection;
    
    const recordConnection = () => {
      this.recordMetric('network', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
        timestamp: Date.now()
      });
    };

    recordConnection();
    connection.addEventListener('change', recordConnection);
  }

  // 用户交互监控
  initUserInteractionMonitor() {
    // 监控首次输入延迟 (FID)
    if (window.PerformanceObserver) {
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('fid', {
              delay: entry.processingStart - entry.startTime,
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('FID monitoring not supported:', error);
      }
    }

    // 监控累积布局偏移 (CLS)
    let clsValue = 0;
    let clsEntries = [];

    if (window.PerformanceObserver) {
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              clsEntries.push(entry);
            }
          }
          
          this.recordMetric('cls', {
            value: clsValue,
            entries: clsEntries.length
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS monitoring not supported:', error);
      }
    }
  }

  // 记录指标
  recordMetric(category, data) {
    if (!this.isEnabled) return;

    const timestamp = Date.now();
    const key = `${category}_${timestamp}`;
    
    this.metrics.set(key, {
      category,
      data,
      timestamp,
      url: window.location.href,
      userAgent: navigator.userAgent
    });

    // 限制内存中的指标数量
    if (this.metrics.size > 1000) {
      const oldestKey = this.metrics.keys().next().value;
      this.metrics.delete(oldestKey);
    }
  }

  // 自定义性能标记
  mark(name) {
    if (!this.isEnabled) return;
    
    try {
      performance.mark(name);
      this.recordMetric('mark', {
        name,
        timestamp: performance.now()
      });
    } catch (error) {
      console.warn('Performance mark failed:', error);
    }
  }

  // 测量性能
  measure(name, startMark, endMark) {
    if (!this.isEnabled) return;

    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name, 'measure')[0];
      
      this.recordMetric('measure', {
        name,
        duration: measure.duration,
        startTime: measure.startTime
      });
      
      return measure.duration;
    } catch (error) {
      console.warn('Performance measure failed:', error);
      return 0;
    }
  }

  // 监控函数执行时间
  timeFunction(fn, name) {
    if (!this.isEnabled) {
      return fn();
    }

    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    
    this.recordMetric('function', {
      name,
      duration: endTime - startTime,
      startTime
    });

    return result;
  }

  // 监控异步函数
  async timeAsyncFunction(fn, name) {
    if (!this.isEnabled) {
      return await fn();
    }

    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    
    this.recordMetric('async_function', {
      name,
      duration: endTime - startTime,
      startTime
    });

    return result;
  }

  // 获取核心 Web 指标
  getCoreWebVitals() {
    return new Promise((resolve) => {
      const vitals = {};

      // LCP (Largest Contentful Paint)
      if (window.PerformanceObserver) {
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            vitals.lcp = lastEntry.startTime;
            
            if (Object.keys(vitals).length === 3) {
              resolve(vitals);
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (error) {
          vitals.lcp = null;
        }
      }

      // FID 已在 initUserInteractionMonitor 中处理
      vitals.fid = this.getLatestMetric('fid')?.delay || null;

      // CLS 已在 initUserInteractionMonitor 中处理
      vitals.cls = this.getLatestMetric('cls')?.value || null;

      // 如果某些指标不可用，仍然返回结果
      setTimeout(() => resolve(vitals), 1000);
    });
  }

  // 获取最新指标
  getLatestMetric(category) {
    const entries = Array.from(this.metrics.entries())
      .filter(([key, value]) => value.category === category)
      .sort(([, a], [, b]) => b.timestamp - a.timestamp);
    
    return entries.length > 0 ? entries[0][1].data : null;
  }

  // 获取性能摘要
  getPerformanceSummary() {
    const summary = {
      timestamp: Date.now(),
      url: window.location.href,
      metrics: {}
    };

    // 按类别汇总指标
    for (const [key, value] of this.metrics) {
      const category = value.category;
      if (!summary.metrics[category]) {
        summary.metrics[category] = [];
      }
      summary.metrics[category].push(value.data);
    }

    // 添加系统信息
    summary.system = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };

    // 添加内存信息
    if (performance.memory) {
      summary.memory = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }

    return summary;
  }

  // 发送性能报告
  async sendReport(data) {
    if (!this.isEnabled) return;

    try {
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.warn('Failed to send performance report:', error);
    }
  }

  // 定期报告
  startPeriodicReporting() {
    // 每5分钟发送一次报告
    setInterval(() => {
      const summary = this.getPerformanceSummary();
      this.sendReport(summary);
      
      // 清理旧数据
      this.cleanupOldMetrics();
    }, 5 * 60 * 1000);

    // 页面卸载时发送最终报告
    window.addEventListener('beforeunload', () => {
      const summary = this.getPerformanceSummary();
      
      // 使用 sendBeacon 确保数据发送
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          this.reportingEndpoint,
          JSON.stringify(summary)
        );
      }
    });
  }

  // 清理旧指标
  cleanupOldMetrics() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10分钟

    for (const [key, value] of this.metrics) {
      if (now - value.timestamp > maxAge) {
        this.metrics.delete(key);
      }
    }
  }

  // 启用/禁用监控
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (enabled && !this.observers.size) {
      this.init();
    }
  }

  // 获取实时性能数据
  getRealTimeMetrics() {
    return {
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      } : null,
      
      timing: performance.timing ? {
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || null,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || null
      } : null,
      
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null
    };
  }
}

// 创建全局实例
const performanceMonitor = new PerformanceMonitor();

// React 性能监控 Hook
export const usePerformanceMonitor = (componentName) => {
  useEffect(() => {
    performanceMonitor.mark(`${componentName}_mount_start`);
    
    return () => {
      performanceMonitor.mark(`${componentName}_unmount`);
      performanceMonitor.measure(
        `${componentName}_lifecycle`,
        `${componentName}_mount_start`,
        `${componentName}_unmount`
      );
    };
  }, [componentName]);

  return {
    timeFunction: (fn, name) => performanceMonitor.timeFunction(fn, `${componentName}_${name}`),
    timeAsyncFunction: (fn, name) => performanceMonitor.timeAsyncFunction(fn, `${componentName}_${name}`),
    mark: (name) => performanceMonitor.mark(`${componentName}_${name}`)
  };
};

export default performanceMonitor;
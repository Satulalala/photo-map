class WebAnalytics {
  constructor() {
    this.config = {
      // Google Analytics 4
      ga4: {
        measurementId: import.meta.env?.VITE_GA4_ID || '',
        enabled: false
      },
      // 百度统计
      baidu: {
        siteId: import.meta.env?.VITE_BAIDU_ANALYTICS_ID || '',
        enabled: false
      },
      // 自定义分析
      custom: {
        endpoint: import.meta.env?.VITE_ANALYTICS_ENDPOINT || '/api/analytics',
        enabled: true
      }
    };

    this.sessionData = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      pageViews: 0,
      events: [],
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`
    };

    this.queue = [];
    this.isOnline = navigator.onLine;
    this.batchSize = 10;
    this.flushInterval = 30000; // 30秒

    this.init();
  }

  // 初始化分析系统
  async init() {
    try {
      // 检查用户同意
      if (!this.hasUserConsent()) {
        console.log('📊 Analytics: Waiting for user consent');
        return;
      }

      // 初始化各个分析服务
      await this.initGA4();
      await this.initBaidu();
      this.initCustomAnalytics();

      // 设置事件监听
      this.setupEventListeners();
      
      // 开始批量发送
      this.startBatchSending();

      // 记录会话开始
      this.trackEvent('session_start', {
        sessionId: this.sessionData.sessionId,
        ...this.getDeviceInfo()
      });

      console.log('✅ Web Analytics initialized');
    } catch (error) {
      console.error('❌ Analytics initialization failed:', error);
    }
  }

  // 生成会话ID
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 检查用户同意
  hasUserConsent() {
    // 检查本地存储的同意状态
    const consent = localStorage.getItem('analytics_consent');
    return consent === 'granted';
  }

  // 请求用户同意
  requestUserConsent() {
    return new Promise((resolve) => {
      // 创建同意弹窗
      const consentModal = document.createElement('div');
      consentModal.innerHTML = `
        <div style="
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          z-index: 10000;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <div style="margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px;">📊 数据分析</h3>
            <p style="margin: 0; font-size: 14px; color: #ccc; line-height: 1.4;">
              我们使用分析工具来改善用户体验。这些数据完全匿名，不会收集个人信息。
            </p>
          </div>
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="analytics-decline" style="
              background: transparent;
              border: 1px solid rgba(255, 255, 255, 0.3);
              color: white;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
            ">拒绝</button>
            <button id="analytics-accept" style="
              background: #4a90e2;
              border: none;
              color: white;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
            ">同意</button>
          </div>
        </div>
      `;

      document.body.appendChild(consentModal);

      // 处理用户选择
      document.getElementById('analytics-accept').onclick = () => {
        localStorage.setItem('analytics_consent', 'granted');
        consentModal.remove();
        this.init(); // 重新初始化
        resolve(true);
      };

      document.getElementById('analytics-decline').onclick = () => {
        localStorage.setItem('analytics_consent', 'denied');
        consentModal.remove();
        resolve(false);
      };
    });
  }

  // 初始化 Google Analytics 4
  async initGA4() {
    if (!this.config.ga4.measurementId || !this.config.ga4.enabled) {
      return;
    }

    try {
      // 加载 GA4 脚本
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.ga4.measurementId}`;
      document.head.appendChild(script);

      // 初始化 gtag
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      window.gtag = gtag;
      
      gtag('js', new Date());
      gtag('config', this.config.ga4.measurementId, {
        page_title: document.title,
        page_location: window.location.href,
        custom_map: {
          custom_parameter_1: 'session_id'
        }
      });

      console.log('✅ Google Analytics 4 initialized');
    } catch (error) {
      console.error('❌ GA4 initialization failed:', error);
    }
  }

  // 初始化百度统计
  async initBaidu() {
    if (!this.config.baidu.siteId || !this.config.baidu.enabled) {
      return;
    }

    try {
      // 加载百度统计脚本
      const script = document.createElement('script');
      script.innerHTML = `
        var _hmt = _hmt || [];
        (function() {
          var hm = document.createElement("script");
          hm.src = "https://hm.baidu.com/hm.js?${this.config.baidu.siteId}";
          var s = document.getElementsByTagName("script")[0]; 
          s.parentNode.insertBefore(hm, s);
        })();
      `;
      document.head.appendChild(script);

      console.log('✅ Baidu Analytics initialized');
    } catch (error) {
      console.error('❌ Baidu Analytics initialization failed:', error);
    }
  }

  // 初始化自定义分析
  initCustomAnalytics() {
    if (!this.config.custom.enabled) {
      return;
    }

    // 设置网络状态监听
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    console.log('✅ Custom Analytics initialized');
  }

  // 设置事件监听器
  setupEventListeners() {
    // 页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('page_hidden', {
          timeOnPage: Date.now() - this.sessionData.startTime
        });
      } else {
        this.trackEvent('page_visible');
      }
    });

    // 页面卸载
    window.addEventListener('beforeunload', () => {
      this.trackEvent('session_end', {
        sessionDuration: Date.now() - this.sessionData.startTime,
        pageViews: this.sessionData.pageViews,
        totalEvents: this.sessionData.events.length
      });
      
      // 立即发送队列中的数据
      this.flushQueue(true);
    });

    // 窗口大小变化
    window.addEventListener('resize', () => {
      this.sessionData.viewportSize = `${window.innerWidth}x${window.innerHeight}`;
    });

    // 错误监听
    window.addEventListener('error', (event) => {
      this.trackEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // 未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent('unhandled_promise_rejection', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack
      });
    });
  }

  // 跟踪页面浏览
  trackPageView(page = window.location.pathname, title = document.title) {
    this.sessionData.pageViews++;
    
    const pageViewData = {
      event: 'page_view',
      page,
      title,
      referrer: document.referrer,
      timestamp: Date.now(),
      sessionId: this.sessionData.sessionId,
      ...this.getDeviceInfo()
    };

    // 发送到各个分析服务
    this.sendToGA4('page_view', pageViewData);
    this.sendToBaidu('_trackPageview', [page]);
    this.sendToCustom(pageViewData);

    console.log('📊 Page view tracked:', page);
  }

  // 跟踪事件
  trackEvent(eventName, properties = {}) {
    const eventData = {
      event: eventName,
      properties: {
        ...properties,
        timestamp: Date.now(),
        sessionId: this.sessionData.sessionId,
        page: window.location.pathname,
        ...this.getDeviceInfo()
      }
    };

    // 添加到会话数据
    this.sessionData.events.push(eventData);

    // 发送到各个分析服务
    this.sendToGA4(eventName, eventData.properties);
    this.sendToBaidu('_trackEvent', [eventName, JSON.stringify(properties)]);
    this.sendToCustom(eventData);

    console.log('📊 Event tracked:', eventName, properties);
  }

  // 跟踪用户行为
  trackUserAction(action, target, properties = {}) {
    this.trackEvent('user_action', {
      action,
      target,
      ...properties
    });
  }

  // 跟踪性能指标
  trackPerformance() {
    if (!window.performance) return;

    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');

    const performanceData = {
      // 导航时间
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
      loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
      
      // 绘制时间
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
      
      // 连接信息
      connectionType: navigator.connection?.effectiveType,
      downlink: navigator.connection?.downlink,
      
      // 内存信息
      usedJSHeapSize: performance.memory?.usedJSHeapSize,
      totalJSHeapSize: performance.memory?.totalJSHeapSize
    };

    this.trackEvent('performance_metrics', performanceData);
  }

  // 发送到 Google Analytics 4
  sendToGA4(eventName, properties) {
    if (!window.gtag || !this.config.ga4.enabled) return;

    try {
      window.gtag('event', eventName, {
        ...properties,
        custom_parameter_1: this.sessionData.sessionId
      });
    } catch (error) {
      console.error('GA4 tracking error:', error);
    }
  }

  // 发送到百度统计
  sendToBaidu(method, args) {
    if (!window._hmt || !this.config.baidu.enabled) return;

    try {
      window._hmt.push([method, ...args]);
    } catch (error) {
      console.error('Baidu Analytics tracking error:', error);
    }
  }

  // 发送到自定义分析
  sendToCustom(data) {
    if (!this.config.custom.enabled) return;

    // 添加到队列
    this.queue.push({
      ...data,
      timestamp: Date.now(),
      url: window.location.href
    });

    // 如果队列满了，立即发送
    if (this.queue.length >= this.batchSize) {
      this.flushQueue();
    }
  }

  // 批量发送队列数据
  async flushQueue(immediate = false) {
    if (this.queue.length === 0 || (!this.isOnline && !immediate)) {
      return;
    }

    const batch = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch(this.config.custom.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          batch,
          sessionId: this.sessionData.sessionId,
          timestamp: Date.now()
        }),
        keepalive: immediate // 页面卸载时保持连接
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      console.log(`📊 Analytics batch sent: ${batch.length} events`);
    } catch (error) {
      console.error('Analytics batch send failed:', error);
      
      // 如果不是立即发送，重新加入队列
      if (!immediate) {
        this.queue.unshift(...batch);
      }
    }
  }

  // 开始批量发送定时器
  startBatchSending() {
    setInterval(() => {
      this.flushQueue();
    }, this.flushInterval);
  }

  // 获取设备信息
  getDeviceInfo() {
    return {
      userAgent: this.sessionData.userAgent,
      language: this.sessionData.language,
      timezone: this.sessionData.timezone,
      screenResolution: this.sessionData.screenResolution,
      viewportSize: this.sessionData.viewportSize,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine
    };
  }

  // 跟踪照片相关事件
  trackPhotoEvent(action, photoData = {}) {
    this.trackEvent('photo_action', {
      action,
      photoId: photoData.id,
      hasGPS: !!(photoData.lat && photoData.lng),
      fileSize: photoData.size,
      fileType: photoData.type
    });
  }

  // 跟踪地图相关事件
  trackMapEvent(action, mapData = {}) {
    this.trackEvent('map_action', {
      action,
      zoom: mapData.zoom,
      center: mapData.center,
      markerCount: mapData.markerCount
    });
  }

  // 跟踪搜索事件
  trackSearchEvent(query, results = 0) {
    this.trackEvent('search', {
      query: query.substring(0, 100), // 限制长度
      resultCount: results,
      queryLength: query.length
    });
  }

  // 跟踪错误事件
  trackError(error, context = {}) {
    this.trackEvent('application_error', {
      message: error.message,
      stack: error.stack,
      context: JSON.stringify(context)
    });
  }

  // 获取分析报告
  getAnalyticsReport() {
    return {
      session: {
        id: this.sessionData.sessionId,
        duration: Date.now() - this.sessionData.startTime,
        pageViews: this.sessionData.pageViews,
        events: this.sessionData.events.length
      },
      queue: {
        pending: this.queue.length,
        isOnline: this.isOnline
      },
      config: {
        ga4Enabled: this.config.ga4.enabled,
        baiduEnabled: this.config.baidu.enabled,
        customEnabled: this.config.custom.enabled
      },
      consent: this.hasUserConsent()
    };
  }

  // 清除所有数据
  clearData() {
    this.queue = [];
    this.sessionData.events = [];
    localStorage.removeItem('analytics_consent');
    console.log('📊 Analytics data cleared');
  }
}

// 创建全局实例
const webAnalytics = new WebAnalytics();

// 如果没有用户同意，请求同意
if (!webAnalytics.hasUserConsent() && localStorage.getItem('analytics_consent') === null) {
  // 延迟显示同意弹窗，避免影响首次加载
  setTimeout(() => {
    webAnalytics.requestUserConsent();
  }, 3000);
}

// React Hook
export const useAnalytics = () => {
  const trackPage = (page, title) => webAnalytics.trackPageView(page, title);
  const trackEvent = (event, properties) => webAnalytics.trackEvent(event, properties);
  const trackAction = (action, target, properties) => webAnalytics.trackUserAction(action, target, properties);
  const trackPhoto = (action, photoData) => webAnalytics.trackPhotoEvent(action, photoData);
  const trackMap = (action, mapData) => webAnalytics.trackMapEvent(action, mapData);
  const trackSearch = (query, results) => webAnalytics.trackSearchEvent(query, results);
  const trackError = (error, context) => webAnalytics.trackError(error, context);
  const getReport = () => webAnalytics.getAnalyticsReport();

  return {
    trackPage,
    trackEvent,
    trackAction,
    trackPhoto,
    trackMap,
    trackSearch,
    trackError,
    getReport
  };
};

export default webAnalytics;
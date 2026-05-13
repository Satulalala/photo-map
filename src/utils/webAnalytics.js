import { initGA4, initBaidu, sendToGA4, sendToBaidu, AnalyticsQueue } from './analyticsProviders.js';

class WebAnalytics {
  constructor() {
    this.config = {
      ga4: {
        measurementId: import.meta.env?.VITE_GA4_ID || '',
        enabled: false
      },
      baidu: {
        siteId: import.meta.env?.VITE_BAIDU_ANALYTICS_ID || '',
        enabled: false
      },
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

    this.queue = new AnalyticsQueue(10, 30000);
    this.queue.setEndpoint(this.config.custom.endpoint);
    this.queue.setSessionId(this.sessionData.sessionId);

    this.init();
  }

  async init() {
    try {
      if (!this.hasUserConsent()) {
        console.log('📊 Analytics: Waiting for user consent');
        return;
      }

      await initGA4(this.config.ga4.enabled ? this.config.ga4.measurementId : '');
      await initBaidu(this.config.baidu.enabled ? this.config.baidu.siteId : '');

      if (this.config.custom.enabled) {
        this.queue.start();
      }

      this.setupEventListeners();

      this.trackEvent('session_start', {
        sessionId: this.sessionData.sessionId,
        ...this.getDeviceInfo()
      });

      console.log('✅ Web Analytics initialized');
    } catch (error) {
      console.error('❌ Analytics initialization failed:', error);
    }
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  hasUserConsent() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return false;
    }
    const consent = localStorage.getItem('analytics_consent');
    return consent === 'granted';
  }

  requestUserConsent() {
    return new Promise(resolve => {
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

      document.getElementById('analytics-accept').onclick = () => {
        localStorage.setItem('analytics_consent', 'granted');
        consentModal.remove();
        this.init();
        resolve(true);
      };

      document.getElementById('analytics-decline').onclick = () => {
        localStorage.setItem('analytics_consent', 'denied');
        consentModal.remove();
        resolve(false);
      };
    });
  }

  setupEventListeners() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('page_hidden', { timeOnPage: Date.now() - this.sessionData.startTime });
      } else {
        this.trackEvent('page_visible');
      }
    });

    window.addEventListener('beforeunload', () => {
      this.trackEvent('session_end', {
        sessionDuration: Date.now() - this.sessionData.startTime,
        pageViews: this.sessionData.pageViews,
        totalEvents: this.sessionData.events.length
      });
      this.queue.flush(true);
    });

    window.addEventListener('resize', () => {
      this.sessionData.viewportSize = `${window.innerWidth}x${window.innerHeight}`;
    });

    window.addEventListener('error', event => {
      this.trackEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', event => {
      this.trackEvent('unhandled_promise_rejection', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack
      });
    });
  }

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

    sendToGA4('page_view', pageViewData, this.sessionData.sessionId);
    sendToBaidu('_trackPageview', [page]);
    this.queue.enqueue(pageViewData);

    console.log('📊 Page view tracked:', page);
  }

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

    this.sessionData.events.push(eventData);

    sendToGA4(eventName, eventData.properties, this.sessionData.sessionId);
    sendToBaidu('_trackEvent', [eventName, JSON.stringify(properties)]);
    this.queue.enqueue(eventData);

    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isDev && eventName !== 'performance_metrics') {
      console.log('📊 Event tracked:', eventName, properties);
    }
  }

  trackUserAction(action, target, properties = {}) {
    this.trackEvent('user_action', { action, target, ...properties });
  }

  trackPerformance() {
    if (!window.performance) return;
    if (this._performanceTracked) return;
    this._performanceTracked = true;

    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');

    const performanceData = {
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
      loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
      connectionType: navigator.connection?.effectiveType,
      downlink: navigator.connection?.downlink,
      usedJSHeapSize: performance.memory?.usedJSHeapSize,
      totalJSHeapSize: performance.memory?.totalJSHeapSize
    };

    this.trackEvent('performance_metrics', performanceData);
  }

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

  trackPhotoEvent(action, photoData = {}) {
    this.trackEvent('photo_action', {
      action,
      photoId: photoData.id,
      hasGPS: !!(photoData.lat && photoData.lng),
      fileSize: photoData.size,
      fileType: photoData.type
    });
  }

  trackMapEvent(action, mapData = {}) {
    this.trackEvent('map_action', {
      action,
      zoom: mapData.zoom,
      center: mapData.center,
      markerCount: mapData.markerCount
    });
  }

  trackSearchEvent(query, results = 0) {
    this.trackEvent('search', {
      query: query.substring(0, 100),
      resultCount: results,
      queryLength: query.length
    });
  }

  trackError(error, context = {}) {
    this.trackEvent('application_error', {
      message: error.message,
      stack: error.stack,
      context: JSON.stringify(context)
    });
  }

  getAnalyticsReport() {
    return {
      session: {
        id: this.sessionData.sessionId,
        duration: Date.now() - this.sessionData.startTime,
        pageViews: this.sessionData.pageViews,
        events: this.sessionData.events.length
      },
      queue: {
        pending: this.queue.queue.length,
        isOnline: this.queue.isOnline
      },
      config: {
        ga4Enabled: this.config.ga4.enabled,
        baiduEnabled: this.config.baidu.enabled,
        customEnabled: this.config.custom.enabled
      },
      consent: this.hasUserConsent()
    };
  }

  clearData() {
    this.queue.clear();
    this.sessionData.events = [];
    localStorage.removeItem('analytics_consent');
    console.log('📊 Analytics data cleared');
  }
}

const webAnalytics = new WebAnalytics();

if (!webAnalytics.hasUserConsent() && localStorage.getItem('analytics_consent') === null) {
  setTimeout(() => {
    webAnalytics.requestUserConsent();
  }, 3000);
}

export const useAnalytics = () => {
  const trackPage = (page, title) => webAnalytics.trackPageView(page, title);
  const trackEvent = (event, properties) => webAnalytics.trackEvent(event, properties);
  const trackAction = (action, target, properties) => webAnalytics.trackUserAction(action, target, properties);
  const trackPhoto = (action, photoData) => webAnalytics.trackPhotoEvent(action, photoData);
  const trackMap = (action, mapData) => webAnalytics.trackMapEvent(action, mapData);
  const trackSearch = (query, results) => webAnalytics.trackSearchEvent(query, results);
  const trackError = (error, context) => webAnalytics.trackError(error, context);
  const trackPerformance = () => webAnalytics.trackPerformance();
  const getReport = () => webAnalytics.getAnalyticsReport();

  return {
    trackPage,
    trackEvent,
    trackAction,
    trackPhoto,
    trackMap,
    trackSearch,
    trackError,
    trackPerformance,
    getReport
  };
};

export default webAnalytics;

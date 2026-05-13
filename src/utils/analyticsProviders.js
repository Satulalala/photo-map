/**
 * 分析服务提供商（GA4、百度统计、自定义分析）
 */

export async function initGA4(measurementId) {
  if (!measurementId) return;

  try {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() {dataLayer.push(arguments);}
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId, {
      page_title: document.title,
      page_location: window.location.href,
      custom_map: { custom_parameter_1: 'session_id' }
    });

    console.log('✅ Google Analytics 4 initialized');
  } catch (error) {
    console.error('❌ GA4 initialization failed:', error);
  }
}

export async function initBaidu(siteId) {
  if (!siteId) return;

  try {
    const script = document.createElement('script');
    script.innerHTML = `
      var _hmt = _hmt || [];
      (function() {
        var hm = document.createElement("script");
        hm.src = "https://hm.baidu.com/hm.js?${siteId}";
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

export function sendToGA4(eventName, properties, sessionId) {
  if (!window.gtag) return;

  try {
    window.gtag('event', eventName, {
      ...properties,
      custom_parameter_1: sessionId
    });
  } catch (error) {
    console.error('GA4 tracking error:', error);
  }
}

export function sendToBaidu(method, args) {
  if (!window._hmt) return;

  try {
    window._hmt.push([method, ...args]);
  } catch (error) {
    console.error('Baidu Analytics tracking error:', error);
  }
}

export class AnalyticsQueue {
  constructor(batchSize = 10, flushInterval = 30000) {
    this.queue = [];
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
    this.endpoint = '';
    this.isOnline = navigator.onLine;
    this.sessionId = '';
    this.flushTimer = null;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flush();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  setEndpoint(endpoint) {
    this.endpoint = endpoint;
  }

  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  start() {
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }

  stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  enqueue(data) {
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isDev) {
      const importantEvents = ['session_start', 'session_end', 'application_error'];
      if (importantEvents.includes(data.event)) {
        console.log('📊 [Dev] Analytics event:', data.event, data.properties);
      }
      return;
    }

    this.queue.push({
      ...data,
      timestamp: Date.now(),
      url: window.location.href
    });

    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush(immediate = false) {
    if (this.queue.length === 0 || (!this.isOnline && !immediate)) return;

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      this.queue = [];
      return;
    }

    const batch = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch,
          sessionId: this.sessionId,
          timestamp: Date.now()
        }),
        keepalive: immediate
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      console.log(`📊 Analytics batch sent: ${batch.length} events`);
    } catch (error) {
      console.error('Analytics batch send failed:', error);
      if (!immediate) {
        this.queue.unshift(...batch);
      }
    }
  }

  clear() {
    this.queue = [];
  }
}

class CDNManager {
  constructor() {
    this.cdnConfig = {
      // 主要 CDN 提供商
      primary: {
        name: 'jsDelivr',
        baseUrl: 'https://cdn.jsdelivr.net/npm',
        fallback: true
      },
      secondary: {
        name: 'unpkg',
        baseUrl: 'https://unpkg.com',
        fallback: true
      },
      // 自定义 CDN (如果有)
      custom: {
        name: 'custom',
        baseUrl: import.meta.env?.VITE_CUSTOM_CDN_URL || '',
        fallback: false
      }
    };

    this.resourceCache = new Map();
    this.failedUrls = new Set();
    this.loadTimeout = 10000; // 10秒超时
  }

  // 获取资源的 CDN URL
  getCDNUrl(resource, version = 'latest') {
    const { primary, custom } = this.cdnConfig;
    
    // 优先使用自定义 CDN
    if (custom.baseUrl) {
      return `${custom.baseUrl}/${resource}@${version}`;
    }
    
    // 使用主要 CDN
    return `${primary.baseUrl}/${resource}@${version}`;
  }

  // 获取备用 CDN URL
  getFallbackUrl(resource, version = 'latest') {
    const { secondary } = this.cdnConfig;
    return `${secondary.baseUrl}/${resource}@${version}`;
  }

  // 加载 CSS 资源
  async loadCSS(resource, version = 'latest') {
    const cacheKey = `css_${resource}_${version}`;
    
    if (this.resourceCache.has(cacheKey)) {
      return this.resourceCache.get(cacheKey);
    }

    const primaryUrl = this.getCDNUrl(resource, version);
    const fallbackUrl = this.getFallbackUrl(resource, version);

    try {
      const link = await this.createCSSLink(primaryUrl);
      this.resourceCache.set(cacheKey, link);
      return link;
    } catch (error) {
      console.warn(`Primary CDN failed for ${resource}, trying fallback...`);
      
      try {
        const link = await this.createCSSLink(fallbackUrl);
        this.resourceCache.set(cacheKey, link);
        return link;
      } catch (fallbackError) {
        console.error(`All CDN sources failed for ${resource}:`, fallbackError);
        throw new Error(`Failed to load CSS resource: ${resource}`);
      }
    }
  }

  // 创建 CSS link 元素
  createCSSLink(url) {
    return new Promise((resolve, reject) => {
      if (this.failedUrls.has(url)) {
        reject(new Error(`URL previously failed: ${url}`));
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      
      const timeout = setTimeout(() => {
        this.failedUrls.add(url);
        reject(new Error(`Timeout loading CSS: ${url}`));
      }, this.loadTimeout);

      link.onload = () => {
        clearTimeout(timeout);
        resolve(link);
      };

      link.onerror = () => {
        clearTimeout(timeout);
        this.failedUrls.add(url);
        reject(new Error(`Failed to load CSS: ${url}`));
      };

      document.head.appendChild(link);
    });
  }

  // 加载 JavaScript 资源
  async loadJS(resource, version = 'latest') {
    const cacheKey = `js_${resource}_${version}`;
    
    if (this.resourceCache.has(cacheKey)) {
      return this.resourceCache.get(cacheKey);
    }

    const primaryUrl = this.getCDNUrl(resource, version);
    const fallbackUrl = this.getFallbackUrl(resource, version);

    try {
      const script = await this.createScriptTag(primaryUrl);
      this.resourceCache.set(cacheKey, script);
      return script;
    } catch (error) {
      console.warn(`Primary CDN failed for ${resource}, trying fallback...`);
      
      try {
        const script = await this.createScriptTag(fallbackUrl);
        this.resourceCache.set(cacheKey, script);
        return script;
      } catch (fallbackError) {
        console.error(`All CDN sources failed for ${resource}:`, fallbackError);
        throw new Error(`Failed to load JS resource: ${resource}`);
      }
    }
  }

  // 创建 script 标签
  createScriptTag(url) {
    return new Promise((resolve, reject) => {
      if (this.failedUrls.has(url)) {
        reject(new Error(`URL previously failed: ${url}`));
        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      
      const timeout = setTimeout(() => {
        this.failedUrls.add(url);
        reject(new Error(`Timeout loading script: ${url}`));
      }, this.loadTimeout);

      script.onload = () => {
        clearTimeout(timeout);
        resolve(script);
      };

      script.onerror = () => {
        clearTimeout(timeout);
        this.failedUrls.add(url);
        reject(new Error(`Failed to load script: ${url}`));
      };

      document.head.appendChild(script);
    });
  }

  // 预加载资源
  preloadResource(url, type = 'script') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = type;
    
    if (type === 'script') {
      link.crossOrigin = 'anonymous';
    }
    
    document.head.appendChild(link);
  }

  // 批量预加载资源
  preloadResources(resources) {
    resources.forEach(({ resource, version, type }) => {
      const url = this.getCDNUrl(resource, version);
      this.preloadResource(url, type);
    });
  }

  // 检查 CDN 可用性
  async checkCDNHealth() {
    const healthCheck = async (baseUrl) => {
      try {
        const response = await fetch(`${baseUrl}/react@18.0.0/package.json`, {
          method: 'HEAD',
          timeout: 5000
        });
        return response.ok;
      } catch {
        return false;
      }
    };

    const results = {};
    
    for (const [name, config] of Object.entries(this.cdnConfig)) {
      if (config.baseUrl) {
        results[name] = await healthCheck(config.baseUrl);
      }
    }

    return results;
  }

  // 获取最佳 CDN
  async getBestCDN() {
    const healthResults = await this.checkCDNHealth();
    
    // 优先选择自定义 CDN
    if (healthResults.custom) {
      return this.cdnConfig.custom;
    }
    
    // 选择可用的主要 CDN
    if (healthResults.primary) {
      return this.cdnConfig.primary;
    }
    
    // 使用备用 CDN
    if (healthResults.secondary) {
      return this.cdnConfig.secondary;
    }
    
    // 都不可用时返回主要 CDN（可能是网络问题）
    return this.cdnConfig.primary;
  }

  // 清理缓存
  clearCache() {
    this.resourceCache.clear();
    this.failedUrls.clear();
  }

  // 获取缓存统计
  getCacheStats() {
    return {
      cached: this.resourceCache.size,
      failed: this.failedUrls.size,
      resources: Array.from(this.resourceCache.keys())
    };
  }
}

// 创建全局实例
const cdnManager = new CDNManager();

// 预加载常用资源
const commonResources = [
  { resource: 'react', version: '18.2.0', type: 'script' },
  { resource: 'react-dom', version: '18.2.0', type: 'script' },
  { resource: 'leaflet', version: '1.9.4', type: 'style' }
];

// 在页面加载时预加载
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    cdnManager.preloadResources(commonResources);
  });
}

export default cdnManager;
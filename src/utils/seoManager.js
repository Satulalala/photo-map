import { generateSitemap, generateRobotsTxt, getSEOReport, setBreadcrumbData, setImageData } from './seoReport.js';

class SEOManager {
  constructor() {
    this.defaultMeta = {
      title: '地图相册 - 记录每一个值得纪念的地点',
      description: '一个优雅的照片地图应用，帮助您在地图上标记和管理照片，记录旅行足迹，分享美好回忆。支持GPS定位、照片编辑、热力图展示等功能。',
      keywords: '地图相册,照片地图,GPS照片,旅行记录,位置标记,照片管理,地理标记,足迹地图',
      author: 'Photo Map Team',
      viewport: 'width=device-width, initial-scale=1.0',
      robots: 'index, follow',
      language: 'zh-CN',
      charset: 'UTF-8'
    };

    this.socialMeta = {
      ogType: 'website',
      ogSiteName: '地图相册',
      ogLocale: 'zh_CN',
      twitterCard: 'summary_large_image',
      twitterSite: '@photomap'
    };

    this.structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: '地图相册',
      description: '一个优雅的照片地图应用，帮助您在地图上标记和管理照片',
      url: window.location.origin,
      applicationCategory: 'PhotographyApplication',
      operatingSystem: 'Web Browser',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'CNY'
      },
      author: {
        '@type': 'Organization',
        name: 'Photo Map Team'
      }
    };

    this.init();
  }

  init() {
    this.setBasicMeta();
    this.setSocialMeta();
    this.setStructuredData();
    this.setupDynamicUpdates();
    console.log('✅ SEO Manager initialized');
  }

  setBasicMeta() {
    document.title = this.defaultMeta.title;

    this.setMetaTag('description', this.defaultMeta.description);
    this.setMetaTag('keywords', this.defaultMeta.keywords);
    this.setMetaTag('author', this.defaultMeta.author);
    this.setMetaTag('viewport', this.defaultMeta.viewport);
    this.setMetaTag('robots', this.defaultMeta.robots);
    this.setMetaTag('language', this.defaultMeta.language);

    let charsetMeta = document.querySelector('meta[charset]');
    if (!charsetMeta) {
      charsetMeta = document.createElement('meta');
      charsetMeta.setAttribute('charset', this.defaultMeta.charset);
      document.head.insertBefore(charsetMeta, document.head.firstChild);
    }

    this.setCanonicalUrl(window.location.href);
    document.documentElement.lang = 'zh-CN';
  }

  setSocialMeta() {
    this.setMetaProperty('og:title', this.defaultMeta.title);
    this.setMetaProperty('og:description', this.defaultMeta.description);
    this.setMetaProperty('og:type', this.socialMeta.ogType);
    this.setMetaProperty('og:site_name', this.socialMeta.ogSiteName);
    this.setMetaProperty('og:locale', this.socialMeta.ogLocale);
    this.setMetaProperty('og:url', window.location.href);

    const defaultImage = `${window.location.origin}/images/og-image.jpg`;
    this.setMetaProperty('og:image', defaultImage);
    this.setMetaProperty('og:image:width', '1200');
    this.setMetaProperty('og:image:height', '630');
    this.setMetaProperty('og:image:alt', '地图相册应用截图');

    this.setMetaName('twitter:card', this.socialMeta.twitterCard);
    this.setMetaName('twitter:site', this.socialMeta.twitterSite);
    this.setMetaName('twitter:title', this.defaultMeta.title);
    this.setMetaName('twitter:description', this.defaultMeta.description);
    this.setMetaName('twitter:image', defaultImage);
  }

  setStructuredData() {
    let structuredDataScript = document.querySelector('#structured-data');

    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.id = 'structured-data';
      structuredDataScript.type = 'application/ld+json';
      document.head.appendChild(structuredDataScript);
    }

    structuredDataScript.textContent = JSON.stringify(this.structuredData, null, 2);
  }

  setMetaTag(name, content) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', name);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  }

  setMetaProperty(property, content) {
    let meta = document.querySelector(`meta[property="${property}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('property', property);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  }

  setMetaName(name, content) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', name);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  }

  setCanonicalUrl(url) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);
  }

  updatePageSEO(options = {}) {
    const { title, description, keywords, image, url = window.location.href, type = 'website' } = options;

    if (title) {
      const fullTitle = `${title} - 地图相册`;
      document.title = fullTitle;
      this.setMetaProperty('og:title', fullTitle);
      this.setMetaName('twitter:title', fullTitle);
    }

    if (description) {
      this.setMetaTag('description', description);
      this.setMetaProperty('og:description', description);
      this.setMetaName('twitter:description', description);
    }

    if (keywords) this.setMetaTag('keywords', keywords);
    if (image) {
      this.setMetaProperty('og:image', image);
      this.setMetaName('twitter:image', image);
    }

    this.setMetaProperty('og:url', url);
    this.setCanonicalUrl(url);
    this.setMetaProperty('og:type', type);
  }

  setPhotoPageSEO(photo) {
    const title = photo.note || `照片 - ${photo.location || '未知位置'}`;
    const description = `在${photo.location || '某个地点'}拍摄的照片${photo.note ? `：${photo.note}` : ''}。使用地图相册记录您的美好回忆。`;
    const keywords = `${this.defaultMeta.keywords},${photo.location || ''},${photo.note || ''}`;

    this.updatePageSEO({ title, description, keywords, image: photo.thumbnailUrl || photo.url, type: 'article' });
  }

  setMapPageSEO(location, photoCount) {
    const title = `${location} - 地图视图`;
    const description = `查看${location}的${photoCount}张照片，探索这个地区的美丽风景和难忘时刻。`;
    const keywords = `${this.defaultMeta.keywords},${location},地图视图`;

    this.updatePageSEO({ title, description, keywords, type: 'website' });
  }

  setupDynamicUpdates() {
    let currentUrl = window.location.href;

    const checkUrlChange = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        this.setCanonicalUrl(currentUrl);
        this.setMetaProperty('og:url', currentUrl);
      }
    };

    const observer = new MutationObserver(checkUrlChange);
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('popstate', checkUrlChange);

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(checkUrlChange, 0);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(checkUrlChange, 0);
    };
  }

  trackSEOEvent(eventName, properties = {}) {
    if (window.analytics) {
      window.analytics.trackEvent(eventName, {
        ...properties,
        seo: true,
        url: window.location.href,
        title: document.title
      });
    }
  }
}

const seoManager = new SEOManager();

export const useSEO = () => {
  const updateSEO = (options) => seoManager.updatePageSEO(options);
  const setPhotoSEO = (photo) => seoManager.setPhotoPageSEO(photo);
  const setMapSEO = (location, photoCount) => seoManager.setMapPageSEO(location, photoCount);
  const setBreadcrumbs = (breadcrumbs) => setBreadcrumbData(breadcrumbs);
  const setImages = (images) => setImageData(images);
  const getReport = () => getSEOReport();

  return { updateSEO, setPhotoSEO, setMapSEO, setBreadcrumbs, setImages, getReport };
};

export default seoManager;

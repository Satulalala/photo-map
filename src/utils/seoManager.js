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

  // 初始化SEO设置
  init() {
    this.setBasicMeta();
    this.setSocialMeta();
    this.setStructuredData();
    this.setupDynamicUpdates();
    console.log('✅ SEO Manager initialized');
  }

  // 设置基础meta标签
  setBasicMeta() {
    // 设置页面标题
    document.title = this.defaultMeta.title;

    // 设置或更新meta标签
    this.setMetaTag('description', this.defaultMeta.description);
    this.setMetaTag('keywords', this.defaultMeta.keywords);
    this.setMetaTag('author', this.defaultMeta.author);
    this.setMetaTag('viewport', this.defaultMeta.viewport);
    this.setMetaTag('robots', this.defaultMeta.robots);
    this.setMetaTag('language', this.defaultMeta.language);

    // 设置charset
    let charsetMeta = document.querySelector('meta[charset]');
    if (!charsetMeta) {
      charsetMeta = document.createElement('meta');
      charsetMeta.setAttribute('charset', this.defaultMeta.charset);
      document.head.insertBefore(charsetMeta, document.head.firstChild);
    }

    // 设置canonical链接
    this.setCanonicalUrl(window.location.href);

    // 设置语言标签
    document.documentElement.lang = 'zh-CN';
  }

  // 设置社交媒体meta标签
  setSocialMeta() {
    // Open Graph标签
    this.setMetaProperty('og:title', this.defaultMeta.title);
    this.setMetaProperty('og:description', this.defaultMeta.description);
    this.setMetaProperty('og:type', this.socialMeta.ogType);
    this.setMetaProperty('og:site_name', this.socialMeta.ogSiteName);
    this.setMetaProperty('og:locale', this.socialMeta.ogLocale);
    this.setMetaProperty('og:url', window.location.href);
    
    // 设置默认图片
    const defaultImage = `${window.location.origin}/images/og-image.jpg`;
    this.setMetaProperty('og:image', defaultImage);
    this.setMetaProperty('og:image:width', '1200');
    this.setMetaProperty('og:image:height', '630');
    this.setMetaProperty('og:image:alt', '地图相册应用截图');

    // Twitter Card标签
    this.setMetaName('twitter:card', this.socialMeta.twitterCard);
    this.setMetaName('twitter:site', this.socialMeta.twitterSite);
    this.setMetaName('twitter:title', this.defaultMeta.title);
    this.setMetaName('twitter:description', this.defaultMeta.description);
    this.setMetaName('twitter:image', defaultImage);
  }

  // 设置结构化数据
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

  // 设置meta标签
  setMetaTag(name, content) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', name);
      document.head.appendChild(meta);
    }
    
    meta.setAttribute('content', content);
  }

  // 设置meta property标签
  setMetaProperty(property, content) {
    let meta = document.querySelector(`meta[property="${property}"]`);
    
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('property', property);
      document.head.appendChild(meta);
    }
    
    meta.setAttribute('content', content);
  }

  // 设置meta name标签
  setMetaName(name, content) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', name);
      document.head.appendChild(meta);
    }
    
    meta.setAttribute('content', content);
  }

  // 设置canonical URL
  setCanonicalUrl(url) {
    let canonical = document.querySelector('link[rel="canonical"]');
    
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    
    canonical.setAttribute('href', url);
  }

  // 更新页面SEO信息
  updatePageSEO(options = {}) {
    const {
      title,
      description,
      keywords,
      image,
      url = window.location.href,
      type = 'website'
    } = options;

    // 更新标题
    if (title) {
      const fullTitle = `${title} - 地图相册`;
      document.title = fullTitle;
      this.setMetaProperty('og:title', fullTitle);
      this.setMetaName('twitter:title', fullTitle);
    }

    // 更新描述
    if (description) {
      this.setMetaTag('description', description);
      this.setMetaProperty('og:description', description);
      this.setMetaName('twitter:description', description);
    }

    // 更新关键词
    if (keywords) {
      this.setMetaTag('keywords', keywords);
    }

    // 更新图片
    if (image) {
      this.setMetaProperty('og:image', image);
      this.setMetaName('twitter:image', image);
    }

    // 更新URL
    this.setMetaProperty('og:url', url);
    this.setCanonicalUrl(url);

    // 更新类型
    this.setMetaProperty('og:type', type);
  }

  // 为照片页面设置SEO
  setPhotoPageSEO(photo) {
    const title = photo.note || `照片 - ${photo.location || '未知位置'}`;
    const description = `在${photo.location || '某个地点'}拍摄的照片${photo.note ? `：${photo.note}` : ''}。使用地图相册记录您的美好回忆。`;
    const keywords = `${this.defaultMeta.keywords},${photo.location || ''},${photo.note || ''}`;
    
    this.updatePageSEO({
      title,
      description,
      keywords,
      image: photo.thumbnailUrl || photo.url,
      type: 'article'
    });
  }

  // 为地图页面设置SEO
  setMapPageSEO(location, photoCount) {
    const title = `${location} - 地图视图`;
    const description = `查看${location}的${photoCount}张照片，探索这个地区的美丽风景和难忘时刻。`;
    const keywords = `${this.defaultMeta.keywords},${location},地图视图`;
    
    this.updatePageSEO({
      title,
      description,
      keywords,
      type: 'website'
    });
  }

  // 生成sitemap
  generateSitemap() {
    const urls = [
      {
        loc: window.location.origin,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'daily',
        priority: '1.0'
      },
      {
        loc: `${window.location.origin}/map`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: '0.8'
      },
      {
        loc: `${window.location.origin}/photos`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: '0.8'
      }
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    return sitemap;
  }

  // 生成robots.txt
  generateRobotsTxt() {
    return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /*.json$

Sitemap: ${window.location.origin}/sitemap.xml

# 搜索引擎优化
Crawl-delay: 1`;
  }

  // 设置动态更新
  setupDynamicUpdates() {
    // 监听路由变化
    let currentUrl = window.location.href;
    
    const checkUrlChange = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        this.setCanonicalUrl(currentUrl);
        this.setMetaProperty('og:url', currentUrl);
      }
    };

    // 使用MutationObserver监听DOM变化
    const observer = new MutationObserver(checkUrlChange);
    observer.observe(document.body, { childList: true, subtree: true });

    // 监听popstate事件
    window.addEventListener('popstate', checkUrlChange);

    // 监听pushstate和replacestate
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

  // 添加面包屑导航结构化数据
  setBreadcrumbData(breadcrumbs) {
    const breadcrumbData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url
      }))
    };

    let breadcrumbScript = document.querySelector('#breadcrumb-data');
    
    if (!breadcrumbScript) {
      breadcrumbScript = document.createElement('script');
      breadcrumbScript.id = 'breadcrumb-data';
      breadcrumbScript.type = 'application/ld+json';
      document.head.appendChild(breadcrumbScript);
    }

    breadcrumbScript.textContent = JSON.stringify(breadcrumbData, null, 2);
  }

  // 设置图片结构化数据
  setImageData(images) {
    const imageData = {
      '@context': 'https://schema.org',
      '@type': 'ImageGallery',
      name: '地图相册图片集',
      description: '用户上传的地理位置标记照片集合',
      image: images.map(img => ({
        '@type': 'ImageObject',
        url: img.url,
        name: img.note || '照片',
        description: img.description || '',
        contentLocation: {
          '@type': 'Place',
          name: img.location || '未知位置',
          geo: img.lat && img.lng ? {
            '@type': 'GeoCoordinates',
            latitude: img.lat,
            longitude: img.lng
          } : undefined
        }
      }))
    };

    let imageScript = document.querySelector('#image-data');
    
    if (!imageScript) {
      imageScript = document.createElement('script');
      imageScript.id = 'image-data';
      imageScript.type = 'application/ld+json';
      document.head.appendChild(imageScript);
    }

    imageScript.textContent = JSON.stringify(imageData, null, 2);
  }

  // 获取SEO分析报告
  getSEOReport() {
    const report = {
      title: {
        content: document.title,
        length: document.title.length,
        optimal: document.title.length >= 30 && document.title.length <= 60
      },
      description: {
        content: document.querySelector('meta[name="description"]')?.content || '',
        length: (document.querySelector('meta[name="description"]')?.content || '').length,
        optimal: false
      },
      keywords: {
        content: document.querySelector('meta[name="keywords"]')?.content || '',
        count: (document.querySelector('meta[name="keywords"]')?.content || '').split(',').length
      },
      headings: {
        h1: document.querySelectorAll('h1').length,
        h2: document.querySelectorAll('h2').length,
        h3: document.querySelectorAll('h3').length
      },
      images: {
        total: document.querySelectorAll('img').length,
        withAlt: document.querySelectorAll('img[alt]').length,
        withoutAlt: document.querySelectorAll('img:not([alt])').length
      },
      links: {
        internal: document.querySelectorAll('a[href^="/"], a[href^="./"], a[href^="../"]').length,
        external: document.querySelectorAll('a[href^="http"]:not([href*="' + window.location.hostname + '"])').length
      },
      social: {
        ogTags: document.querySelectorAll('meta[property^="og:"]').length,
        twitterTags: document.querySelectorAll('meta[name^="twitter:"]').length
      },
      structured: {
        jsonLd: document.querySelectorAll('script[type="application/ld+json"]').length
      }
    };

    // 计算描述是否最优
    report.description.optimal = report.description.length >= 120 && report.description.length <= 160;

    return report;
  }

  // 事件跟踪
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

// 创建全局实例
const seoManager = new SEOManager();

// React Hook
export const useSEO = () => {
  const updateSEO = (options) => seoManager.updatePageSEO(options);
  const setPhotoSEO = (photo) => seoManager.setPhotoPageSEO(photo);
  const setMapSEO = (location, photoCount) => seoManager.setMapPageSEO(location, photoCount);
  const setBreadcrumbs = (breadcrumbs) => seoManager.setBreadcrumbData(breadcrumbs);
  const setImages = (images) => seoManager.setImageData(images);
  const getReport = () => seoManager.getSEOReport();

  return {
    updateSEO,
    setPhotoSEO,
    setMapSEO,
    setBreadcrumbs,
    setImages,
    getReport
  };
};

export default seoManager;
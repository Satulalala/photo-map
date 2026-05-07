/**
 * SEO 报告和站点地图生成
 */

export function generateSitemap() {
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

export function generateRobotsTxt() {
  return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /*.json$

Sitemap: ${window.location.origin}/sitemap.xml

# 搜索引擎优化
Crawl-delay: 1`;
}

export function getSEOReport() {
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

  report.description.optimal = report.description.length >= 120 && report.description.length <= 160;

  return report;
}

export function setBreadcrumbData(breadcrumbs) {
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

export function setImageData(images) {
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

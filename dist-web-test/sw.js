// Service Worker for Photo Map PWA
const CACHE_NAME = 'photo-map-v1.0.0';
const STATIC_CACHE = 'photo-map-static-v1.0.0';
const DYNAMIC_CACHE = 'photo-map-dynamic-v1.0.0';
const IMAGE_CACHE = 'photo-map-images-v1.0.0';

// 检测是否为开发环境
const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

// 开发环境下禁用 Service Worker 缓存
if (isDev) {
  console.log('Service Worker: Development mode - caching disabled');
  
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', () => self.clients.claim());
  self.addEventListener('fetch', () => {}); // 不拦截请求
  
} else {
  // 生产环境正常运行

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/js/main.js',
  '/static/css/main.css',
  '/static/media/logo.svg'
];

// 需要缓存的 API 路径
const API_ROUTES = [
  '/api/photos',
  '/api/locations',
  '/api/settings'
];

// 图片文件扩展名
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 只处理同源请求
  if (url.origin !== location.origin) {
    return;
  }

  // 根据请求类型选择缓存策略
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isImageRequest(request)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  } else if (isAPIRequest(request)) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  } else {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  }
});

// 判断是否为静态资源
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/static/') || 
         url.pathname === '/' || 
         url.pathname === '/index.html' ||
         url.pathname === '/manifest.json';
}

// 判断是否为图片请求
function isImageRequest(request) {
  const url = new URL(request.url);
  return IMAGE_EXTENSIONS.some(ext => url.pathname.toLowerCase().includes(ext)) ||
         url.pathname.startsWith('/images/') ||
         url.pathname.startsWith('/photos/') ||
         url.pathname.startsWith('/thumbnails/');
}

// 判断是否为 API 请求
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

// 缓存优先策略 (Cache First)
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Service Worker: Serving from cache', request.url);
      return cachedResponse;
    }
    
    console.log('Service Worker: Fetching from network', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Cache first failed', error);
    
    // 返回离线页面或默认响应
    if (request.destination === 'document') {
      const cache = await caches.open(STATIC_CACHE);
      return cache.match('/offline.html') || new Response('离线模式', {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    throw error;
  }
}

// 网络优先策略 (Network First)
async function networkFirst(request, cacheName) {
  try {
    console.log('Service Worker: Network first for', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache', request.url);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // API 请求失败时返回错误响应
    return new Response(JSON.stringify({
      error: 'Network unavailable',
      message: '网络不可用，请检查连接'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 过期重新验证策略 (Stale While Revalidate)
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // 后台更新缓存
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.error('Service Worker: Background fetch failed', error);
  });
  
  // 立即返回缓存的响应，如果有的话
  if (cachedResponse) {
    console.log('Service Worker: Serving stale content', request.url);
    return cachedResponse;
  }
  
  // 如果没有缓存，等待网络响应
  console.log('Service Worker: No cache, waiting for network', request.url);
  return fetchPromise;
}

// 消息处理
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_SIZE':
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', payload: size });
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
      
    case 'CACHE_URLS':
      cacheUrls(payload.urls).then(() => {
        event.ports[0].postMessage({ type: 'URLS_CACHED' });
      });
      break;
  }
});

// 获取缓存大小
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return {
    bytes: totalSize,
    mb: Math.round(totalSize / 1024 / 1024 * 100) / 100,
    caches: cacheNames.length
  };
}

// 清理所有缓存
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('Service Worker: All caches cleared');
}

// 缓存指定 URL
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  await cache.addAll(urls);
  console.log('Service Worker: URLs cached', urls);
}

// 后台同步
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// 执行后台同步
async function doBackgroundSync() {
  try {
    // 同步离线时的操作
    const offlineActions = await getOfflineActions();
    
    for (const action of offlineActions) {
      await syncAction(action);
    }
    
    await clearOfflineActions();
    console.log('Service Worker: Background sync completed');
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// 获取离线操作
async function getOfflineActions() {
  // 从 IndexedDB 或其他存储中获取离线操作
  return [];
}

// 同步单个操作
async function syncAction(action) {
  // 执行具体的同步操作
  console.log('Service Worker: Syncing action', action);
}

// 清理离线操作
async function clearOfflineActions() {
  // 清理已同步的离线操作
  console.log('Service Worker: Offline actions cleared');
}

// 推送通知
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  const options = {
    body: event.data ? event.data.text() : '新消息',
    icon: '/static/media/logo192.png',
    badge: '/static/media/badge.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看',
        icon: '/static/media/checkmark.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/static/media/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('地图相册', options)
  );
});

// 通知点击
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

} // 结束生产环境代码块

console.log('Service Worker: Loaded');
import { useState, useEffect } from 'react';

// 检测是否为开发环境
const isDev = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' ||
   window.location.port === '3001');

class PWAManager {
  constructor() {
    this.registration = null;
    this.isOnline = navigator.onLine;
    this.installPrompt = null;
    this.updateAvailable = false;
    
    this.init();
  }

  async init() {
    // 开发环境下不注册 Service Worker，避免缓存问题
    if (isDev) {
      console.log('⚠️ PWA Manager: Development mode - Service Worker disabled');
      this.setupEventListeners();
      return;
    }

    if ('serviceWorker' in navigator) {
      try {
        await this.registerServiceWorker();
        this.setupEventListeners();
        this.checkForUpdates();
        console.log('✅ PWA Manager initialized');
      } catch (error) {
        console.error('❌ PWA Manager initialization failed:', error);
      }
    } else {
      console.warn('⚠️ Service Worker not supported');
    }
  }

  // 注册 Service Worker
  async registerServiceWorker() {
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered:', this.registration);

      // 监听更新
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.updateAvailable = true;
            this.notifyUpdateAvailable();
          }
        });
      });

      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  // 设置事件监听器
  setupEventListeners() {
    // 网络状态变化
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.onNetworkChange(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.onNetworkChange(false);
    });

    // 安装提示
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installPrompt = event;
      this.showInstallButton();
    });

    // 应用安装完成
    window.addEventListener('appinstalled', () => {
      this.installPrompt = null;
      this.hideInstallButton();
      this.trackEvent('pwa_installed');
    });

    // Service Worker 消息
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event.data);
    });
  }

  // 网络状态变化处理
  onNetworkChange(isOnline) {
    console.log('Network status:', isOnline ? 'online' : 'offline');
    
    // 显示网络状态提示
    this.showNetworkStatus(isOnline);
    
    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('networkchange', {
      detail: { isOnline }
    }));

    if (isOnline) {
      // 网络恢复时同步离线数据
      this.syncOfflineData();
    }
  }

  // 显示网络状态
  showNetworkStatus(isOnline) {
    const statusEl = document.getElementById('network-status');
    if (!statusEl) {
      const status = document.createElement('div');
      status.id = 'network-status';
      status.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        padding: 8px;
        text-align: center;
        font-size: 14px;
        z-index: 10000;
        transition: transform 0.3s ease;
        transform: translateY(-100%);
      `;
      document.body.appendChild(status);
    }

    const status = document.getElementById('network-status');
    
    if (isOnline) {
      status.textContent = '✅ 网络已连接';
      status.style.backgroundColor = '#4CAF50';
      status.style.color = 'white';
      
      // 3秒后隐藏
      setTimeout(() => {
        status.style.transform = 'translateY(-100%)';
      }, 3000);
    } else {
      status.textContent = '⚠️ 网络已断开，正在使用离线模式';
      status.style.backgroundColor = '#FF9800';
      status.style.color = 'white';
      status.style.transform = 'translateY(0)';
    }
  }

  // 检查更新
  async checkForUpdates() {
    if (!this.registration) return;

    try {
      await this.registration.update();
    } catch (error) {
      console.error('Update check failed:', error);
    }
  }

  // 通知更新可用
  notifyUpdateAvailable() {
    const updateBanner = document.createElement('div');
    updateBanner.id = 'update-banner';
    updateBanner.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: #2196F3;
        color: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: space-between;
      ">
        <span>🚀 新版本可用！</span>
        <div>
          <button id="update-btn" style="
            background: white;
            color: #2196F3;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            margin-right: 8px;
            cursor: pointer;
          ">更新</button>
          <button id="dismiss-btn" style="
            background: transparent;
            color: white;
            border: 1px solid white;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
          ">稍后</button>
        </div>
      </div>
    `;

    document.body.appendChild(updateBanner);

    // 更新按钮事件
    document.getElementById('update-btn').addEventListener('click', () => {
      this.applyUpdate();
      updateBanner.remove();
    });

    // 关闭按钮事件
    document.getElementById('dismiss-btn').addEventListener('click', () => {
      updateBanner.remove();
    });
  }

  // 应用更新
  async applyUpdate() {
    if (!this.registration || !this.registration.waiting) return;

    // 通知 Service Worker 跳过等待
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // 刷新页面
    window.location.reload();
  }

  // 显示安装按钮
  showInstallButton() {
    let installBtn = document.getElementById('install-pwa-btn');
    
    if (!installBtn) {
      installBtn = document.createElement('button');
      installBtn.id = 'install-pwa-btn';
      installBtn.textContent = '📱 安装应用';
      installBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 25px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        transition: transform 0.3s ease;
      `;
      
      installBtn.addEventListener('click', () => {
        this.promptInstall();
      });
      
      document.body.appendChild(installBtn);
    }

    installBtn.style.transform = 'scale(1)';
  }

  // 隐藏安装按钮
  hideInstallButton() {
    const installBtn = document.getElementById('install-pwa-btn');
    if (installBtn) {
      installBtn.style.transform = 'scale(0)';
      setTimeout(() => installBtn.remove(), 300);
    }
  }

  // 提示安装
  async promptInstall() {
    if (!this.installPrompt) return;

    try {
      const result = await this.installPrompt.prompt();
      console.log('Install prompt result:', result);
      
      this.installPrompt = null;
      this.hideInstallButton();
      
      if (result.outcome === 'accepted') {
        this.trackEvent('pwa_install_accepted');
      } else {
        this.trackEvent('pwa_install_dismissed');
      }
    } catch (error) {
      console.error('Install prompt failed:', error);
    }
  }

  // 同步离线数据
  async syncOfflineData() {
    if (!this.registration || !this.registration.sync) return;

    try {
      await this.registration.sync.register('background-sync');
      console.log('Background sync registered');
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }

  // 处理 Service Worker 消息
  handleServiceWorkerMessage(data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'CACHE_SIZE':
        console.log('Cache size:', payload);
        break;
      case 'CACHE_CLEARED':
        console.log('Cache cleared');
        break;
      case 'URLS_CACHED':
        console.log('URLs cached');
        break;
    }
  }

  // 获取缓存大小
  async getCacheSize() {
    if (!this.registration) return null;

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_SIZE') {
          resolve(event.data.payload);
        }
      };

      this.registration.active.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [messageChannel.port2]
      );
    });
  }

  // 清理缓存
  async clearCache() {
    if (!this.registration) return;

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_CLEARED') {
          resolve();
        }
      };

      this.registration.active.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    });
  }

  // 缓存指定 URL
  async cacheUrls(urls) {
    if (!this.registration) return;

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'URLS_CACHED') {
          resolve();
        }
      };

      this.registration.active.postMessage(
        { type: 'CACHE_URLS', payload: { urls } },
        [messageChannel.port2]
      );
    });
  }

  // 检查是否为 PWA 环境
  isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone ||
           document.referrer.includes('android-app://');
  }

  // 获取 PWA 状态
  getStatus() {
    return {
      isOnline: this.isOnline,
      isPWA: this.isPWA(),
      hasServiceWorker: !!this.registration,
      updateAvailable: this.updateAvailable,
      canInstall: !!this.installPrompt
    };
  }

  // 事件跟踪
  trackEvent(eventName, properties = {}) {
    // 集成到监控系统
    if (window.monitoring) {
      window.monitoring.trackEvent(eventName, {
        ...properties,
        pwa: true,
        isOnline: this.isOnline
      });
    }
  }
}

// 创建全局实例
const pwaManager = new PWAManager();

// React Hook
export const usePWA = () => {
  const [status, setStatus] = useState(pwaManager.getStatus());

  useEffect(() => {
    const updateStatus = () => setStatus(pwaManager.getStatus());
    
    window.addEventListener('networkchange', updateStatus);
    window.addEventListener('appinstalled', updateStatus);
    
    return () => {
      window.removeEventListener('networkchange', updateStatus);
      window.removeEventListener('appinstalled', updateStatus);
    };
  }, []);

  return {
    ...status,
    promptInstall: () => pwaManager.promptInstall(),
    checkForUpdates: () => pwaManager.checkForUpdates(),
    getCacheSize: () => pwaManager.getCacheSize(),
    clearCache: () => pwaManager.clearCache()
  };
};

export default pwaManager;
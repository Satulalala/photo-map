import { showNetworkStatus } from './pwaNotifications.js';

const isDev = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1' ||
   window.location.port === '3001');

class PWAManager {
  constructor() {
    this.registration = null;
    this.isOnline = navigator.onLine;
    this.updateAvailable = false;

    this.init();
  }

  async init() {
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

  async registerServiceWorker() {
    try {
      let hasBeenControlled = Boolean(navigator.serviceWorker.controller);
      this.reloadingForControllerChange = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hasBeenControlled) {
          hasBeenControlled = true;
          return;
        }
        if (this.reloadingForControllerChange) return;
        this.reloadingForControllerChange = true;
        window.location.reload();
      });

      this.registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.updateAvailable = true;
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.onNetworkChange(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.onNetworkChange(false);
    });

    navigator.serviceWorker.addEventListener('message', event => {
      this.handleServiceWorkerMessage(event.data);
    });
  }

  onNetworkChange(isOnline) {
    console.log('Network status:', isOnline ? 'online' : 'offline');
    showNetworkStatus(isOnline);

    window.dispatchEvent(new CustomEvent('networkchange', {
      detail: { isOnline }
    }));

    if (isOnline) this.syncOfflineData();
  }

  async checkForUpdates() {
    if (!this.registration) return;
    try {
      await this.registration.update();
    } catch (error) {
      console.error('Update check failed:', error);
    }
  }

  async applyUpdate() {
    if (!this.registration || !this.registration.waiting) return;
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  async syncOfflineData() {
    if (!this.registration || !this.registration.sync) return;
    try {
      await this.registration.sync.register('background-sync');
      console.log('Background sync registered');
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }

  handleServiceWorkerMessage(data) {
    const { type, payload } = data;
    switch (type) {
      case 'CACHE_SIZE': console.log('Cache size:', payload); break;
      case 'CACHE_CLEARED': console.log('Cache cleared'); break;
      case 'URLS_CACHED': console.log('URLs cached'); break;
    }
  }

  async getCacheSize() {
    if (!this.registration) return null;

    return new Promise(resolve => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = event => {
        if (event.data.type === 'CACHE_SIZE') {
          resolve(event.data.payload);
        }
      };
      this.registration.active.postMessage({ type: 'GET_CACHE_SIZE' }, [messageChannel.port2]);
    });
  }

  async clearCache() {
    if (!this.registration) return;

    return new Promise(resolve => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = event => {
        if (event.data.type === 'CACHE_CLEARED') {
          resolve();
        }
      };
      this.registration.active.postMessage({ type: 'CLEAR_CACHE' }, [messageChannel.port2]);
    });
  }

  async cacheUrls(urls) {
    if (!this.registration) return;

    return new Promise(resolve => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = event => {
        if (event.data.type === 'URLS_CACHED') {
          resolve();
        }
      };
      this.registration.active.postMessage({ type: 'CACHE_URLS', payload: { urls } }, [messageChannel.port2]);
    });
  }

}

const pwaManager = new PWAManager();

export default pwaManager;

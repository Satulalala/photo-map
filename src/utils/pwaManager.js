import { useState, useEffect } from 'react';
import { showNetworkStatus, showUpdateBanner, showInstallButton, hideInstallButton } from './pwaNotifications.js';

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
      this.registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.updateAvailable = true;
            showUpdateBanner(() => this.applyUpdate());
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

    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      this.installPrompt = event;
      showInstallButton(() => this.promptInstall());
    });

    window.addEventListener('appinstalled', () => {
      this.installPrompt = null;
      hideInstallButton();
      this.trackEvent('pwa_installed');
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
    window.location.reload();
  }

  async promptInstall() {
    if (!this.installPrompt) return;

    try {
      const result = await this.installPrompt.prompt();
      console.log('Install prompt result:', result);

      this.installPrompt = null;
      hideInstallButton();

      if (result.outcome === 'accepted') {
        this.trackEvent('pwa_install_accepted');
      } else {
        this.trackEvent('pwa_install_dismissed');
      }
    } catch (error) {
      console.error('Install prompt failed:', error);
    }
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

  isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone ||
           document.referrer.includes('android-app://');
  }

  getStatus() {
    return {
      isOnline: this.isOnline,
      isPWA: this.isPWA(),
      hasServiceWorker: !!this.registration,
      updateAvailable: this.updateAvailable,
      canInstall: !!this.installPrompt
    };
  }

  trackEvent(eventName, properties = {}) {
    if (window.monitoring) {
      window.monitoring.trackEvent(eventName, {
        ...properties,
        pwa: true,
        isOnline: this.isOnline
      });
    }
  }
}

const pwaManager = new PWAManager();

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

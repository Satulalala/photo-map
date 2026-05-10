import { useState, useCallback, useEffect } from 'react';
import syncService from '../services/syncService.js';
import api from '../api/index.js';

export function useSync({ showToast, setMarkers, cloudSyncEnabled }) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncingNow, setSyncingNow] = useState(false);
  const [syncQueueSize, setSyncQueueSize] = useState(() => syncService.getQueueLength());
  const [syncApiBase, setSyncApiBase] = useState(() => syncService.getApiBase());

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const runCloudSync = useCallback(async () => {
    if (!cloudSyncEnabled || syncingNow) return;
    try {
      setSyncingNow(true);
      const result = await syncService.syncNow({
        loadLocalMarkers: async () => {
          if (window.electronAPI?.loadMarkers) return window.electronAPI.loadMarkers();
          return api.markers.getAll();
        },
        onApplyServerMarkers: async (serverMarkers) => {
          if (window.electronAPI?.addMarker) {
            for (const m of serverMarkers) {
              await window.electronAPI.addMarker(m);
            }
            const latest = window.electronAPI.loadMarkers
              ? await window.electronAPI.loadMarkers()
              : await api.markers.getAll();
            setMarkers(latest || []);
          } else {
            for (const m of serverMarkers) {
              await api.markers.create(m);
            }
            const latest = await api.markers.getAll();
            setMarkers(latest || []);
          }
        }
      });
      setSyncQueueSize(syncService.getQueueLength());
      if (!result.skipped) {
        showToast('success', `云同步完成：上传${result.pushed}，下载${result.pulled}`);
      }
    } catch (e) {
      showToast('error', `云同步失败：${e.message || '网络异常'}`);
    } finally {
      setSyncingNow(false);
    }
  }, [cloudSyncEnabled, syncingNow, showToast, setMarkers]);

  useEffect(() => {
    if (!isOnline || !cloudSyncEnabled) return;
    runCloudSync();
    const timer = setInterval(() => {
      runCloudSync();
    }, 45000);
    return () => clearInterval(timer);
  }, [isOnline, cloudSyncEnabled, runCloudSync]);

  return {
    isOnline,
    syncingNow,
    syncQueueSize,
    syncApiBase,
    setSyncingNow,
    setSyncQueueSize,
    setSyncApiBase,
    runCloudSync,
  };
}

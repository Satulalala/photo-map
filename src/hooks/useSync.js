import { useState, useCallback, useEffect } from 'react';
import syncService from '../api/syncService.js';
import api from '../api/index.js';
import { loadLocalMarkerSnapshots } from '../api/localMarkerSnapshots.js';
import { isMapLibreTestRoute } from '../utils/mapLibreTestMode.js';

export function useSync({ showToast, setMarkers, cloudSyncEnabled, storageReady = true }) {
  const syncEnabled = cloudSyncEnabled && storageReady && !isMapLibreTestRoute();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncingNow, setSyncingNow] = useState(false);
  const [syncConflictCount, setSyncConflictCount] = useState(() => syncService.getConflictCount());
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

  const refreshLocalMarkers = useCallback(async () => {
    const latest = await loadLocalMarkerSnapshots();
    setMarkers(latest || []);
  }, [setMarkers]);

  const runCloudSync = useCallback(async () => {
    if (!syncEnabled || syncingNow) return;
    try {
      setSyncingNow(true);
      const result = await syncService.syncNow({
        loadLocalMarkers: loadLocalMarkerSnapshots,
        onApplyServerMarkers: async serverMarkers => {
          for (const marker of serverMarkers) await api.markers.upsertSnapshot(marker);
          await refreshLocalMarkers();
        },
        onDeleteServerMarkers: async markerIds => {
          for (const markerId of markerIds) await api.markers.delete(markerId);
          await refreshLocalMarkers();
        },
      });
      setSyncConflictCount(syncService.getConflictCount());
      if (!result.skipped && result.conflicts > 0) {
        showToast('error', `有 ${result.conflicts} 条云端修改冲突，已保留本地和云端版本；编辑该地点可选择保留本地版本`);
      } else if (!result.skipped && (result.pushed || result.pulled || result.uploaded)) {
        showToast('success', `云同步完成：地点 ${result.pushed}，更新 ${result.pulled}，文件 ${result.uploaded}`);
      }
    } catch (error) {
      showToast('error', `云同步失败：${error.message || '网络异常'}`);
    } finally {
      setSyncingNow(false);
    }
  }, [syncEnabled, syncingNow, showToast, refreshLocalMarkers]);

  useEffect(() => {
    if (!isOnline || !syncEnabled) return;
    runCloudSync();
    const timer = setInterval(runCloudSync, 45000);
    return () => clearInterval(timer);
  }, [isOnline, syncEnabled, runCloudSync]);

  return {
    isOnline,
    syncingNow,
    syncConflictCount,
    syncApiBase,
    setSyncApiBase,
    runCloudSync,
  };
}

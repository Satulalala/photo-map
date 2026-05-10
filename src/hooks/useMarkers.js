import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../api/index.js';

export function useMarkers() {
  const [markers, setMarkers] = useState([]);
  const [markersLoading, setMarkersLoading] = useState(true);
  const [newMarkerIds, setNewMarkerIds] = useState(new Set());
  const markersStateRef = useRef(markers);

  useEffect(() => {
    markersStateRef.current = markers;
  }, [markers]);

  const refreshMarkers = useCallback(async () => {
    if (window.electronAPI && !window.electronAPI.__isWebAdapter) {
      window.electronAPI.loadMarkers().then(loaded => {
        setMarkers(loaded);
      });
    } else {
      // Web 环境 - 加载轻量版格式
      const loaded = await api.markers.getAll();
      const markersWithCounts = await Promise.all(
        loaded.map(async marker => {
          const photos = await api.photos.getByMarkerId(marker.id);
          // 按 order 字段排序（设为封面时写入）
          const sorted = [...photos].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
          return {
            ...marker,
            photoCount: sorted.length,
            firstPhoto: sorted.length > 0 ? sorted[0] : null,
            photos: sorted
          };
        })
      );
      setMarkers(markersWithCounts);
    }
  }, []);

  const deleteMarkerById = useCallback(async (id) => {
    if (!window.confirm('确定要删除这个标记点吗？\n删除后无法恢复。')) return false;
    if (window.electronAPI) {
      await window.electronAPI.deleteMarker(id);
      refreshMarkers();
      return true;
    }
    return false;
  }, [refreshMarkers]);

  return {
    markers,
    markersLoading,
    newMarkerIds,
    markersStateRef,
    setMarkers,
    setMarkersLoading,
    setNewMarkerIds,
    refreshMarkers,
    deleteMarkerById,
  };
}

/**
 * 标记管理 Hook
 */
import { useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useMarkerStore, useMenuStore, useAppStore } from '../store';

const mapboxgl = window.mapboxgl;

export function useMarkers(mapRef, mapLoaded) {
  const markersRef = useRef({});
  const { markers, refreshMarkers, setMarkers } = useMarkerStore();
  const { setMarkerMenu, setContextMenu, setPreviewPin } = useMenuStore();
  const { showToast } = useAppStore();
  
  // 创建标记元素
  const createMarkerElement = useCallback((photoId, photoCount) => {
    const el = document.createElement('div');
    el.className = 'marker-pin';
    el.style.cssText = 'cursor:pointer;display:flex;flex-direction:column;align-items:center;';
    
    if (photoId) {
      el.innerHTML = `
        <div class="marker-photo-preview" style="width:48px;height:48px;border-radius:6px;overflow:hidden;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);background:#e2e8f0;margin-bottom:2px;position:relative;">
          <img src="" style="width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity 0.2s;" />
          ${photoCount > 1 ? `<span style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.6);color:white;font-size:10px;padding:1px 4px;border-radius:8px;">+${photoCount - 1}</span>` : ''}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="26" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#ff6b6b"/><circle cx="12" cy="12" r="4" fill="white"/></svg>
      `;
    } else {
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#ff6b6b"/><circle cx="12" cy="12" r="5" fill="white"/></svg>`;
    }
    return el;
  }, []);
  
  // 渲染标记
  const renderMarkers = useCallback(() => {
    if (!mapRef.current) return;
    
    // 清除旧标记
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    
    markers.forEach((m, index) => {
      const photoId = m.firstPhoto?.id || null;
      const photoCount = m.photoCount ?? 0;
      const el = createMarkerElement(photoId, photoCount);
      
      // 延迟加载缩略图
      if (photoId) {
        setTimeout(() => {
          if (window.electronAPI?.getThumbnailUrl) {
            window.electronAPI.getThumbnailUrl(photoId).then(url => {
              const img = el.querySelector('img');
              if (img && url) {
                img.onload = () => { img.style.opacity = '1'; };
                img.src = url;
              }
            });
          }
        }, index * 20);
      }
      
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        mapRef.current.flyTo({ center: [m.lng, m.lat], zoom: Math.max(mapRef.current.getZoom(), 15), duration: 800 });
        setTimeout(async () => {
          const point = mapRef.current.project([m.lng, m.lat]);
          let fullMarker = m;
          if (window.electronAPI?.getMarkerDetail) {
            const detail = await window.electronAPI.getMarkerDetail(m.id);
            if (detail) fullMarker = detail;
          }
          setMarkerMenu({ x: point.x, y: point.y, marker: fullMarker });
        }, 850);
        setContextMenu(null);
        setPreviewPin(null);
      });
      
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([m.lng, m.lat])
        .addTo(mapRef.current);
      markersRef.current[m.id] = marker;
    });
  }, [markers, mapRef, createMarkerElement, setMarkerMenu, setContextMenu, setPreviewPin]);
  
  // 地图加载完成后渲染标记
  useEffect(() => {
    if (mapLoaded) renderMarkers();
  }, [markers, mapLoaded, renderMarkers]);
  
  // 添加照片标记
  const addPhotoMarker = useCallback(async (latlng, fetchPlaceName) => {
    if (!window.electronAPI) return;
    
    const photos = await window.electronAPI.selectPhotos();
    if (!photos || photos.length === 0) return;
    
    const name = await fetchPlaceName(latlng.lat, latlng.lng);
    
    const newMarker = {
      id: uuidv4(),
      lat: latlng.lat,
      lng: latlng.lng,
      name,
      photos: photos.map(p => ({ id: p.id, note: '' })),
      createdAt: Date.now()
    };
    
    await window.electronAPI.addMarker(newMarker);
    refreshMarkers();
    setContextMenu(null);
    setPreviewPin(null);
    showToast('success', `已添加 ${photos.length} 张照片`);
  }, [refreshMarkers, setContextMenu, setPreviewPin, showToast]);
  
  // 删除标记
  const deleteMarker = useCallback(async (id) => {
    if (window.electronAPI) {
      await window.electronAPI.deleteMarker(id);
      refreshMarkers();
      showToast('success', '标记已删除');
    }
  }, [refreshMarkers, showToast]);
  
  return {
    markersRef,
    renderMarkers,
    addPhotoMarker,
    deleteMarker,
  };
}

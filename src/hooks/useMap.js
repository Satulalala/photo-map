/**
 * 地图相关 Hook
 */
import { useRef, useEffect, useCallback } from 'react';
import { useAppStore, useMenuStore, useSettingsStore } from '../store';

const mapboxgl = window.mapboxgl;

export function useMap(containerRef, isLoggedIn, userLocation) {
  const mapRef = useRef(null);
  const { setIsDragging } = useAppStore();
  const { setContextMenu, setPreviewPin, setPlaceName } = useMenuStore();
  const { mapSettings } = useSettingsStore();
  
  // 初始化地图
  useEffect(() => {
    if (!isLoggedIn || !containerRef.current || mapRef.current) return;
    
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [105, 35],
      zoom: 1,
      pitch: 0,
      language: 'zh-Hans',
      antialias: mapSettings.antialias,
      fadeDuration: mapSettings.fadeDuration,
      maxTileCacheSize: mapSettings.maxTileCacheSize,
      dragRotate: mapSettings.dragRotate,
      renderWorldCopies: mapSettings.renderWorldCopies,
      maxZoom: mapSettings.maxZoom,
      minZoom: mapSettings.minZoom,
      trackResize: true,
      refreshExpiredTiles: false,
      scrollZoom: true,
      pitchWithRotate: false,
      crossSourceCollisions: false,
      collectResourceTiming: false,
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false,
    });
    
    // 拖动状态
    map.on('dragstart', () => setIsDragging(true));
    map.on('dragend', () => setIsDragging(false));
    
    // 加载完成后飞到用户位置
    map.on('load', () => {
      setTimeout(() => {
        if (userLocation.current) {
          map.flyTo({ center: userLocation.current, zoom: 13, duration: 2000 });
        }
      }, 800);
    });
    
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [isLoggedIn, mapSettings]);
  
  // 飞到位置
  const flyTo = useCallback((center, zoom = 15, duration = 1000) => {
    if (mapRef.current) {
      mapRef.current.flyTo({ center, zoom, duration });
    }
  }, []);
  
  // 缩放
  const zoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => mapRef.current?.zoomOut(), []);
  
  // 获取当前缩放级别
  const getZoom = useCallback(() => mapRef.current?.getZoom() || 1, []);
  
  // 坐标转屏幕点
  const project = useCallback((lngLat) => {
    return mapRef.current?.project(lngLat);
  }, []);
  
  return {
    mapRef,
    flyTo,
    zoomIn,
    zoomOut,
    getZoom,
    project,
  };
}

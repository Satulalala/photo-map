import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../api/index.js';

/**
 * 地图管理 Hook
 * 从 App.jsx 提取的地图初始化、事件处理、标记渲染等逻辑
 */
export function useMap({
  markers,
  newMarkerIds,
  mapSettingsRef,
  getPhotoUrl,
  previewPin,
  setPreviewPin,
  setContextMenu,
  setPlaceName,
  setMarkerMenu,
}) {
  // ---- 状态 ----
  const [mapboxReady, setMapboxReady] = useState(false);
  const [mapEntered, setMapEntered] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [viewportVersion, setViewportVersion] = useState(0);
  const [measureMode, setMeasureMode] = useState(false);
  const [measureStart, setMeasureStart] = useState(null);
  const [measureLines, setMeasureLines] = useState([]);

  // ---- Refs ----
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapMarkersRef = useRef({});
  const userLocationRef = useRef(null);
  const measureModeRef = useRef(false);
  const measureStartRef = useRef(null);
  const previewMarkerRef = useRef(null);

  // ---- Mapbox 加载检查 ----
  useEffect(() => {
    const checkMapbox = () => {
      if (typeof window !== 'undefined' && window.mapboxgl) {
        setMapboxReady(true);
      } else {
        setTimeout(checkMapbox, 100);
      }
    };
    checkMapbox();
  }, []);

  // ---- 获取地名（国内用高德，国外用 Mapbox）----
  const fetchPlaceName = useCallback(async (lat, lng) => {
    const isInChina = lng >= 73 && lng <= 135 && lat >= 18 && lat <= 54;

    try {
      if (isInChina) {
        // 国内用高德 API
        const res = await fetch(
          `https://restapi.amap.com/v3/geocode/regeo?key=9fb3c3f43537ecacd6d0a082958a883c&location=${lng},${lat}&extensions=base`,
          { signal: AbortSignal.timeout(5000) }
        );
        const data = await res.json();
        if (data.status === '1' && data.regeocode?.formatted_address) {
          return data.regeocode.formatted_address;
        }
      } else {
        // 国外用 Mapbox API
        // 先尝试中文
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${window.mapboxgl?.accessToken}&language=zh-Hans&limit=1`,
            { signal: AbortSignal.timeout(5000) }
          );
          const data = await res.json();
          if (data.features?.[0]?.place_name) {
            const place = data.features[0].place_name.replace(/\s*\d{5,6}\s*$/, '').replace(/,\s*$/, '').trim();
            if (place && place.length > 0) {
              return place;
            }
          }
        } catch (err) {
          console.log('中文地名获取失败，尝试英文:', err.message);
        }

        // 如果中文失败，尝试英文
        try {
          const resEn = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${window.mapboxgl?.accessToken}&limit=1`,
            { signal: AbortSignal.timeout(5000) }
          );
          const dataEn = await resEn.json();
          if (dataEn.features?.[0]?.place_name) {
            const place = dataEn.features[0].place_name.replace(/\s*\d{5,6}\s*$/, '').replace(/,\s*$/, '').trim();
            if (place && place.length > 0) {
              return place;
            }
          }
        } catch (err) {
          console.log('英文地名获取失败:', err.message);
        }
      }
    } catch (err) {
      console.error('获取地名失败:', err);
    }

    // 所有方法都失败，返回坐标
    return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
  }, []);

  // ---- 地图初始化 ----
  useEffect(() => {
    if (!mapEntered || !mapContainerRef.current || mapRef.current || !mapboxReady) return;

    if (!window.mapboxgl) {
      console.error('Mapbox GL JS 未加载');
      return;
    }

    // 从加载器获取最终位置
    const finalState = window.__loaderFinalState || {};
    const userLocation = finalState.center || window.__userLocation || [117.28, 31.86];
    const initialZoom = finalState.zoom || 13;

    // 保存用户位置引用
    userLocationRef.current = userLocation;

    try {
      // 检查 WebGL 支持
      if (!window.mapboxgl.supported()) {
        console.error('WebGL not supported by browser');
        alert('您的浏览器不支持 WebGL，地图功能无法使用。\n\n请尝试：\n1. 在浏览器设置中启用硬件加速\n2. 更新显卡驱动\n3. 使用 Chrome 或 Edge 浏览器');
        return;
      }

      const map = new window.mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: userLocation,
        zoom: initialZoom,
        pitch: 0,
        projection: 'globe',
        language: 'zh-Hans',
        antialias: mapSettingsRef.current?.antialias ?? true,
        fadeDuration: mapSettingsRef.current?.fadeDuration ?? 200,
        maxTileCacheSize: mapSettingsRef.current?.maxTileCacheSize ?? 4000,
        dragRotate: mapSettingsRef.current?.dragRotate ?? false,
        renderWorldCopies: mapSettingsRef.current?.renderWorldCopies ?? false,
        maxZoom: mapSettingsRef.current?.maxZoom ?? 18,
        minZoom: mapSettingsRef.current?.minZoom ?? 0,
        trackResize: true,
        refreshExpiredTiles: false,
        scrollZoom: true,
        pitchWithRotate: false,
        crossSourceCollisions: false,
        collectResourceTiming: false,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
      });

      // 设置地球大气层效果
      map.on('style.load', () => {
        map.setFog({
          color: 'rgb(186, 210, 235)',
          'high-color': 'rgb(36, 92, 223)',
          'horizon-blend': 0.02,
          'space-color': 'rgb(11, 11, 25)',
          'star-intensity': 0.6
        });
      });

      // 拖动状态
      map.on('dragstart', () => setIsDragging(true));
      map.on('dragend', () => setIsDragging(false));

      // 点击事件
      map.on('click', e => {
        // 创建涟漪效果
        const ripple = document.createElement('div');
        ripple.className = 'click-ripple';
        ripple.style.left = `${e.point.x}px`;
        ripple.style.top = `${e.point.y}px`;
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 700);

        if (measureModeRef.current) {
          // 测量模式
          const latlng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
          if (!measureStartRef.current) {
            measureStartRef.current = latlng;
            setMeasureStart(latlng);
          } else {
            // 计算距离
            const from = [measureStartRef.current.lng, measureStartRef.current.lat];
            const to = [latlng.lng, latlng.lat];
            const distance = turf_distance(from, to);
            const distanceText = distance >= 1 ? `${distance.toFixed(2)} km` : `${Math.round(distance * 1000)} m`;

            setMeasureLines(prev => [...prev, {
              start: measureStartRef.current,
              end: latlng,
              distance: distanceText
            }]);
            measureStartRef.current = null;
            setMeasureStart(null);
          }
          return;
        }

        // 正常模式
        const latlng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        setPreviewPin(latlng);
        setContextMenu({ x: e.point.x, y: e.point.y, latlng });
        // 先显示坐标，不等待地名加载
        setPlaceName(`${latlng.lat.toFixed(3)}°, ${latlng.lng.toFixed(3)}°`);

        // 异步获取地名
        fetchPlaceName(latlng.lat, latlng.lng).then(name => {
          setPlaceName(name);
        });
      });

      // 加载完成后飞到用户位置
      map.on('load', () => {
        setMapLoaded(true);

        // 添加热力图数据源和图层
        map.addSource('markers-heatmap', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        map.addLayer({
          id: 'markers-heat',
          type: 'heatmap',
          source: 'markers-heatmap',
          maxzoom: 18,
          layout: { visibility: 'none' },
          paint: {
            'heatmap-weight': [
              'interpolate', ['linear'], ['get', 'photoCount'],
              1, 0.2,
              5, 0.4,
              10, 0.6,
              20, 0.8
            ],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1.5, 5, 1.2, 10, 1.5, 15, 2],
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0, 0, 255, 0)',
              0.1, 'rgba(65, 105, 225, 0.5)',
              0.3, 'rgb(0, 191, 255)',
              0.5, 'rgb(50, 205, 50)',
              0.7, 'rgb(255, 215, 0)',
              0.85, 'rgb(255, 140, 0)',
              1, 'rgb(255, 0, 0)'
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 15, 3, 20, 6, 25, 10, 30, 15, 40],
            'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.8, 10, 0.85, 15, 0.6]
          }
        });

        setTimeout(() => {
          if (userLocationRef.current) {
            map.flyTo({ center: userLocationRef.current, zoom: 13, duration: 2000 });
          }
        }, 800);
      });

      mapRef.current = map;
      return () => {
        if (previewMarkerRef.current) { previewMarkerRef.current.remove(); previewMarkerRef.current = null; }
        map.remove();
        mapRef.current = null;
      };
    } catch (error) {
      console.error('地图初始化失败:', error);
      if (mapContainerRef.current) {
        mapContainerRef.current.textContent = '地图初始化失败: ' + (error.message || 'WebGL 不可用');
        mapContainerRef.current.style.display = 'flex';
        mapContainerRef.current.style.alignItems = 'center';
        mapContainerRef.current.style.justifyContent = 'center';
        mapContainerRef.current.style.color = '#94a3b8';
        mapContainerRef.current.style.fontSize = '14px';
      }
    }
  }, [mapEntered, mapboxReady]);

  // ---- 简单距离计算（Haversine公式）----
  const turf_distance = (from, to) => {
    const R = 6371;
    const dLat = (to[1] - from[1]) * Math.PI / 180;
    const dLon = (to[0] - from[0]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(from[1] * Math.PI / 180) * Math.cos(to[1] * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // ---- 创建标记元素（带照片预览）----
  const createMarkerEl = useCallback((color, photos = []) => {
    const el = document.createElement('div');
    el.className = 'marker-pin';

    if (photos.length > 0) {
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.alignItems = 'center';
      el.innerHTML = `
        <div class="marker-photo-preview">
          <img src="" alt="预览" loading="lazy" style="background:#f0f0f0" />
          ${photos.length > 1 ? `<span class="photo-badge">+${photos.length - 1}</span>` : ''}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="${color}"/><circle cx="12" cy="12" r="5" fill="white"/></svg>
      `;
      getPhotoUrl(photos[0]).then(url => {
        const img = el.querySelector('img');
        if (img && url) img.src = url;
      });
    } else {
      el.style.width = '24px';
      el.style.height = '32px';
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="${color}"/><circle cx="12" cy="12" r="5" fill="white"/></svg>`;
    }
    el.style.cursor = 'pointer';
    return el;
  }, [getPhotoUrl]);

  // ---- 创建带预览图的标记元素 ----
  const thumbCache = useRef({});

  const createMarkerWithPhoto = useCallback((photoId, photoCount) => {
    const el = document.createElement('div');
    el.className = 'marker-pin';
    el.style.cssText = 'cursor:pointer;display:flex;flex-direction:column;align-items:center;';

    if (photoId) {
      el.innerHTML = `
        <div class="marker-photo-preview" style="width:48px;height:48px;border-radius:6px;overflow:hidden;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);background:#f0f0f0;margin-bottom:2px;position:relative;">
          <img src="" style="width:100%;height:100%;object-fit:cover;display:block;" />
          ${photoCount > 1 ? `<span style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.6);color:white;font-size:10px;padding:1px 4px;border-radius:8px;">+${photoCount - 1}</span>` : ''}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="26" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#ff6b6b"/><circle cx="12" cy="12" r="4" fill="white"/></svg>
      `;

      const img = el.querySelector('img');
      if (window.electronAPI?.getThumbnailUrl) {
        window.electronAPI.getThumbnailUrl(photoId).then(url => {
          if (url) img.src = url;
        });
      }
    } else {
      el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#ff6b6b"/><circle cx="12" cy="12" r="5" fill="white"/></svg>';
    }
    return el;
  }, []);

  // ---- 创建单个标记元素 ----
  const createMarkerElement = useCallback((m, isNew) => {
    const el = document.createElement('div');
    el.className = 'marker-pin';
    el.style.cssText = `cursor:pointer;display:flex;flex-direction:column;align-items:center;${isNew ? 'animation:markerDrop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;' : ''}`;

    const firstPhoto = m.firstPhoto;
    const photoCount = m.photoCount ?? 0;
    const hasPhoto = firstPhoto && (firstPhoto.id || firstPhoto.data);

    if (hasPhoto) {
      el.innerHTML = `
        <div class="marker-photo-preview" style="width:48px;height:48px;border-radius:6px;overflow:hidden;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);background:#e2e8f0;margin-bottom:2px;position:relative;">
          <img src="" style="width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity 0.2s;" />
          ${photoCount > 1 ? `<span style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.6);color:white;font-size:10px;padding:1px 4px;border-radius:8px;">+${photoCount - 1}</span>` : ''}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="26" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#ff6b6b"/><circle cx="12" cy="12" r="4" fill="white"/></svg>
      `;

      const img = el.querySelector('img');
      if (img) {
        if (firstPhoto.data && firstPhoto.data.startsWith('data:')) {
          img.onload = () => { img.style.opacity = '1'; };
          img.src = firstPhoto.data;
        }
        else if (firstPhoto.id && window.electronAPI?.getThumbnailUrl) {
          window.electronAPI.getThumbnailUrl(firstPhoto.id).then(url => {
            if (url) {
              img.onload = () => { img.style.opacity = '1'; };
              img.src = url;
            }
          });
        }
      }
    } else {
      el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#ff6b6b"/><circle cx="12" cy="12" r="5" fill="white"/></svg>';
    }

    el.addEventListener('click', async e => {
      e.stopPropagation();
      mapRef.current.flyTo({ center: [m.lng, m.lat], zoom: Math.max(mapRef.current.getZoom(), 15), duration: 800 });
      setTimeout(async () => {
        const point = mapRef.current.project([m.lng, m.lat]);
        let fullMarker = m;

        // 加载完整的标记数据（包括所有照片）
        if (window.electronAPI?.getMarkerDetail) {
          const detail = await window.electronAPI.getMarkerDetail(m.id);
          if (detail) fullMarker = detail;
        } else {
          const photos = await api.photos.getByMarkerId(m.id);
          const sorted = [...photos].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
          fullMarker = {
            ...m,
            photos: sorted,
            photoCount: sorted.length,
            firstPhoto: sorted[0] || null
          };
        }

        setMarkerMenu({ x: point.x, y: point.y, marker: fullMarker });
      }, 850);
      setContextMenu(null);
      setPreviewPin(null);
    });

    return el;
  }, []);

  // ---- 渲染所有标记 ----
  const renderMarkers = useCallback(() => {
    if (!mapRef.current) return;

    const currentIds = new Set(markers.map(m => m.id));
    console.log('🗺️ renderMarkers: markers数量=', markers.length, 'mapMarkersRef数量=', Object.keys(mapMarkersRef.current).length);

    // 移除已删除的标记
    Object.keys(mapMarkersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        mapMarkersRef.current[id].remove();
        delete mapMarkersRef.current[id];
      }
    });

    // 只创建尚未存在的标记
    let created = 0;
    markers.forEach(m => {
      if (mapMarkersRef.current[m.id]) return;
      created++;
      const isNew = newMarkerIds.has(m.id);
      const el = createMarkerElement(m, isNew);

      el.classList.add('marker-pin-hidden');

      const marker = new window.mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([m.lng, m.lat])
        .addTo(mapRef.current);

      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.classList.remove('marker-pin-hidden');
      }));

      mapMarkersRef.current[m.id] = marker;
    });
    console.log('🗺️ renderMarkers: 新建了', created, '个标记');
  }, [markers, newMarkerIds, createMarkerElement]);

  // ---- 地图加载完成后渲染标记 ----
  useEffect(() => {
    if (mapLoaded) renderMarkers();
  }, [markers, mapLoaded, renderMarkers]);

  // ---- 更新热力图数据 ----
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource('markers-heatmap');
    if (!source) {
      console.error('热力图数据源不存在！');
      return;
    }

    const features = markers.map(m => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
      properties: { photoCount: m.photoCount ?? m.photos?.length ?? 1 }
    }));
    source.setData({ type: 'FeatureCollection', features });
  }, [markers, mapLoaded]);

  // ---- 切换热力图显示 ----
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const layer = mapRef.current.getLayer('markers-heat');
    if (!layer) {
      console.error('热力图图层不存在！');
      return;
    }

    console.log('切换热力图模式:', heatmapMode);
    try {
      mapRef.current.setLayoutProperty('markers-heat', 'visibility', heatmapMode ? 'visible' : 'none');
      console.log('热力图可见性已设置为:', heatmapMode ? 'visible' : 'none');

      // 热力图模式下完全隐藏标记点
      Object.values(mapMarkersRef.current).forEach(m => {
        m.getElement().style.display = heatmapMode ? 'none' : 'flex';
      });
      console.log('标记点显示状态已更新');
    } catch (error) {
      console.error('切换热力图时出错:', error);
    }
  }, [heatmapMode, mapLoaded]);

  // ---- 预览图钉 ----
  useEffect(() => {
    if (!mapRef.current) return;

    if (previewMarkerRef.current) {
      previewMarkerRef.current.remove();
      previewMarkerRef.current = null;
    }

    if (previewPin) {
      const el = createMarkerEl('#00b894');
      previewMarkerRef.current = new window.mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([previewPin.lng, previewPin.lat])
        .addTo(mapRef.current);
    }
  }, [previewPin, createMarkerEl]);

  // ---- 地图工具函数 ----
  const goToMyLocation = useCallback(() => {
    if (mapRef.current && userLocationRef.current) {
      mapRef.current.flyTo({ center: userLocationRef.current, zoom: 15, duration: 1000 });
    }
  }, []);

  const zoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => mapRef.current?.zoomOut(), []);

  // ---- 测量模式 ----
  const exitMeasureMode = useCallback(() => {
    setMeasureMode(false);
    measureModeRef.current = false;
    measureStartRef.current = null;
    setMeasureStart(null);
  }, []);

  const clearMeasureLines = useCallback(() => {
    setMeasureLines([]);
  }, []);

  const toggleMeasureMode = useCallback(() => {
    setMeasureMode(prev => {
      if (prev) {
        // 正在关闭
        measureModeRef.current = false;
        measureStartRef.current = null;
        setMeasureStart(null);
        setMeasureLines([]);
      }
      return !prev;
    });
  }, []);

  return {
    // 状态
    mapboxReady,
    mapEntered,
    mapLoaded,
    isDragging,
    heatmapMode,
    measureMode,
    measureStart,
    measureLines,
    viewportVersion,
    // Refs
    mapContainerRef,
    mapRef,
    mapMarkersRef,
    userLocationRef,
    // 状态设置函数
    setMapboxReady,
    setMapEntered,
    setMapLoaded,
    setIsDragging,
    setHeatmapMode,
    setMeasureMode,
    setMeasureStart,
    setMeasureLines,
    setViewportVersion,
    // 操作函数
    fetchPlaceName,
    renderMarkers,
    goToMyLocation,
    zoomIn,
    zoomOut,
    toggleMeasureMode,
    exitMeasureMode,
    clearMeasureLines,
  };
}

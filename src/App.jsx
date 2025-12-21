import { useState, useEffect, useRef, useCallback, useMemo, memo, useDeferredValue, lazy, Suspense } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FixedSizeList as VirtualList } from 'react-window';
import { photoUrlCache, thumbnailCache } from './utils/LRUCache.ts';
import { startPeriodicCleanup, stopPeriodicCleanup } from './utils/memoryManager.ts';
import PhotoViewer from './components/PhotoViewer.jsx';
import PhotoEditor from './components/PhotoEditor.jsx';
import MemoryMonitor from './components/MemoryMonitor.jsx';
import ErrorBoundary, { withErrorBoundary, NetworkErrorBoundary, AsyncErrorBoundary } from './components/ErrorBoundary.jsx';
import { useSEO } from './utils/seoManager.js';
import { useAnalytics } from './utils/webAnalytics.js';
import { usePWA } from './utils/pwaManager.js';

// 如果是Web版本，导入Web样式
if (!window.electronAPI) {
  import('../src-web/web-styles.css');
}

import { createPortal } from 'react-dom';

// Web 版本下载按钮组件
const WebDownloadButton = () => {
  const [show, setShow] = useState(false);
  const os = navigator.userAgent.includes('Mac') ? 'mac' : navigator.userAgent.includes('Linux') ? 'linux' : 'windows';
  const dl = {
    windows: { name: 'Windows', file: 'photo-map-setup-1.0.0.exe', size: '~85MB' },
    mac: { name: 'macOS', file: 'photo-map-1.0.0.dmg', size: '~90MB' },
    linux: { name: 'Linux', file: 'photo-map-1.0.0.AppImage', size: '~88MB' }
  };

  const features = [
    { icon: '⚡', text: '更快的性能和响应速度' },
    { icon: '💾', text: '本地存储，数据更安全' },
    { icon: '📴', text: '离线使用，无需网络' },
    { icon: '🖼️', text: '更好的图片处理能力' }
  ];

  const modal = show ? createPortal(
    <div
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}
      onClick={() => setShow(false)}
    >
      <div
        style={{ background: '#fff', borderRadius: '12px', width: '360px', maxWidth: '90vw', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#111' }}>下载桌面版</h2>
            <button onClick={() => setShow(false)} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#9ca3af', cursor: 'pointer', padding: 0 }}>×</button>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6b7280' }}>获得更好的使用体验</p>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ marginBottom: '16px' }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', fontSize: '13px', color: '#374151' }}>
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '14px', color: '#111' }}>{dl[os].name}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>{dl[os].size}</div>
              </div>
              <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '11px', padding: '3px 6px', borderRadius: '4px', fontWeight: 500 }}>推荐</span>
            </div>
            <a
              href={`/downloads/${dl[os].file}`}
              download
              style={{ display: 'block', background: '#111', color: '#fff', textAlign: 'center', padding: '10px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}
            >
              立即下载
            </a>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
            {Object.entries(dl).filter(([k]) => k !== os).map(([k, v]) => (
              <a key={k} href={`/downloads/${v.file}`} download style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'underline' }}>
                {v.name}
              </a>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '12px 20px', textAlign: 'center' }}>
          <a href="https://github.com/Satulalala/photo-map" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none' }}>
            GitHub →
          </a>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <style>{`
        @keyframes subtle-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .web-dl-btn-dark {
          background: #111;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          animation: subtle-pulse 3s ease-in-out infinite;
          transition: transform 0.15s, opacity 0.15s;
        }
        .web-dl-btn-dark:hover {
          transform: scale(1.03);
          opacity: 0.9;
        }
      `}</style>
      <button onClick={() => setShow(true)} className="web-dl-btn-dark">⬇ 桌面版</button>
      {modal}
    </>
  );
};



// 导入简洁加载器
import MinimalLoader from './components/MinimalLoader.jsx';

// 简洁优雅的加载动画
const FilmLoader = ({ onComplete }) => {
  return <MinimalLoader onComplete={onComplete} />;
};

// 懒加载组件 - 减少首屏 JS 体积，按需加载
const SettingsPanel = lazy(() => import('./components/SettingsPanel.jsx'));

// 加载占位组件
const LoadingFallback = () => (
  <div style={{ 
    position: 'fixed', inset: 0, 
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.5)', zIndex: 9999 
  }}>
    <div style={{ 
      background: 'white', padding: '20px 40px', borderRadius: '12px',
      display: 'flex', alignItems: 'center', gap: '12px'
    }}>
      <span className="loading-spinner"></span>
      加载中...
    </div>
  </div>
);

// 懒加载缩略图组件（使用缩略图，更快更省内存）- 使用 memo 避免重复渲染
const LazyPhoto = memo(function LazyPhoto({ photo, className, alt = '', useThumbnail = true }) {
  const [src, setSrc] = useState('');
  
  useEffect(() => {
    if (!photo) return;
    // 旧格式：直接是base64
    if (typeof photo === 'string') { setSrc(photo); return; }
    if (photo.data?.startsWith('data:')) { setSrc(photo.data); return; }
    // 新格式：从文件加载（优先使用缩略图，使用 LRU 缓存）
    if (photo.id && window.electronAPI) {
      const cache = useThumbnail ? thumbnailCache : photoUrlCache;
      const cacheKey = useThumbnail ? photo.id.replace(/\.[^.]+$/, '.webp') : photo.id;
      
      // 检查缓存
      const cached = cache.get(cacheKey);
      if (cached) { setSrc(cached); return; }
      
      // 从文件加载
      const getUrl = useThumbnail && window.electronAPI.getThumbnailUrl 
        ? window.electronAPI.getThumbnailUrl 
        : window.electronAPI.getPhotoUrl;
      getUrl(photo.id).then(url => {
        if (url) {
          cache.set(cacheKey, url);
          setSrc(url);
        }
      });
    }
  }, [photo, useThumbnail]);
  
  if (!src) return <div className={className} style={{ background: '#f0f0f0' }} />;
  return <img src={src} alt={alt} className={className} loading="lazy" />;
});

// 标记列表项组件 - 使用 memo 避免重复渲染
const MarkerListItem = memo(function MarkerListItem({ marker, onClick }) {
  return (
    <div className="marker-list-item" onClick={onClick}>
      {(marker.firstPhoto || marker.photos?.[0]) && (
        <LazyPhoto photo={marker.firstPhoto || marker.photos[0]} className="marker-list-thumb" />
      )}
      <div className="marker-list-info">
        <div className="marker-list-name">
          {marker.name || `${marker.lat.toFixed(3)}°, ${marker.lng.toFixed(3)}°`}
        </div>
        <div className="marker-list-meta">
          📷 {marker.photoCount ?? marker.photos?.length ?? 0} 张 · {marker.createdAt ? new Date(marker.createdAt).toLocaleDateString('zh-CN') : '未知时间'}
        </div>
      </div>
    </div>
  );
});

// 安全的 Mapbox 初始化
const initMapbox = () => {
  if (typeof window !== 'undefined' && window.mapboxgl) {
    window.mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoiZm43cXAiLCJhIjoiY21peTUyd3B5MGJqMTNjcTU4aDVtdnNqNiJ9.TadVpAbhvEATQxuflxmqdA';
    return window.mapboxgl;
  }
  return null;
};

const mapboxgl = initMapbox();

// GCJ-02 转 WGS-84 坐标转换（高德坐标 → Mapbox坐标）
const gcj02ToWgs84 = (lng, lat) => {
  const PI = Math.PI;
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  
  const transformLat = (x, y) => {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
    return ret;
  };
  
  const transformLng = (x, y) => {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
  };
  
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI);
  dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);
  
  return { lng: lng - dLng, lat: lat - dLat };
};

function App() {
  // Web 优化功能 Hooks
  const seo = useSEO();
  const analytics = useAnalytics();
  const pwa = usePWA();

  // Mapbox 加载检查
  const [mapboxReady, setMapboxReady] = useState(false);
  
  useEffect(() => {
    const checkMapbox = () => {
      if (typeof window !== 'undefined' && window.mapboxgl) {
        setMapboxReady(true);
      } else {
        // 如果 Mapbox 还没加载，等待一下再检查
        setTimeout(checkMapbox, 100);
      }
    };
    checkMapbox();
  }, []);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [cursorInfo, setCursorInfo] = useState({ lat: 0, lng: 0, x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState(null);
  const [markerMenu, setMarkerMenu] = useState(null);
  const [previewPin, setPreviewPin] = useState(null);
  const [placeName, setPlaceName] = useState('');
  const [locateProgress, setLocateProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('map'); // map, performance, storage, about
  const [measureMode, setMeasureMode] = useState(false);
  const [photoViewer, setPhotoViewer] = useState(null); // { photos: [], index: 0, markerId }
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(''); // 当前查看的照片URL
  const [photoInfo, setPhotoInfo] = useState(null); // 当前照片的详细信息
  const [showPhotoInfo, setShowPhotoInfo] = useState(false); // 是否显示照片信息面板
  const [mapLoaded, setMapLoaded] = useState(false); // 地图是否加载完成
  const [noteEditor, setNoteEditor] = useState(null); // { markerId, photoIndex, note }
  const [notesPanel, setNotesPanel] = useState(null); // { markerId, marker, returnToMenu }
  const [notesEditing, setNotesEditing] = useState(false); // 备注面板是否处于编辑模式
  const [editingNotes, setEditingNotes] = useState([]); // 编辑中的备注临时数据
  const [cacheStats, setCacheStats] = useState({ count: 0, size: 0 }); // 瓦片缓存统计
  const [isDragging, setIsDragging] = useState(false); // 是否正在拖动地图
  const [photoTransformed, setPhotoTransformed] = useState(false); // 照片是否被缩放/拖动
  const [showMarkerList, setShowMarkerList] = useState(false); // 标记列表面板
  const [markerListSort, setMarkerListSort] = useState('time'); // 排序方式: time, name
  const [markerListSearch, setMarkerListSearch] = useState(''); // 搜索关键词
  const [noteSearchResults, setNoteSearchResults] = useState([]); // 备注搜索结果
  const [isNoteSearching, setIsNoteSearching] = useState(false); // 是否正在搜索备注
  const [isDragOver, setIsDragOver] = useState(false); // 是否正在拖拽文件到菜单
  const [isMarkerDragOver, setIsMarkerDragOver] = useState(false); // 是否正在拖拽文件到标记菜单
  const [searchQuery, setSearchQuery] = useState(''); // 地图搜索关键词
  const deferredSearchQuery = useDeferredValue(searchQuery); // 延迟搜索值，避免输入卡顿
  const [searchResults, setSearchResults] = useState([]); // 搜索结果
  const [showSearchResults, setShowSearchResults] = useState(false); // 是否显示搜索结果
  const [isSearching, setIsSearching] = useState(false); // 是否正在搜索
  const [searchHistory, setSearchHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('searchHistory') || '[]'); } catch { return []; }
  }); // 搜索历史
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1); // 键盘选中的结果索引
  const searchInputRef = useRef(null); // 搜索输入框引用
  const [toast, setToast] = useState(null); // { type: 'success'|'error'|'info', message }
  const [markersLoading, setMarkersLoading] = useState(true); // 标记是否正在加载
  const [heatmapMode, setHeatmapMode] = useState(false); // 热力图模式
  const [newMarkerIds, setNewMarkerIds] = useState(new Set()); // 新添加的标记ID（用于入场动画）
  const [viewportVersion, setViewportVersion] = useState(0); // 视口版本号，用于触发标记更新
  const [photoEditor, setPhotoEditor] = useState(null); // 照片编辑器 { photoId, photoUrl }
  
  // 性能设置 - 从 localStorage 读取
  // 平滑缩放配置
  const defaultSettings = {
    antialias: true,          // 抗锯齿 = 更平滑
    fadeDuration: 200,        // 瓦片淡入 = 减少顿挫
    maxTileCacheSize: 4000,   // 大缓存 = 更流畅
    dragRotate: false,        // 禁用旋转
    renderWorldCopies: false, // 禁用世界副本
    maxZoom: 18,              // 最大缩放
    minZoom: 0,               // 最小缩放
  };
  const [mapSettings, setMapSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('mapSettings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });
  const [tempSettings, setTempSettings] = useState(mapSettings); // 临时设置（未保存）
  const [measureStart, setMeasureStart] = useState(null);
  const [measureLines, setMeasureLines] = useState([]);
  
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapMarkersRef = useRef({});
  const previewMarkerRef = useRef(null);
  const markersStateRef = useRef(markers);
  const userLocationRef = useRef(null);
  const measureModeRef = useRef(false);
  const measureStartRef = useRef(null);

  useEffect(() => { markersStateRef.current = markers; }, [markers]);

  // 获取照片URL（支持新旧格式，使用 LRU 缓存）
  const getPhotoUrl = useCallback(async (photo) => {
    if (!photo) return null;
    // 旧格式：直接是base64字符串
    if (typeof photo === 'string') return photo;
    // 旧格式：photo.data 是 base64
    if (photo.data && photo.data.startsWith('data:')) return photo.data;
    // 新格式：photo.id 是文件名
    const photoId = photo.id;
    if (!photoId) return null;
    // 检查 LRU 缓存
    const cached = photoUrlCache.get(photoId);
    if (cached) return cached;
    // 从文件获取URL
    if (window.electronAPI) {
      const url = await window.electronAPI.getPhotoUrl(photoId);
      if (url) photoUrlCache.set(photoId, url);
      return url;
    }
    return null;
  }, []);

  // 同步获取照片URL（用于已缓存的情况）
  const getPhotoUrlSync = useCallback((photo) => {
    if (!photo) return '';
    if (typeof photo === 'string') return photo;
    if (photo.data && photo.data.startsWith('data:')) return photo.data;
    const photoId = photo.id;
    return photoUrlCache.get(photoId) || '';
  }, []);

  // 计算总照片数 - 使用 useMemo 避免重复计算
  // 数据库版本使用 photoCount 字段，旧版本使用 photos.length
  const totalPhotos = useMemo(() => 
    markers.reduce((sum, m) => sum + (m.photoCount ?? m.photos?.length ?? 0), 0), 
    [markers]
  );

  // 加载当前查看的照片
  useEffect(() => {
    if (photoViewer && photoViewer.photos[photoViewer.index]) {
      getPhotoUrl(photoViewer.photos[photoViewer.index]).then(url => {
        setCurrentPhotoUrl(url || '');
      });
      
      // 空闲时预加载相邻照片
      const preloadNext = () => {
        const { photos, index } = photoViewer;
        const preloadIndexes = [index + 1, index - 1].filter(i => i >= 0 && i < photos.length);
        preloadIndexes.forEach(i => {
          getPhotoUrl(photos[i]).then(url => {
            if (url) {
              const img = new Image();
              img.src = url;
            }
          });
        });
      };
      
      // 使用 requestIdleCallback 在空闲时预加载
      if ('requestIdleCallback' in window) {
        requestIdleCallback(preloadNext, { timeout: 1000 });
      } else {
        setTimeout(preloadNext, 100);
      }
    } else {
      setCurrentPhotoUrl('');
      setPhotoInfo(null);
    }
  }, [photoViewer, getPhotoUrl]);

  // 加载当前照片的详细信息
  useEffect(() => {
    if (photoViewer && photoViewer.photos[photoViewer.index]) {
      const photo = photoViewer.photos[photoViewer.index];
      if (photo?.id && window.electronAPI?.getPhotoInfo) {
        window.electronAPI.getPhotoInfo(photo.id).then(info => {
          setPhotoInfo(info);
        });
      } else {
        setPhotoInfo(null);
      }
    }
  }, [photoViewer?.index, photoViewer?.photos]);

  // Toast 提示
  const showToast = useCallback((type, message, duration = 2500) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), duration);
  }, []);

  // 全局快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 忽略输入框中的按键
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // Escape - 关闭所有弹窗
      if (e.key === 'Escape') {
        if (photoViewer) { setPhotoViewer(null); return; }
        if (photoEditor) { setPhotoEditor(null); return; }
        if (showSettings) { setShowSettings(false); return; }
        if (showMarkerList) { setShowMarkerList(false); return; }
        if (markerMenu) { setMarkerMenu(null); return; }
        if (contextMenu) { setContextMenu(null); setPreviewPin(null); return; }
        if (measureMode) { setMeasureMode(false); return; }
      }
      
      // 照片查看器快捷键
      if (photoViewer) {
        if (e.key === 'ArrowLeft' || e.key === 'a') {
          // 上一张
          setPhotoViewer(v => ({ ...v, index: (v.index - 1 + v.photos.length) % v.photos.length }));
          setPhotoTransformed(false);
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
          // 下一张
          setPhotoViewer(v => ({ ...v, index: (v.index + 1) % v.photos.length }));
          setPhotoTransformed(false);
        }
        return;
      }
      
      // 地图快捷键（无弹窗时）
      if (!showSettings && !showMarkerList && !markerMenu && !contextMenu) {
        // F - 聚焦搜索框
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
        // M - 打开标记列表
        else if (e.key === 'm' || e.key === 'M') {
          setShowMarkerList(true);
        }
        // H - 切换热力图
        else if (e.key === 'h' || e.key === 'H') {
          setHeatmapMode(v => !v);
        }
        // S - 打开设置
        else if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
          setShowSettings(true);
        }
        // R - 测量模式
        else if (e.key === 'r' || e.key === 'R') {
          setMeasureMode(v => !v);
        }
        // + / = 放大地图
        else if (e.key === '+' || e.key === '=') {
          mapRef.current?.zoomIn();
        }
        // - 缩小地图
        else if (e.key === '-') {
          mapRef.current?.zoomOut();
        }
        // 0 - 重置视图到用户位置
        else if (e.key === '0') {
          if (userLocationRef.current && mapRef.current) {
            mapRef.current.flyTo({ center: userLocationRef.current, zoom: 13, duration: 1000 });
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photoViewer, photoEditor, showSettings, showMarkerList, markerMenu, contextMenu, measureMode]);

  useEffect(() => {
    // 启动定时内存清理
    startPeriodicCleanup();
    
    if (window.electronAPI) {
      setMarkersLoading(true);
      window.electronAPI.loadMarkers().then(loaded => {
        // 数据库返回轻量版标记（含 photoCount 和 firstPhoto）
        setMarkers(loaded);
        setMarkersLoading(false);
        
        // 后台为没有地名的旧标记补充地名
        const needName = loaded.filter(m => !m.name);
        if (needName.length > 0) {
          Promise.all(needName.map(async m => {
            try {
              const res = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${m.lng},${m.lat}.json?access_token=${window.mapboxgl?.accessToken}&language=zh&limit=1`
              );
              const data = await res.json();
              if (data.features?.[0]) {
                let place = data.features[0].place_name_zh || data.features[0].place_name || '';
                const name = place.replace(/\s*\d{5,6}\s*$/, '').replace(/,\s*$/, '');
                // 更新数据库
                window.electronAPI.updateMarker({ id: m.id, lat: m.lat, lng: m.lng, name });
                return { id: m.id, name };
              }
            } catch {}
            return null;
          })).then(results => {
            const nameMap = {};
            results.forEach(r => { if (r) nameMap[r.id] = r.name; });
            if (Object.keys(nameMap).length > 0) {
              setMarkers(prev => prev.map(m => nameMap[m.id] ? { ...m, name: nameMap[m.id] } : m));
            }
          });
        }
      });
      window.electronAPI.getCacheStats().then(setCacheStats);
    }
    
    // 组件卸载时停止定时清理
    return () => {
      stopPeriodicCleanup();
    };
  }, []);

  // Web 优化功能初始化
  useEffect(() => {
    if (!window.electronAPI) {
      // 只在 Web 版本中初始化

      // 初始化 SEO
      seo.updateSEO({
        title: '地图相册',
        description: '一个优雅的照片地图应用，帮助您在地图上标记和管理照片，记录旅行足迹，分享美好回忆。',
        keywords: '地图相册,照片地图,GPS照片,旅行记录,位置标记,照片管理'
      });

      // 跟踪页面浏览
      analytics.trackPage('/', '地图相册 - 首页');

      // 跟踪应用启动
      analytics.trackEvent('app_start', {
        version: '1.0.0',
        platform: 'web',
        userAgent: navigator.userAgent,
        language: navigator.language,
        screenResolution: `${screen.width}x${screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`
      });

      // 跟踪性能指标
      setTimeout(() => {
        analytics.trackPerformance();
      }, 2000);

      console.log('✅ Web optimization features initialized');
    }
  }, [seo, analytics]);

  // IP定位 - 快速超时
  useEffect(() => {
    let progress = 0;
    const progressTimer = setInterval(() => {
      progress += Math.random() * 35 + 20;
      if (progress > 95) progress = 95;
      setLocateProgress(progress);
    }, 25);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5秒超时

    // 使用高德 IP 定位 API
    fetch(`https://restapi.amap.com/v3/ip?key=9fb3c3f43537ecacd6d0a082958a883c`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        clearTimeout(timeoutId);
        if (d.status === '1' && d.rectangle) {
          // rectangle 格式: "lng1,lat1;lng2,lat2"，取中心点
          const [p1, p2] = d.rectangle.split(';').map(p => p.split(',').map(Number));
          const lng = (p1[0] + p2[0]) / 2;
          const lat = (p1[1] + p2[1]) / 2;
          userLocationRef.current = [lng, lat];
          console.log('高德IP定位:', d.city, [lng, lat]);
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
      })
      .finally(() => {
        if (!userLocationRef.current) {
          userLocationRef.current = [117.28, 31.86]; // 默认合肥
        }
        clearInterval(progressTimer);
        setLocateProgress(100);
      });
  }, []);


  // 初始化 Mapbox GL 地图
  useEffect(() => {
    if (!isLoggedIn || !mapContainerRef.current || mapRef.current || !mapboxReady) return;

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
      const map = new window.mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: userLocation,
        zoom: initialZoom,
        pitch: 0,
        projection: 'globe',
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

    // 鼠标移动 - 使用节流优化
    let lastMove = 0;
    map.on('mousemove', (e) => {
      const now = Date.now();
      if (now - lastMove < 16) return; // 约60fps
      lastMove = now;
      setCursorInfo({ 
        lat: e.lngLat.lat, 
        lng: e.lngLat.lng, 
        x: e.point.x, 
        y: e.point.y 
      });
    });

    // 点击事件
    map.on('click', (e) => {
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
      
      // 判断是否在中国境内（粗略范围）
      const isInChina = latlng.lng >= 73 && latlng.lng <= 135 && latlng.lat >= 18 && latlng.lat <= 54;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      if (isInChina) {
        // 国内用高德 API
        fetch(`https://restapi.amap.com/v3/geocode/regeo?key=9fb3c3f43537ecacd6d0a082958a883c&location=${latlng.lng},${latlng.lat}&extensions=base`, 
          { signal: controller.signal }
        )
          .then(r => r.json())
          .then(data => {
            clearTimeout(timeoutId);
            if (data.status === '1' && data.regeocode?.formatted_address) {
              setPlaceName(data.regeocode.formatted_address);
            }
          })
          .catch(() => clearTimeout(timeoutId));
      } else {
        // 国外用 Mapbox API（简体中文）
        fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${latlng.lng},${latlng.lat}.json?access_token=${window.mapboxgl?.accessToken}&language=zh-Hans&limit=1`, 
          { signal: controller.signal }
        )
          .then(r => r.json())
          .then(data => {
            clearTimeout(timeoutId);
            if (data.features?.[0]) {
              let place = data.features[0].place_name || '';
              place = place.replace(/\s*\d{5,6}\s*$/, '').replace(/,\s*$/, '');
              if (place) setPlaceName(place);
            }
          })
          .catch(() => clearTimeout(timeoutId));
      }
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
        maxzoom: 18,  // 允许更高缩放级别
        layout: { visibility: 'none' },
        paint: {
          // 权重：照片越多，热力越强
          'heatmap-weight': [
            'interpolate', ['linear'], ['get', 'photoCount'],
            1, 0.4,   // 1张照片
            5, 0.7,   // 5张照片
            10, 0.9,  // 10张照片
            20, 1.0   // 20张及以上
          ],
          // 强度随缩放级别变化（低缩放时增强强度）
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 2, 5, 1.5, 10, 2, 15, 3],
          // 热力图颜色渐变（蓝→青→黄→橙→红）
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
          // 半径：低缩放时更大半径，确保可见
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

    // 瓦片缓存已移除 - 避免重复请求导致加载变慢
    // Mapbox GL 自带内存缓存，无需额外处理

      mapRef.current = map;
      return () => { map.remove(); mapRef.current = null; };
    } catch (error) {
      console.error('地图初始化失败:', error);
      // 可以在这里显示错误提示给用户
    }
  }, [isLoggedIn, mapboxReady]);

  // 简单距离计算（Haversine公式）
  const turf_distance = (from, to) => {
    const R = 6371;
    const dLat = (to[1] - from[1]) * Math.PI / 180;
    const dLon = (to[0] - from[0]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(from[1] * Math.PI / 180) * Math.cos(to[1] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };


  // 创建标记元素（带照片预览）
  const createMarkerEl = useCallback((color, photos = []) => {
    const el = document.createElement('div');
    el.className = 'marker-pin';
    
    if (photos.length > 0) {
      // 有照片：显示照片缩略图 + 图钉
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
      // 异步加载第一张照片
      getPhotoUrl(photos[0]).then(url => {
        const img = el.querySelector('img');
        if (img && url) img.src = url;
      });
    } else {
      // 无照片：只显示图钉
      el.style.width = '24px';
      el.style.height = '32px';
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="${color}"/><circle cx="12" cy="12" r="5" fill="white"/></svg>`;
    }
    el.style.cursor = 'pointer';
    return el;
  }, [getPhotoUrl]);

  // 缩略图URL缓存
  const thumbCache = useRef({});

  // 创建带预览图的标记元素
  const createMarkerWithPhoto = useCallback((photoId, photoCount) => {
    const el = document.createElement('div');
    el.className = 'marker-pin';
    el.style.cssText = 'cursor:pointer;display:flex;flex-direction:column;align-items:center;';
    
    if (photoId) {
      // 有照片：显示缩略图 + 图钉
      el.innerHTML = `
        <div class="marker-photo-preview" style="width:48px;height:48px;border-radius:6px;overflow:hidden;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);background:#f0f0f0;margin-bottom:2px;position:relative;">
          <img src="" style="width:100%;height:100%;object-fit:cover;display:block;" />
          ${photoCount > 1 ? `<span style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.6);color:white;font-size:10px;padding:1px 4px;border-radius:8px;">+${photoCount - 1}</span>` : ''}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="26" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#ff6b6b"/><circle cx="12" cy="12" r="4" fill="white"/></svg>
      `;
      
      // 异步加载缩略图
      const img = el.querySelector('img');
      if (window.electronAPI?.getThumbnailUrl) {
        window.electronAPI.getThumbnailUrl(photoId).then(url => {
          if (url) img.src = url;
        });
      }
    } else {
      // 无照片：只显示图钉
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#ff6b6b"/><circle cx="12" cy="12" r="5" fill="white"/></svg>`;
    }
    return el;
  }, []);

  // 创建单个标记元素
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
      
      // 加载缩略图
      const img = el.querySelector('img');
      if (img) {
        // 如果有 base64 数据，直接使用
        if (firstPhoto.data && firstPhoto.data.startsWith('data:')) {
          img.onload = () => { img.style.opacity = '1'; };
          img.src = firstPhoto.data;
        } 
        // 否则通过 API 获取
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
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#ff6b6b"/><circle cx="12" cy="12" r="5" fill="white"/></svg>`;
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
    
    return el;
  }, []);

  // 渲染所有标记
  const renderMarkers = useCallback(() => {
    if (!mapRef.current) return;
    
    // 清除旧标记
    Object.values(mapMarkersRef.current).forEach(m => m.remove());
    mapMarkersRef.current = {};
    
    // 创建所有标记
    markers.forEach(m => {
      const isNew = newMarkerIds.has(m.id);
      const el = createMarkerElement(m, isNew);
      const marker = new window.mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([m.lng, m.lat])
        .addTo(mapRef.current);
      mapMarkersRef.current[m.id] = marker;
      
      // 热力图模式下隐藏
      if (heatmapMode) {
        el.style.display = 'none';
      }
    });
  }, [markers, newMarkerIds, createMarkerElement, heatmapMode]);

  // 地图加载完成后渲染标记
  useEffect(() => {
    if (mapLoaded) renderMarkers();
  }, [markers, mapLoaded, renderMarkers, newMarkerIds]);

  // 更新热力图数据
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource('markers-heatmap');
    if (!source) return;
    
    const features = markers.map(m => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
      properties: { photoCount: m.photoCount ?? m.photos?.length ?? 1 }
    }));
    source.setData({ type: 'FeatureCollection', features });
  }, [markers, mapLoaded]);

  // 切换热力图显示
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const layer = mapRef.current.getLayer('markers-heat');
    if (!layer) return;
    
    mapRef.current.setLayoutProperty('markers-heat', 'visibility', heatmapMode ? 'visible' : 'none');
    // 热力图模式下完全隐藏标记点
    Object.values(mapMarkersRef.current).forEach(m => {
      m.getElement().style.display = heatmapMode ? 'none' : 'flex';
    });
  }, [heatmapMode, mapLoaded]);

  // 预览图钉
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

  // 刷新标记列表（从数据库重新加载）
  const refreshMarkers = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.loadMarkers().then(setMarkers);
    }
  }, []);

  // 获取地名（国内用高德，国外用 Mapbox）
  const fetchPlaceName = useCallback(async (lat, lng) => {
    const isInChina = lng >= 73 && lng <= 135 && lat >= 18 && lat <= 54;
    
    try {
      if (isInChina) {
        // 国内用高德 API
        const res = await fetch(
          `https://restapi.amap.com/v3/geocode/regeo?key=9fb3c3f43537ecacd6d0a082958a883c&location=${lng},${lat}&extensions=base`,
          { signal: AbortSignal.timeout(3000) }
        );
        const data = await res.json();
        if (data.status === '1' && data.regeocode?.formatted_address) {
          return data.regeocode.formatted_address;
        }
      } else {
        // 国外用 Mapbox API（简体中文）
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${window.mapboxgl?.accessToken}&language=zh-Hans&limit=1`,
          { signal: AbortSignal.timeout(3000) }
        );
        const data = await res.json();
        if (data.features?.[0]) {
          let place = data.features[0].place_name || '';
          return place.replace(/\s*\d{5,6}\s*$/, '').replace(/,\s*$/, '');
        }
      }
    } catch {}
    return `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
  }, []);

  // 添加照片标记（必须选择照片）
  const addPhotoMarker = async (latlng) => {
    if (!window.electronAPI) return;
    
    // 选择照片（返回文件ID）
    const photos = await window.electronAPI.selectPhotos();
    if (!photos || photos.length === 0) return;
    
    // 获取地名
    const name = await fetchPlaceName(latlng.lat, latlng.lng);
    
    // 创建标记
    const newMarker = {
      id: uuidv4(),
      lat: latlng.lat,
      lng: latlng.lng,
      name,
      photos: photos.map(p => ({ id: p.id, data: p.data, note: '' })),
      photoCount: photos.length,
      firstPhoto: photos[0] ? { id: photos[0].id, data: photos[0].data } : null,
      createdAt: Date.now()
    };
    
    // 保存到数据库
    await window.electronAPI.addMarker(newMarker);
    // 标记为新标记（触发入场动画）
    setNewMarkerIds(prev => new Set(prev).add(newMarker.id));
    setTimeout(() => setNewMarkerIds(prev => { const s = new Set(prev); s.delete(newMarker.id); return s; }), 600);
    refreshMarkers();
    setContextMenu(null);
    setPreviewPin(null);
    showToast('success', `已添加 ${photos.length} 张照片`);
  };
  
  // 保存照片备注
  const savePhotoNote = async (markerId, photoIndex, note) => {
    if (window.electronAPI) {
      await window.electronAPI.updatePhotoNote(markerId, photoIndex, note);
      showToast('success', '备注已保存');
    }
    setNoteEditor(null);
  };
  
  // 获取照片备注
  const getPhotoNote = useCallback((photo) => typeof photo === 'string' ? '' : (photo.note || ''), []);

  const closeContextMenu = useCallback(() => { 
    setContextMenu(null); 
    setPreviewPin(null); 
    setMarkerMenu(null); 
  }, []);

  const deleteMarkerById = useCallback(async (id) => {
    if (window.electronAPI) {
      await window.electronAPI.deleteMarker(id);
      refreshMarkers();
      showToast('success', '标记已删除');
    }
  }, [refreshMarkers, showToast]);



  const goToMyLocation = useCallback(() => {
    if (mapRef.current && userLocationRef.current) {
      mapRef.current.flyTo({ center: userLocationRef.current, zoom: 15, duration: 1000 });
    }
  }, []);

  const zoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => mapRef.current?.zoomOut(), []);
  
  // 计算两点距离（km）
  const calcDistance = useCallback((lng1, lat1, lng2, lat2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }, []);

  // 高德地图 Web服务 API Key
  const AMAP_KEY = '9fb3c3f43537ecacd6d0a082958a883c';
  
  // 搜索地名 - 高德 POI 搜索 + 输入提示 + 地理编码
  const searchPlace = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    setSelectedResultIndex(-1);
    
    try {
      const center = mapRef.current?.getCenter() || { lng: 117, lat: 32 };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      let results = [];
      
      // 1. 使用输入提示 API（更精确，支持模糊匹配）
      const tipRes = await fetch(
        `https://restapi.amap.com/v3/assistant/inputtips?key=${AMAP_KEY}&keywords=${encodeURIComponent(query)}&location=${center.lng},${center.lat}&datatype=all`,
        { signal: controller.signal }
      );
      const tipData = await tipRes.json();
      
      if (tipData.status === '1' && tipData.tips?.length > 0) {
        // 过滤掉没有坐标的结果
        const validTips = tipData.tips.filter(t => t.location && t.location.includes(','));
        results = validTips.slice(0, 10).map(tip => {
          const [gcjLng, gcjLat] = tip.location.split(',').map(Number);
          // GCJ-02 转 WGS-84
          const { lng, lat } = gcj02ToWgs84(gcjLng, gcjLat);
          const dist = calcDistance(center.lng, center.lat, lng, lat);
          return {
            name: tip.name,
            address: tip.district || tip.address || '',
            type: tip.typecode || '',
            lng, lat,
            distance: dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`
          };
        });
      }
      
      // 2. 如果输入提示没结果，用 POI 搜索
      if (results.length === 0) {
        const poiRes = await fetch(
          `https://restapi.amap.com/v3/place/text?key=${AMAP_KEY}&keywords=${encodeURIComponent(query)}&offset=10&extensions=base`,
          { signal: controller.signal }
        );
        const poiData = await poiRes.json();
        
        if (poiData.status === '1' && poiData.pois?.length > 0) {
          results = poiData.pois.map(poi => {
            const [gcjLng, gcjLat] = poi.location.split(',').map(Number);
            // GCJ-02 转 WGS-84
            const { lng, lat } = gcj02ToWgs84(gcjLng, gcjLat);
            const dist = calcDistance(center.lng, center.lat, lng, lat);
            return {
              name: poi.name,
              address: (poi.pname || '') + (poi.cityname || '') + (poi.adname || ''),
              type: poi.type || '',
              lng, lat,
              distance: dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`
            };
          });
        }
      }
      
      // 3. 如果还没结果，用地理编码（搜索城市/地区名）
      if (results.length === 0) {
        const geoRes = await fetch(
          `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        const geoData = await geoRes.json();
        
        if (geoData.status === '1' && geoData.geocodes?.length > 0) {
          results = geoData.geocodes.map(geo => {
            const [gcjLng, gcjLat] = geo.location.split(',').map(Number);
            // GCJ-02 转 WGS-84
            const { lng, lat } = gcj02ToWgs84(gcjLng, gcjLat);
            const dist = calcDistance(center.lng, center.lat, lng, lat);
            return {
              name: geo.formatted_address || query,
              address: (geo.province || '') + (geo.city || '') + (geo.district || ''),
              type: 'region',
              lng, lat,
              distance: dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`
            };
          });
        }
      }
      
      clearTimeout(timeoutId);
      setSearchResults(results);
    } catch (e) {
      if (e.name !== 'AbortError') setSearchResults([]);
    }
    
    setIsSearching(false);
  }, [calcDistance]);
  
  // 使用 useDeferredValue 自动处理搜索延迟
  useEffect(() => {
    if (deferredSearchQuery) {
      searchPlace(deferredSearchQuery);
    } else {
      setSearchResults([]);
    }
  }, [deferredSearchQuery, searchPlace]);
  
  // 保存搜索历史
  const saveToHistory = useCallback((result) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.name !== result.name);
      const newHistory = [{ name: result.name, address: result.address, lng: result.lng, lat: result.lat }, ...filtered].slice(0, 10);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);
  
  // 清除搜索历史
  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  }, []);
  
  
  // 旋转照片
  const rotatePhoto = useCallback(async (photoId, degrees) => {
    if (!window.electronAPI?.rotatePhoto) return false;
    const result = await window.electronAPI.rotatePhoto(photoId, degrees);
    if (result) {
      showToast('success', '照片已旋转');
      // 清除 LRU 缓存，强制重新加载
      photoUrlCache.delete(photoId);
      thumbnailCache.delete(photoId.replace(/\.[^.]+$/, '.webp'));
    } else {
      showToast('error', '旋转失败');
    }
    return result;
  }, [showToast]);
  
  // 裁剪照片
  const cropPhoto = useCallback(async (photoId, crop) => {
    if (!window.electronAPI?.cropPhoto) return false;
    const result = await window.electronAPI.cropPhoto(photoId, crop);
    if (result) {
      showToast('success', '照片已裁剪');
      // 清除 LRU 缓存，强制重新加载
      photoUrlCache.delete(photoId);
      thumbnailCache.delete(photoId.replace(/\.[^.]+$/, '.webp'));
    } else {
      showToast('error', '裁剪失败');
    }
    return result;
  }, [showToast]);
  
  const handleSearchInput = (value) => {
    setSearchQuery(value);
    setSelectedResultIndex(-1);
    if (value || searchHistory.length > 0) setShowSearchResults(true);
  };
  
  // 搜索框获得焦点
  const handleSearchFocus = () => {
    if (searchQuery || searchHistory.length > 0) setShowSearchResults(true);
  };
  
  // 键盘导航
  const handleSearchKeyDown = (e) => {
    const items = searchQuery ? searchResults : searchHistory;
    if (!items.length) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedResultIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedResultIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedResultIndex >= 0) {
      e.preventDefault();
      selectSearchResult(items[selectedResultIndex]);
    } else if (e.key === 'Escape') {
      setShowSearchResults(false);
      searchInputRef.current?.blur();
    }
  };
  
  // 选择搜索结果
  const selectSearchResult = useCallback((result) => {
    if (mapRef.current) {
      // 根据类型调整缩放级别
      let zoom = 17; // 默认：POI/地址级别
      if (result.type === 'region' || result.type?.includes('省') || result.type?.includes('市')) {
        zoom = 14; // 省/市级别
      } else if (result.type?.includes('区') || result.type?.includes('县')) {
        zoom = 15; // 区/县级别
      }
      mapRef.current.flyTo({ center: [result.lng, result.lat], zoom, duration: 1500 });
    }
    saveToHistory(result);
    setShowSearchResults(false);
    setSearchQuery(result.name);
    setSelectedResultIndex(-1);
  }, [saveToHistory]);
  
  const exitMeasureMode = () => {
    setMeasureMode(false);
    measureModeRef.current = false;
    measureStartRef.current = null;
    setMeasureStart(null);
  };
  
  const clearMeasureLines = () => {
    setMeasureLines([]);
  };



  // 检测是否为 Web 版本 - 多重检测确保准确性
  const isWebVersion = !window.electronAPI || 
                       window.location.pathname.includes('index-web') ||
                       window.location.port === '3001' ||
                       window.location.hostname.includes('netlify') ||
                       window.location.hostname.includes('vercel');
  
  // 调试信息
  console.log('App 组件渲染 - Web 版本:', isWebVersion, '已登录:', isLoggedIn, '地图已加载:', mapLoaded);
  console.log('window.electronAPI:', window.electronAPI);
  console.log('当前URL:', window.location.href);

  // 如果 Mapbox 还没准备好，只显示加载动画
  if (!mapboxReady) {
    return <FilmLoader onComplete={() => {
      setMapboxReady(true);
      setIsLoggedIn(true);
    }} />;
  }

  // Web 版本样式已在 main-web.jsx 中导入

  return (
      <div className={`app ${isWebVersion ? 'web-app' : ''}`}>
      {/* 加载器覆盖层 - 飞行动画期间保持显示 */}
      {!isLoggedIn && <FilmLoader onComplete={() => {
        setMapboxReady(true);
        setIsLoggedIn(true);
      }} />}
      
      {/* 无边框窗口拖拽区域 */}
      <div className="window-drag-region" />
      
      <div ref={mapContainerRef} className={`map-container ${measureMode ? 'measure-mode' : ''}`} />
      
      {/* 顶部搜索栏 */}
      {!measureMode && (
        <div className="search-bar-container">
          <div className="search-bar" onClick={() => searchInputRef.current?.focus()}>
            <span className="search-icon">🔍</span>
            <input 
              type="text"
              placeholder="搜索地点..."
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={handleSearchFocus}
              onKeyDown={handleSearchKeyDown}
              ref={searchInputRef}
            />
            {searchQuery && (
              <button className="search-clear" onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
                setSearchResults([]);
                setShowSearchResults(false);
                setSelectedResultIndex(-1);
              }}>✕</button>
            )}
          </div>
          
          {/* Web 版本下载按钮 - 搜索栏右侧独立位置 */}
          {isWebVersion && isLoggedIn && (
            <div className="web-download-beside-search">
              <WebDownloadButton />
            </div>
          )}
          
          {/* 搜索结果/历史 */}
          {showSearchResults && (
            <div className="search-results">
              {isSearching ? (
                <div className="search-loading">
                  <span className="loading-spinner"></span>搜索中...
                </div>
              ) : searchQuery && searchResults.length > 0 ? (
                searchResults.map((result, i) => (
                  <div 
                    key={i} 
                    className={`search-result-item ${selectedResultIndex === i ? 'selected' : ''}`}
                    onClick={() => selectSearchResult(result)}
                    onMouseEnter={() => setSelectedResultIndex(i)}
                  >
                    <span className="result-icon">{
                      result.type?.includes('餐饮') ? '🍽️' :
                      result.type?.includes('酒店') || result.type?.includes('住宿') ? '🏨' :
                      result.type?.includes('风景') || result.type?.includes('公园') || result.type?.includes('旅游') ? '🏞️' :
                      result.type?.includes('医疗') || result.type?.includes('医院') ? '🏥' :
                      result.type?.includes('学校') || result.type?.includes('教育') ? '🏫' :
                      result.type?.includes('购物') || result.type?.includes('商场') ? '🛒' :
                      result.type?.includes('交通') || result.type?.includes('站') || result.type?.includes('地铁') ? '🚉' :
                      result.type?.includes('银行') || result.type?.includes('金融') ? '🏦' :
                      result.type?.includes('政府') || result.type?.includes('机关') ? '🏛️' :
                      result.type?.includes('小区') || result.type?.includes('住宅') ? '🏘️' :
                      result.type?.includes('写字楼') || result.type?.includes('公司') ? '🏢' :
                      result.type?.includes('地名') || result.type === 'region' ? '🗺️' : '📍'
                    }</span>
                    <div className="result-info">
                      <div className="result-name">{result.name}</div>
                      <div className="result-address">{result.address}</div>
                    </div>
                    <span className="result-distance">{result.distance}</span>
                  </div>
                ))
              ) : searchQuery ? (
                <div className="search-empty">未找到 "{searchQuery}" 相关地点</div>
              ) : searchHistory.length > 0 ? (
                <>
                  <div className="search-history-header">
                    <span>🕐 搜索历史</span>
                    <button onClick={clearSearchHistory}>清除</button>
                  </div>
                  {searchHistory.map((item, i) => (
                    <div 
                      key={i} 
                      className={`search-result-item history-item ${selectedResultIndex === i ? 'selected' : ''}`}
                      onClick={() => selectSearchResult(item)}
                      onMouseEnter={() => setSelectedResultIndex(i)}
                    >
                      <span className="result-icon">🕐</span>
                      <div className="result-info">
                        <div className="result-name">{item.name}</div>
                        <div className="result-address">{item.address}</div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="search-tip">输入地名、地址搜索</div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* 点击其他地方关闭搜索结果 */}
      {showSearchResults && (
        <div className="search-overlay" onClick={() => setShowSearchResults(false)} />
      )}
      
      {/* 坐标跟随指针 - 各种弹窗打开时隐藏 */}
      {!isDragging && !contextMenu && !markerMenu && !showSettings && !showMarkerList && !photoViewer && !showSearchResults && !notesPanel && !noteEditor && (
        <div 
          className="cursor-info" 
          style={{ 
            left: Math.min(cursorInfo.x + 15, window.innerWidth - 120),
            top: Math.max(cursorInfo.y - 35, 10),
            opacity: cursorInfo.x > 0 ? 1 : 0
          }}
        >
          {cursorInfo.lat.toFixed(3)}°, {cursorInfo.lng.toFixed(3)}°
        </div>
      )}

      {/* 左上角工具栏 */}
      {!measureMode && (
        <div className="toolbar toolbar-left">
          <button onClick={goToMyLocation} data-tooltip="定位">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
          </button>
          <button onClick={() => window.location.reload()} data-tooltip="刷新">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
          </button>
        </div>
      )}

      {/* 右上角工具栏 */}
      {!measureMode && (
        <div className="toolbar toolbar-right">
          <button onClick={zoomIn} data-tooltip="放大">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button onClick={zoomOut} data-tooltip="缩小">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button 
            onClick={() => setHeatmapMode(!heatmapMode)} 
            data-tooltip={heatmapMode ? "关闭热力图" : "热力图"}
            className={heatmapMode ? 'active' : ''}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6" opacity="0.5"/><circle cx="12" cy="12" r="9" opacity="0.25"/></svg>
          </button>
          <button onClick={async () => { 
            setTempSettings(mapSettings); 
            setShowSettings(true);
            if (window.electronAPI) {
              const stats = await window.electronAPI.getCacheStats();
              setCacheStats(stats);
            }
          }} data-tooltip="设置" className="settings-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      )}

      {/* 右下角统计按钮 */}
      {!measureMode && (
        <button 
          className="marker-count-btn"
          onClick={() => setShowMarkerList(true)}
          title="查看所有标记和搜索备注"
        >
          📌 {markers.length} · 📷 {totalPhotos}
        </button>
      )}

      {/* 标记列表面板 */}
      {showMarkerList && (
        <div className="marker-list-overlay" onClick={() => setShowMarkerList(false)}>
          <div className="marker-list-panel" onClick={e => e.stopPropagation()}>
            <div className="marker-list-header">
              <h3>📍 所有标记</h3>
              <button className="panel-close" onClick={() => setShowMarkerList(false)}>✕</button>
            </div>
            <div className="marker-list-toolbar">
              <input 
                type="text"
                placeholder="🔍 搜索地名或备注..."
                value={markerListSearch}
                onChange={e => {
                  setMarkerListSearch(e.target.value);
                  // 同时搜索备注
                  if (e.target.value.trim() && window.electronAPI?.searchPhotos) {
                    setIsNoteSearching(true);
                    window.electronAPI.searchPhotos(e.target.value).then(results => {
                      setNoteSearchResults(results || []);
                      setIsNoteSearching(false);
                    }).catch(() => {
                      setNoteSearchResults([]);
                      setIsNoteSearching(false);
                    });
                  } else {
                    setNoteSearchResults([]);
                  }
                }}
                className="marker-search"
              />
              <div className="sort-btns">
                <button 
                  className={markerListSort === 'time' ? 'active' : ''}
                  onClick={() => setMarkerListSort('time')}
                >🕐 时间</button>
                <button 
                  className={markerListSort === 'name' ? 'active' : ''}
                  onClick={() => setMarkerListSort('name')}
                >🔤 地名</button>
              </div>
            </div>
            <div className="marker-list-content">
              {(() => {
                const filteredMarkers = markers
                  .filter(m => {
                    if (!markerListSearch) return true;
                    const name = m.name || `${m.lat.toFixed(3)}°, ${m.lng.toFixed(3)}°`;
                    return name.toLowerCase().includes(markerListSearch.toLowerCase());
                  })
                  .sort((a, b) => {
                    if (markerListSort === 'time') {
                      return (b.createdAt || 0) - (a.createdAt || 0);
                    } else {
                      const nameA = a.name || '';
                      const nameB = b.name || '';
                      return nameA.localeCompare(nameB, 'zh-CN');
                    }
                  });
                
                if (markersLoading) {
                  return [1,2,3,4].map(i => (
                    <div key={i} className="skeleton-list-item">
                      <div className="skeleton-list-thumb"></div>
                      <div className="skeleton-list-info">
                        <div className="skeleton-text medium"></div>
                        <div className="skeleton-text short"></div>
                      </div>
                    </div>
                  ));
                }
                
                // 有搜索词时，显示标记和备注两个分组
                if (markerListSearch) {
                  const hasMarkers = filteredMarkers.length > 0;
                  const hasNotes = noteSearchResults.length > 0;
                  
                  if (!hasMarkers && !hasNotes && !isNoteSearching) {
                    return <div className="marker-list-empty">未找到匹配 "{markerListSearch}" 的结果</div>;
                  }
                  
                  return (
                    <div className="search-results-grouped">
                      {/* 标记结果 */}
                      {hasMarkers && (
                        <div className="result-group">
                          <div className="result-group-title">📍 标记 ({filteredMarkers.length})</div>
                          {filteredMarkers.slice(0, 10).map(m => (
                            <MarkerListItem 
                              key={m.id}
                              marker={m}
                              onClick={async () => {
                                setShowMarkerList(false);
                                if (mapRef.current) {
                                  mapRef.current.flyTo({ center: [m.lng, m.lat], zoom: 15, duration: 1000 });
                                  setTimeout(async () => {
                                    const point = mapRef.current.project([m.lng, m.lat]);
                                    let fullMarker = m;
                                    if (window.electronAPI?.getMarkerDetail) {
                                      const detail = await window.electronAPI.getMarkerDetail(m.id);
                                      if (detail) fullMarker = detail;
                                    }
                                    setMarkerMenu({ x: point.x, y: point.y, marker: fullMarker });
                                  }, 1050);
                                }
                              }}
                            />
                          ))}
                          {filteredMarkers.length > 10 && (
                            <div className="result-more">还有 {filteredMarkers.length - 10} 个结果...</div>
                          )}
                        </div>
                      )}
                      
                      {/* 备注结果 */}
                      {isNoteSearching ? (
                        <div className="result-group">
                          <div className="result-group-title">📝 备注</div>
                          <div className="marker-list-empty"><span className="loading-spinner"></span> 搜索中...</div>
                        </div>
                      ) : hasNotes && (
                        <div className="result-group">
                          <div className="result-group-title">📝 备注 ({noteSearchResults.length})</div>
                          {noteSearchResults.slice(0, 10).map((result, i) => (
                            <div 
                              key={`note-${i}`}
                              className="marker-list-item note-item"
                              onClick={async () => {
                                setShowMarkerList(false);
                                if (mapRef.current) {
                                  mapRef.current.flyTo({ center: [result.lng, result.lat], zoom: 15, duration: 1000 });
                                }
                                if (window.electronAPI?.getMarkerDetail) {
                                  const detail = await window.electronAPI.getMarkerDetail(result.markerId);
                                  if (detail) {
                                    const photoIndex = detail.photos.findIndex(p => p.id === result.fileId);
                                    setPhotoViewer({
                                      photos: detail.photos,
                                      index: photoIndex >= 0 ? photoIndex : 0,
                                      markerId: result.markerId
                                    });
                                  }
                                }
                              }}
                            >
                              <LazyPhoto photo={{ id: result.fileId }} className="marker-list-thumb" />
                              <div className="marker-list-info">
                                <div className="marker-list-name">"{result.note}"</div>
                                <div className="marker-list-meta">
                                  📍 {result.markerName || `${result.lat.toFixed(3)}°, ${result.lng.toFixed(3)}°`}
                                </div>
                              </div>
                            </div>
                          ))}
                          {noteSearchResults.length > 10 && (
                            <div className="result-more">还有 {noteSearchResults.length - 10} 个结果...</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
                
                // 无搜索词时，显示完整标记列表
                if (filteredMarkers.length === 0) {
                  return <div className="marker-list-empty">暂无标记，点击地图添加</div>;
                }
                
                const Row = ({ index, style }) => {
                  const m = filteredMarkers[index];
                  return (
                    <div style={style}>
                      <MarkerListItem 
                        marker={m}
                        onClick={async () => {
                          setShowMarkerList(false);
                          if (mapRef.current) {
                            mapRef.current.flyTo({ center: [m.lng, m.lat], zoom: 15, duration: 1000 });
                            setTimeout(async () => {
                              const point = mapRef.current.project([m.lng, m.lat]);
                              let fullMarker = m;
                              if (window.electronAPI?.getMarkerDetail) {
                                const detail = await window.electronAPI.getMarkerDetail(m.id);
                                if (detail) fullMarker = detail;
                              }
                              setMarkerMenu({ x: point.x, y: point.y, marker: fullMarker });
                            }, 1050);
                          }
                        }}
                      />
                    </div>
                  );
                };
                
                return (
                  <VirtualList
                    height={550}
                    itemCount={filteredMarkers.length}
                    itemSize={80}
                    width="100%"
                    overscanCount={3}
                  >
                    {Row}
                  </VirtualList>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 测量模式UI */}
      {measureMode && (
        <>
          <div className="measure-hint">
            📏 测量模式 - {measureStart ? '点击选择终点' : '点击选择起点'}
          </div>
          <div className="measure-toolbar">
            {measureLines.length > 0 && (
              <button onClick={clearMeasureLines} className="measure-btn">🗑️ 清除测量</button>
            )}
            <button onClick={exitMeasureMode} className="measure-btn exit">✖ 退出测量模式</button>
          </div>
        </>
      )}

      {/* 设置页面 - 横屏详细版 */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => {
          // 检查是否有未保存的更改
          const hasChanges = JSON.stringify(tempSettings) !== JSON.stringify(mapSettings);
          if (hasChanges) {
            if (window.confirm('设置已更改但未保存，是否保存？')) {
              setMapSettings(tempSettings);
              localStorage.setItem('mapSettings', JSON.stringify(tempSettings));
            } else {
              setTempSettings(mapSettings);
            }
          }
          setShowSettings(false);
        }}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            {/* 左侧导航 */}
            <div className="settings-nav">
              <div className="settings-nav-header">
                <span className="nav-icon">⚙️</span>
                <span className="nav-title">设置</span>
              </div>
              <div className="settings-nav-items">
                <button className={settingsTab === 'map' ? 'active' : ''} onClick={() => setSettingsTab('map')}>
                  <span>🗺️</span> 地图显示
                </button>
                <button className={settingsTab === 'performance' ? 'active' : ''} onClick={() => setSettingsTab('performance')}>
                  <span>🚀</span> 性能优化
                </button>
                <button className={settingsTab === 'storage' ? 'active' : ''} onClick={() => setSettingsTab('storage')}>
                  <span>💾</span> 存储管理
                </button>
                <button className={settingsTab === 'about' ? 'active' : ''} onClick={() => setSettingsTab('about')}>
                  <span>ℹ️</span> 关于
                </button>
              </div>
            </div>
            
            {/* 右侧内容 */}
            <div className="settings-content">
              <button className="settings-close" onClick={() => {
                const hasChanges = JSON.stringify(tempSettings) !== JSON.stringify(mapSettings);
                if (hasChanges) {
                  if (window.confirm('设置已更改但未保存，是否保存？')) {
                    setMapSettings(tempSettings);
                    localStorage.setItem('mapSettings', JSON.stringify(tempSettings));
                  } else {
                    setTempSettings(mapSettings);
                  }
                }
                setShowSettings(false);
              }}>✕</button>
              
              {settingsTab === 'map' && (
                <div className="settings-page">
                  <h2>🗺️ 地图显示</h2>
                  <p className="page-desc">调整地图的显示效果和交互方式</p>
                  
                  <div className="setting-group">
                    <h3>画质设置</h3>
                    <div className="setting-row">
                      <div className="setting-label">
                        <strong>抗锯齿</strong>
                        <span>平滑地图边缘，提升画质但会增加GPU负担</span>
                      </div>
                      <label className="switch">
                        <input type="checkbox" checked={tempSettings.antialias} onChange={e => setTempSettings(s => ({...s, antialias: e.target.checked}))} />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="setting-group">
                    <h3>交互设置</h3>
                    <div className="setting-row">
                      <div className="setting-label">
                        <strong>允许旋转</strong>
                        <span>右键拖动可旋转地图视角</span>
                      </div>
                      <label className="switch">
                        <input type="checkbox" checked={tempSettings.dragRotate} onChange={e => setTempSettings(s => ({...s, dragRotate: e.target.checked}))} />
                        <span className="slider"></span>
                      </label>
                    </div>
                    <div className="setting-row">
                      <div className="setting-label">
                        <strong>世界副本</strong>
                        <span>左右无限滚动，显示多个地球副本</span>
                      </div>
                      <label className="switch">
                        <input type="checkbox" checked={tempSettings.renderWorldCopies} onChange={e => setTempSettings(s => ({...s, renderWorldCopies: e.target.checked}))} />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="setting-group">
                    <h3>缩放范围</h3>
                    <div className="setting-row">
                      <div className="setting-label">
                        <strong>最小缩放级别</strong>
                        <span>数值越小可以看到越大范围</span>
                      </div>
                      <div className="range-control">
                        <input type="range" min="0" max="5" step="1" value={tempSettings.minZoom} onChange={e => setTempSettings(s => ({...s, minZoom: Number(e.target.value)}))} />
                        <span className="range-value">{tempSettings.minZoom}</span>
                      </div>
                    </div>
                    <div className="setting-row">
                      <div className="setting-label">
                        <strong>最大缩放级别</strong>
                        <span>数值越大可以看到越详细</span>
                      </div>
                      <div className="range-control">
                        <input type="range" min="15" max="22" step="1" value={tempSettings.maxZoom} onChange={e => setTempSettings(s => ({...s, maxZoom: Number(e.target.value)}))} />
                        <span className="range-value">{tempSettings.maxZoom}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {settingsTab === 'performance' && (
                <div className="settings-page">
                  <h2>🚀 性能优化</h2>
                  <p className="page-desc">调整性能参数以获得更流畅的体验</p>
                  
                  <div className="setting-group">
                    <h3>渲染设置</h3>
                    <div className="setting-row">
                      <div className="setting-label">
                        <strong>瓦片淡入时间</strong>
                        <span>地图瓦片加载时的淡入动画时长，0为立即显示</span>
                      </div>
                      <div className="range-control wide">
                        <input type="range" min="0" max="500" step="50" value={tempSettings.fadeDuration} onChange={e => setTempSettings(s => ({...s, fadeDuration: Number(e.target.value)}))} />
                        <span className="range-value">{tempSettings.fadeDuration}ms</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="setting-group">
                    <h3>缓存设置</h3>
                    <div className="setting-row">
                      <div className="setting-label">
                        <strong>瓦片缓存数量</strong>
                        <span>内存中缓存的地图瓦片数量，越大越流畅但占用更多内存</span>
                      </div>
                      <div className="range-control wide">
                        <input type="range" min="1000" max="6000" step="500" value={tempSettings.maxTileCacheSize} onChange={e => setTempSettings(s => ({...s, maxTileCacheSize: Number(e.target.value)}))} />
                        <span className="range-value">{tempSettings.maxTileCacheSize}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="setting-tip">
                    <span>💡</span>
                    <p>性能设置修改后需要重启应用才能生效。如果地图卡顿，可以尝试降低瓦片缓存数量。</p>
                  </div>
                </div>
              )}
              
              {settingsTab === 'storage' && (
                <div className="settings-page">
                  <h2>💾 存储管理</h2>
                  <p className="page-desc">查看和管理应用数据</p>
                  
                  <div className="storage-cards">
                    <div className="storage-card">
                      <div className="storage-icon">📍</div>
                      <div className="storage-value">{markers.length}</div>
                      <div className="storage-label">标记点</div>
                    </div>
                    <div className="storage-card">
                      <div className="storage-icon">📷</div>
                      <div className="storage-value">{totalPhotos}</div>
                      <div className="storage-label">照片</div>
                    </div>
                    <div className="storage-card">
                      <div className="storage-icon">🗺️</div>
                      <div className="storage-value">{cacheStats.count}</div>
                      <div className="storage-label">缓存瓦片</div>
                    </div>
                    <div className="storage-card">
                      <div className="storage-icon">📦</div>
                      <div className="storage-value">{(cacheStats.size / 1024 / 1024).toFixed(1)}</div>
                      <div className="storage-label">MB 缓存</div>
                    </div>
                  </div>
                  
                  <div className="setting-group">
                    <h3>数据操作</h3>
                    <div className="action-buttons">
                      <button className="action-btn" onClick={async () => {
                        if (window.confirm('确定清除所有瓦片缓存？这不会影响你的标记和照片。')) {
                          await window.electronAPI?.clearTileCache();
                          const stats = await window.electronAPI?.getCacheStats();
                          if (stats) setCacheStats(stats);
                        }
                      }}>
                        <span>🧹</span>
                        <div>
                          <strong>清除瓦片缓存</strong>
                          <small>释放磁盘空间，不影响标记数据</small>
                        </div>
                      </button>
                      <button className="action-btn danger" onClick={async () => {
                        if (window.confirm('⚠️ 确定删除所有标记和照片？此操作不可恢复！')) {
                          for (const m of markers) await window.electronAPI?.deleteMarker(m.id);
                          setMarkers([]);
                        }
                      }}>
                        <span>🗑️</span>
                        <div>
                          <strong>清除所有数据</strong>
                          <small>删除所有标记和照片，不可恢复</small>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {settingsTab === 'about' && (
                <div className="settings-page about-page">
                  <div className="about-header">
                    <div className="about-icon">📍</div>
                    <h1>地图相册</h1>
                    <p className="version">版本 1.0.0</p>
                  </div>
                  <p className="about-desc">在地图上记录你的旅行回忆，用照片标记每一个值得纪念的地点。</p>
                  <div className="about-features">
                    <div className="feature">
                      <span>🗺️</span>
                      <div>
                        <strong>交互式地图</strong>
                        <small>基于 Mapbox GL 的流畅地图体验</small>
                      </div>
                    </div>
                    <div className="feature">
                      <span>📷</span>
                      <div>
                        <strong>照片管理</strong>
                        <small>为每个地点添加多张照片和备注</small>
                      </div>
                    </div>
                    <div className="feature">
                      <span>🔍</span>
                      <div>
                        <strong>智能搜索</strong>
                        <small>快速搜索全球任意地点</small>
                      </div>
                    </div>
                    <div className="feature">
                      <span>💾</span>
                      <div>
                        <strong>本地存储</strong>
                        <small>数据安全存储在本地</small>
                      </div>
                    </div>
                  </div>
                  
                  {/* 开发者工具 */}
                  <div className="dev-tools-section">
                    <h3>🛠️ 开发者工具</h3>
                    <div className="dev-tools-btns">
                      <button onClick={() => window.electronAPI?.openDevTools()}>
                        <span>🔧</span> 打开控制台
                      </button>
                      <button onClick={() => window.electronAPI?.openLogFolder()}>
                        <span>📁</span> 打开日志目录
                      </button>
                    </div>
                  </div>
                  
                  <div className="about-footer">
                    <p>使用 Electron + React + Mapbox GL 构建</p>
                  </div>
                </div>
              )}
              
              {/* 底部保存按钮 - 仅在地图和性能设置页显示 */}
              {(settingsTab === 'map' || settingsTab === 'performance') && (
                <div className="settings-footer">
                  <button 
                    className="save-btn"
                    disabled={JSON.stringify(tempSettings) === JSON.stringify(mapSettings)}
                    onClick={() => {
                      setMapSettings(tempSettings);
                      localStorage.setItem('mapSettings', JSON.stringify(tempSettings));
                      setShowSettings(false);
                    }}
                  >
                    保存设置
                  </button>
                  <p className="save-hint">
                    {JSON.stringify(tempSettings) !== JSON.stringify(mapSettings) 
                      ? '* 设置已更改，点击保存生效' 
                      : '部分设置需要重启应用后生效'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div 
          className={`context-menu ${isDragOver ? 'drag-over' : ''}`}
          style={{ 
            left: Math.min(contextMenu.x, window.innerWidth - 280),
            top: Math.min(contextMenu.y, window.innerHeight - 200),
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // 只有离开整个菜单时才取消高亮
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setIsDragOver(false);
            }
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
            
            const files = Array.from(e.dataTransfer.files).filter(f => 
              f.type.startsWith('image/')
            );
            if (files.length === 0) return;
            
            // 读取图片并保存为文件
            const photos = await Promise.all(files.map(file => {
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  if (window.electronAPI) {
                    const result = await window.electronAPI.savePhotoFromBase64(ev.target.result);
                    resolve(result ? { id: result.id, note: '' } : null);
                  } else {
                    resolve({ data: ev.target.result, note: '' });
                  }
                };
                reader.readAsDataURL(file);
              });
            }));
            
            const validPhotos = photos.filter(p => p);
            if (validPhotos.length === 0) return;
            
            // 获取地名
            const name = await fetchPlaceName(contextMenu.latlng.lat, contextMenu.latlng.lng);
            
            // 创建标记
            const newMarker = {
              id: uuidv4(),
              lat: contextMenu.latlng.lat,
              lng: contextMenu.latlng.lng,
              name,
              photos: validPhotos,
              createdAt: Date.now()
            };
            // 保存到数据库
            if (window.electronAPI) await window.electronAPI.addMarker(newMarker);
            // 标记为新标记（触发入场动画）
            setNewMarkerIds(prev => new Set(prev).add(newMarker.id));
            setTimeout(() => setNewMarkerIds(prev => { const s = new Set(prev); s.delete(newMarker.id); return s; }), 600);
            refreshMarkers();
            setContextMenu(null);
            setPreviewPin(null);
          }}
        >
          <button className="menu-close" onClick={closeContextMenu}>✕</button>
          <div className="context-menu-header">
            <div className="place-name">📍 {placeName}</div>
            <div className="coords">🌐 {contextMenu.latlng.lat.toFixed(3)}°, {contextMenu.latlng.lng.toFixed(3)}°</div>
          </div>
          <div className="menu-actions">
            <div 
              className={`add-photo-zone ${isDragOver ? 'drag-active' : ''}`}
              onClick={() => addPhotoMarker(contextMenu.latlng)}
            >
              <span className="zone-icon">{isDragOver ? '📥' : '📷'}</span>
              <span className="zone-text">点击选择照片</span>
              <span className="zone-hint">或拖拽照片到这里</span>
            </div>
          </div>
        </div>
      )}

      {markerMenu && (
        <div 
          className={`context-menu ${isMarkerDragOver ? 'drag-over' : ''}`}
          style={{ 
            left: Math.min(markerMenu.x, window.innerWidth - 280),
            top: Math.min(markerMenu.y, window.innerHeight - 320),
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsMarkerDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            setIsMarkerDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setIsMarkerDragOver(false);
            }
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsMarkerDragOver(false);
            
            const files = Array.from(e.dataTransfer.files).filter(f => 
              f.type.startsWith('image/')
            );
            if (files.length === 0) return;
            
            // 读取图片并保存为文件
            const photos = await Promise.all(files.map(file => {
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  if (window.electronAPI) {
                    const result = await window.electronAPI.savePhotoFromBase64(ev.target.result);
                    resolve(result ? { id: result.id, note: '' } : null);
                  } else {
                    resolve({ data: ev.target.result, note: '' });
                  }
                };
                reader.readAsDataURL(file);
              });
            }));
            
            const validPhotos = photos.filter(p => p);
            if (validPhotos.length === 0) return;
            
            // 添加到现有标记（数据库）
            const currentMenu = markerMenu;
            if (window.electronAPI) {
              await window.electronAPI.addPhotosToMarker(currentMenu.marker.id, validPhotos);
              // 重新获取标记详情
              const detail = await window.electronAPI.getMarkerDetail(currentMenu.marker.id);
              if (detail) setMarkerMenu({ ...currentMenu, marker: detail });
              refreshMarkers();
            }
          }}
        >
          <button className="menu-close" onClick={() => setMarkerMenu(null)}>✕</button>
          <div className="context-menu-header">
            <div className="place-name">📍 {markerMenu.marker.name || `${markerMenu.marker.lat.toFixed(3)}°, ${markerMenu.marker.lng.toFixed(3)}°`}</div>
            <div className="meta-row">
              <span className="coords">{markerMenu.marker.lat.toFixed(3)}°, {markerMenu.marker.lng.toFixed(3)}°</span>
              <span className="photo-count">📷 {markerMenu.marker.photos?.length || 0} 张</span>
            </div>
          </div>
          <div className="menu-actions">
            <div className="menu-actions-primary">
              {markerMenu.marker.photos?.length > 0 && (
                <button className="menu-btn primary view" onClick={() => { 
                  setPhotoViewer({ 
                    photos: markerMenu.marker.photos, 
                    index: 0, 
                    markerId: markerMenu.marker.id,
                    returnToMenu: markerMenu
                  }); 
                  setMarkerMenu(null); 
                }}>
                  <span className="btn-icon">🖼️</span>
                  <span>查看照片</span>
                </button>
              )}
              <button 
                className={`menu-btn primary add ${isMarkerDragOver ? 'drag-active' : ''}`}
                onClick={async () => {
                  if (!window.electronAPI) return;
                  const currentMenu = markerMenu;
                  const photos = await window.electronAPI.selectPhotos();
                  if (photos?.length > 0) {
                    await window.electronAPI.addPhotosToMarker(currentMenu.marker.id, photos.map(p => ({ id: p.id, note: '' })));
                    const detail = await window.electronAPI.getMarkerDetail(currentMenu.marker.id);
                    if (detail) setMarkerMenu({ ...currentMenu, marker: detail });
                    refreshMarkers();
                  }
                }}
              >
                <span className="btn-icon">{isMarkerDragOver ? '📥' : '➕'}</span>
                <span>添加照片</span>
              </button>
            </div>
            {markerMenu.marker.photos?.length > 0 && (
              <button className="menu-btn note" onClick={() => {
                setNotesPanel({ 
                  markerId: markerMenu.marker.id, 
                  marker: markerMenu.marker,
                  returnToMenu: markerMenu
                });
                setMarkerMenu(null);
              }}>
                <span className="btn-icon">📝</span>
                <span>备注</span>
              </button>
            )}
            <button className="menu-btn danger" onClick={() => { deleteMarkerById(markerMenu.marker.id); setMarkerMenu(null); }}>
              <span className="btn-icon">🗑️</span>
              <span>删除标记</span>
            </button>
          </div>
        </div>
      )}

      {(contextMenu || markerMenu) && (
        <div className="context-overlay" onClick={closeContextMenu} />
      )}

      {/* 照片查看器 */}
      {photoViewer && (
        <PhotoViewer
          photoViewer={photoViewer}
          setPhotoViewer={setPhotoViewer}
          currentPhotoUrl={currentPhotoUrl}
          getPhotoNote={getPhotoNote}
          markers={markers}
          setMarkerMenu={setMarkerMenu}
          refreshMarkers={refreshMarkers}
          setPhotoEditor={setPhotoEditor}
        />
      )}



      {/* 备注编辑器 */}
      {noteEditor && (
        <div className="note-editor-overlay" onClick={() => {
          // 返回到之前的界面
          if (noteEditor.returnToViewer) {
            setPhotoViewer(noteEditor.returnToViewer);
          } else if (noteEditor.returnToMenu) {
            const marker = markers.find(m => m.id === noteEditor.markerId);
            if (marker) {
              setMarkerMenu({ ...noteEditor.returnToMenu, marker });
            }
          }
          setNoteEditor(null);
        }}>
          <div className="note-editor" onClick={e => e.stopPropagation()}>
            <h3>📝 编辑备注</h3>
            <textarea 
              value={noteEditor.note}
              onChange={e => setNoteEditor({ ...noteEditor, note: e.target.value })}
              placeholder="输入照片备注..."
              autoFocus
            />
            <div className="note-editor-btns">
              <button onClick={() => {
                // 取消时返回
                if (noteEditor.returnToViewer) {
                  setPhotoViewer(noteEditor.returnToViewer);
                } else if (noteEditor.returnToMenu) {
                  const marker = markers.find(m => m.id === noteEditor.markerId);
                  if (marker) {
                    setMarkerMenu({ ...noteEditor.returnToMenu, marker });
                  }
                }
                setNoteEditor(null);
              }}>取消</button>
              <button className="save" onClick={() => {
                savePhotoNote(noteEditor.markerId, noteEditor.photoIndex, noteEditor.note);
                // 更新数据后返回
                const marker = markers.find(m => m.id === noteEditor.markerId);
                if (marker) {
                  const newPhotos = [...marker.photos];
                  if (typeof newPhotos[noteEditor.photoIndex] === 'string') {
                    newPhotos[noteEditor.photoIndex] = { data: newPhotos[noteEditor.photoIndex], note: noteEditor.note };
                  } else {
                    newPhotos[noteEditor.photoIndex] = { ...newPhotos[noteEditor.photoIndex], note: noteEditor.note };
                  }
                  if (noteEditor.returnToViewer) {
                    setPhotoViewer({ ...noteEditor.returnToViewer, photos: newPhotos });
                  } else if (noteEditor.returnToMenu) {
                    const updatedMarker = { ...marker, photos: newPhotos };
                    setMarkerMenu({ ...noteEditor.returnToMenu, marker: updatedMarker });
                  }
                }
              }}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 备注管理面板 */}
      {notesPanel && (
        <div className="notes-panel-overlay" onClick={async () => {
          if (!notesEditing) {
            if (notesPanel.returnToMenu) {
              // 重新从数据库获取完整标记数据
              if (window.electronAPI?.getMarkerDetail) {
                const detail = await window.electronAPI.getMarkerDetail(notesPanel.markerId);
                if (detail) setMarkerMenu({ ...notesPanel.returnToMenu, marker: detail });
              } else {
                const marker = markers.find(m => m.id === notesPanel.markerId);
                if (marker) setMarkerMenu({ ...notesPanel.returnToMenu, marker });
              }
            }
            setNotesPanel(null);
          }
        }}>
          <div className="notes-panel" onClick={e => e.stopPropagation()}>
            <div className="notes-panel-header">
              <h3>📝 照片备注</h3>
              <div className="header-actions">
                {!notesEditing ? (
                  <button className="edit-btn" onClick={() => {
                    const photos = markers.find(m => m.id === notesPanel.markerId)?.photos || [];
                    setEditingNotes(photos.map(p => getPhotoNote(p)));
                    setNotesEditing(true);
                  }}>✏️ 编辑</button>
                ) : (
                  <>
                    <button className="cancel-btn" onClick={() => {
                      setNotesEditing(false);
                      setEditingNotes([]);
                    }}>取消</button>
                    <button className="save-btn" onClick={async () => {
                      // 批量更新照片备注（事务优化）
                      if (window.electronAPI?.batchUpdatePhotoNotes) {
                        await window.electronAPI.batchUpdatePhotoNotes(notesPanel.markerId, editingNotes);
                      } else if (window.electronAPI) {
                        // 降级：逐个更新
                        for (let i = 0; i < editingNotes.length; i++) {
                          await window.electronAPI.updatePhotoNote(notesPanel.markerId, i, editingNotes[i] || '');
                        }
                      }
                      setNotesEditing(false);
                      setEditingNotes([]);
                      showToast('success', '备注已保存');
                      // 刷新当前面板的标记数据
                      if (window.electronAPI) {
                        const detail = await window.electronAPI.getMarkerDetail(notesPanel.markerId);
                        if (detail) setNotesPanel(prev => ({ ...prev, marker: detail }));
                      }
                    }}>💾 保存</button>
                  </>
                )}
                <button className="panel-close" onClick={async () => {
                  if (notesPanel.returnToMenu) {
                    // 重新从数据库获取完整标记数据
                    if (window.electronAPI?.getMarkerDetail) {
                      const detail = await window.electronAPI.getMarkerDetail(notesPanel.markerId);
                      if (detail) setMarkerMenu({ ...notesPanel.returnToMenu, marker: detail });
                    } else {
                      const marker = markers.find(m => m.id === notesPanel.markerId);
                      if (marker) setMarkerMenu({ ...notesPanel.returnToMenu, marker });
                    }
                  }
                  setNotesEditing(false);
                  setEditingNotes([]);
                  setNotesPanel(null);
                }}>✕</button>
              </div>
            </div>
            <div className="notes-list">
              {(markers.find(m => m.id === notesPanel.markerId)?.photos || []).map((photo, index) => (
                <div key={index} className="note-item">
                  <LazyPhoto photo={photo} className="note-thumb" alt={`照片${index + 1}`} />
                  <div className="note-content">
                    <div className="note-label">照片 {index + 1}</div>
                    {notesEditing ? (
                      <textarea 
                        value={editingNotes[index] || ''}
                        onChange={e => {
                          const newNotes = [...editingNotes];
                          newNotes[index] = e.target.value;
                          setEditingNotes(newNotes);
                        }}
                        placeholder="输入备注..."
                      />
                    ) : (
                      <div className="note-text">{getPhotoNote(photo) || '暂无备注'}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 照片编辑器（裁剪+旋转） */}
      {photoEditor && (
        <PhotoEditor
          photoEditor={photoEditor}
          setPhotoEditor={setPhotoEditor}
          setPhotoViewer={setPhotoViewer}
          cropPhoto={cropPhoto}
          refreshMarkers={refreshMarkers}
        />
      )}

      {/* Toast 提示 */}
      {toast && (
        <div className={`feedback-toast ${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
          </span>
          {toast.message}
        </div>
      )}

      {/* 内存监控面板（仅开发模式） */}
      <MemoryMonitor />



    </div>
  );
}

// 使用错误边界包装的 App 组件
const AppWithErrorBoundary = () => (
  <ErrorBoundary 
    name="App"
    title="应用遇到了问题"
    message="地图相册遇到了意外错误，请尝试刷新页面。如果问题持续存在，请联系技术支持。"
  >
    <NetworkErrorBoundary>
      <AsyncErrorBoundary>
        <App />
      </AsyncErrorBoundary>
    </NetworkErrorBoundary>
  </ErrorBoundary>
);

export default AppWithErrorBoundary;

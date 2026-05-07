import { useState, useEffect, useRef, useCallback, useMemo, memo, lazy, Suspense, useDeferredValue } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { photoUrlCache, thumbnailCache } from './utils/LRUCache.ts';
import { startPeriodicCleanup, stopPeriodicCleanup } from './utils/memoryManager.ts';
import PhotoViewer from './components/PhotoViewer.jsx';
import PhotoEditor from './components/PhotoEditor.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useSEO } from './utils/seoManager.js';
import { useAnalytics } from './utils/webAnalytics.js';
import { usePWA } from './utils/pwaManager.js';
import api from './api/index.js';
import syncService from './services/syncService.js';
import { matchMarkerName, getMatchRanges } from './utils/searchUtils.js';
import LoginButtons from './components/LoginButtons.jsx';
import WebDownloadButton from './components/WebDownloadButton.jsx';
import LazyPhoto from './components/LazyPhoto.jsx';
import MarkerListItem, { highlightText } from './components/MarkerListItem.jsx';
import MarkerGridItem from './components/MarkerGridItem.jsx';
import { initMapbox, gcj02ToWgs84, formatLastSeen } from './utils/mapUtils.js';

// 如果是Web版本，导入Web样式
if (!window.electronAPI) {
  import('../src-web/web-styles.css');
}

import { createPortal } from 'react-dom';
import MinimalLoader from './components/MinimalLoader.jsx';

// 简洁优雅的加载动画
const FilmLoader = ({ onComplete, onShowLogin, canEnter }) => {
  return <MinimalLoader onComplete={onComplete} onShowLogin={onShowLogin || (() => {})} canEnter={canEnter} />;
};

// 懒加载组件 - 减少首屏 JS 体积，按需加载
const SettingsPanel = lazy(() => import('./components/SettingsPanel.jsx'));
const SocialPanel = lazy(() => import('./components/SocialPanel.jsx'));
const LifePanel = lazy(() => import('./components/LifePanel.jsx'));

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
  const [userChose, setUserChose] = useState(false); // 用户是否已做出选择（登录/跳过）
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [user, setUser] = useState(null);
  const [mapEntered, setMapEntered] = useState(false); // 用户点击进入地图（触发器）
  const [offlinePrompted, setOfflinePrompted] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [markerMenu, setMarkerMenu] = useState(null);
  const [previewPin, setPreviewPin] = useState(null);
  const [placeName, setPlaceName] = useState('');
  const [locateProgress, setLocateProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('appearance'); // user, appearance, performance, about
  const [showSocial, setShowSocial] = useState(false);
  const [showLife, setShowLife] = useState(false);
  const [showVillageModal, setShowVillageModal] = useState(false);
  const [villageReady, setVillageReady] = useState(false);
  const [villageRect, setVillageRect] = useState(null);
  const [villageTransitioning, setVillageTransitioning] = useState(false);
  const [villageClosing, setVillageClosing] = useState(false);
  const [markerListReady, setMarkerListReady] = useState(false);
  const [markerListClosing, setMarkerListClosing] = useState(false);
  const [markerListRect, setMarkerListRect] = useState(null);
  const [markerListTransitioning, setMarkerListTransitioning] = useState(false);
  const [markerListContentHidden, setMarkerListContentHidden] = useState(false);
  const [markerListMorphDone, setMarkerListMorphDone] = useState(false);
  const [markerBtnReveal, setMarkerBtnReveal] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [pendingFriendId, setPendingFriendId] = useState('');
  const [manualFriends, setManualFriends] = useState([]);
  const [hiddenFriendIds, setHiddenFriendIds] = useState([]);
  const [pinnedFriendIds, setPinnedFriendIds] = useState([]);
  const [friendActionMenu, setFriendActionMenu] = useState('');
  const globeVillageBtnRef = useRef(null);
  const markerManageBtnRef = useRef(null);
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
  const [batchMode, setBatchMode] = useState(false); // 批量操作模式
  const [selectedPhotos, setSelectedPhotos] = useState([]); // 选中的照片 [{markerId, photoId, photoIndex}]
  const [showMergeDialog, setShowMergeDialog] = useState(false); // 整合对话框
  const [mergeTargetPhoto, setMergeTargetPhoto] = useState(null); // 整合目标照片
  const [markerListSort, setMarkerListSort] = useState('time'); // 排序方式: time, name
  const [markerListLayout, setMarkerListLayout] = useState('list'); // 布局方式: list, grid
  const [showSortMenu, setShowSortMenu] = useState(false); // 显示排序菜单
  const [showLayoutMenu, setShowLayoutMenu] = useState(false); // 显示布局菜单
  const [markerListSearch, setMarkerListSearch] = useState(''); // 搜索关键词
  const [noteSearchResults, setNoteSearchResults] = useState([]); // 备注搜索结果
  const [isNoteSearching, setIsNoteSearching] = useState(false); // 是否正在搜索备注
  const [semanticResults, setSemanticResults] = useState([]); // 语义搜索结果
  const [isSemanticSearching, setIsSemanticSearching] = useState(false); // 语义搜索中
  const [embeddingProgress, setEmbeddingProgress] = useState(null); // 模型下载进度
  const [searchFocusIndex, setSearchFocusIndex] = useState(-1); // 搜索结果键盘焦点索引
  const searchResultsRef = useRef(null); // 搜索结果容器 ref
  const [markerListTimeFilter, setMarkerListTimeFilter] = useState('all'); // 时间过滤: all, week, month, year, custom
  const [markerListTimeRange, setMarkerListTimeRange] = useState({ start: '', end: '' }); // 自定义时间范围
  const [showTimeFilterMenu, setShowTimeFilterMenu] = useState(false); // 显示时间过滤菜单
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
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(() => syncService.isCloudSyncEnabled());
  const [syncApiBase, setSyncApiBase] = useState(() => syncService.getApiBase());
  const [syncingNow, setSyncingNow] = useState(false);
  const [syncQueueSize, setSyncQueueSize] = useState(() => syncService.getQueueLength());
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
  const [uiThemeStyle, setUiThemeStyle] = useState(() => {
    try { return localStorage.getItem('uiThemeStyle') || 'note'; } catch { return 'note'; }
  });
  const [measureMode, setMeasureMode] = useState(false);
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

  // 监听语义搜索模型下载进度
  useEffect(() => {
    const unsubscribe = api.photos.onEmbeddingProgress?.((data) => {
      setEmbeddingProgress(data);
      // 下载完成后清除进度条
      if (data.percent >= 100) {
        setTimeout(() => setEmbeddingProgress(null), 2000);
      }
    });
    return () => unsubscribe?.();
  }, []);

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

  useEffect(() => {
    if (!cloudSyncEnabled) return;
    syncService.enqueueSnapshot(markers);
    setSyncQueueSize(syncService.getQueueLength());
  }, [markers, cloudSyncEnabled]);

  const villageMembers = useMemo(() => {
    if (!user) return [];

    const byUser = new Map();
    markers.forEach((marker) => {
      const ownerId = marker.userId || marker.ownerId || marker.createdBy || marker.username || marker.authorId;
      if (!ownerId || ownerId === user.id || ownerId === user.username || ownerId === user.email || hiddenFriendIds.includes(ownerId)) return;
      const prev = byUser.get(ownerId) || {
        id: ownerId,
        avatar: String(ownerId).slice(0, 1).toUpperCase(),
        online: false,
        lastSeenAt: 0,
        markers: 0,
        photos: 0,
      };
      prev.markers += 1;
      prev.photos += marker.photoCount ?? marker.photos?.length ?? 0;
      prev.lastSeenAt = Math.max(prev.lastSeenAt, marker.updatedAt || marker.createdAt || 0);
      byUser.set(ownerId, prev);
    });

    manualFriends.forEach(fid => {
      if (!fid || hiddenFriendIds.includes(fid)) return;
      if (!byUser.has(fid)) {
        byUser.set(fid, {
          id: fid,
          avatar: String(fid).slice(0, 1).toUpperCase(),
          online: false,
          lastSeenAt: 0,
          markers: 0,
          photos: 0,
        });
      }
    });

    return Array.from(byUser.values())
      .map(m => ({
        ...m,
        online: Date.now() - m.lastSeenAt < 10 * 60 * 1000,
        lastSeen: formatLastSeen(m.lastSeenAt),
      }))
      .sort((a, b) => {
        const ap = pinnedFriendIds.includes(a.id) ? 1 : 0;
        const bp = pinnedFriendIds.includes(b.id) ? 1 : 0;
        if (ap !== bp) return bp - ap;
        return b.lastSeenAt - a.lastSeenAt;
      });
  }, [markers, user, manualFriends, hiddenFriendIds, pinnedFriendIds]);

  const hasVillage = villageMembers.length > 0;

  const villageStats = useMemo(() => {
    const countrySet = new Set();
    const provinceSet = new Set();
    let villageMarkers = 0;
    let villagePhotos = 0;

    markers.forEach(m => {
      const ownerId = m.userId || m.ownerId || m.createdBy || m.username || m.authorId;
      if (!ownerId || ownerId === user?.id || ownerId === user?.username || ownerId === user?.email) return;

      villageMarkers += 1;
      villagePhotos += m.photoCount ?? m.photos?.length ?? 0;

      const name = m.name || m.placeName || '';
      if (!name) return;
      const provinces = ['北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江','上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆'];
      const countries = ['美国','日本','韩国','英国','法国','德国','意大利','西班牙','澳大利亚','加拿大','新加坡','泰国','越南','马来西亚','印尼','新西兰','葡萄牙','瑞士','荷兰','巴西','墨西哥','阿联酋','印度','俄罗斯'];
      const p = provinces.find(i => name.includes(i));
      const c = countries.find(i => name.includes(i));
      if (p) provinceSet.add(p);
      if (c) countrySet.add(c);
    });

    return {
      markers: villageMarkers,
      photos: villagePhotos,
      countries: countrySet.size,
      regions: provinceSet.size,
    };
  }, [markers, user]);

  const villageFeeds = useMemo(() => {
    return markers
      .filter(m => {
        const ownerId = m.userId || m.ownerId || m.createdBy || m.username || m.authorId;
        return ownerId && ownerId !== user?.id && ownerId !== user?.username && ownerId !== user?.email;
      })
      .map(m => {
        const ownerId = m.userId || m.ownerId || m.createdBy || m.username || m.authorId;
        return {
          id: m.id,
          actorId: ownerId,
          place: m.name || m.placeName || `${m.lat?.toFixed?.(2) || ''}, ${m.lng?.toFixed?.(2) || ''}`,
          markerDelta: 1,
          photoDelta: m.photoCount ?? m.photos?.length ?? 0,
          time: formatLastSeen(m.updatedAt || m.createdAt || 0),
          at: m.updatedAt || m.createdAt || 0,
        };
      })
      .sort((a, b) => b.at - a.at)
      .slice(0, 10);
  }, [markers, user]);

  const filteredVillageMembers = useMemo(() => {
    const q = friendSearchQuery.trim().toLowerCase();
    if (!q) return villageMembers;
    return villageMembers.filter(m => m.id.toLowerCase().includes(q));
  }, [villageMembers, friendSearchQuery]);

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

  useEffect(() => {
    if (isOnline) setOfflinePrompted(false);
  }, [isOnline]);

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
  }, [cloudSyncEnabled, syncingNow, showToast]);

  useEffect(() => {
    if (!isOnline || !cloudSyncEnabled) return;
    runCloudSync();
    const timer = setInterval(() => {
      runCloudSync();
    }, 45000);
    return () => clearInterval(timer);
  }, [isOnline, cloudSyncEnabled, runCloudSync]);

  function closeMarkerListWithAnimation() {
    if (markerListTransitioning) return;

    const btn = markerManageBtnRef.current;
    const rect = btn?.getBoundingClientRect();
    if (rect && btn) {
      setMarkerListRect(prev => ({
        ...(prev || {}),
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        size: Math.max(btn.offsetWidth, btn.offsetHeight),
      }));
    }

    setMarkerListTransitioning(true);
    setMarkerListClosing(true);
    setMarkerListContentHidden(true);
    setMarkerListReady(false);
    setMarkerListMorphDone(false);
    setShowSortMenu(false);
    setShowLayoutMenu(false);

    setTimeout(() => setMarkerBtnReveal(true), 430);

    setTimeout(() => {
      setShowMarkerList(false);
      setMarkerListClosing(false);
      setMarkerListTransitioning(false);
      setMarkerListContentHidden(false);
      setMarkerBtnReveal(false);
      setBatchMode(false);
      setSelectedPhotos([]);
    }, 600);
  }

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
        if (showMarkerList) {
          closeMarkerListWithAnimation();
          return;
        }
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
          markerManageBtnRef.current?.click();
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
      // Electron 环境
      setMarkersLoading(true);
      window.electronAPI.loadMarkers().then(loaded => {
        console.log('📍 初始加载标记数量:', loaded.length, loaded.map(m => m.id));
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
    } else {
      // Web 环境 - 从 IndexedDB 加载标记（轻量版格式）
      setMarkersLoading(true);
      console.log('🔄 Web: 开始加载标记...');
      api.markers.getAll().then(async loaded => {
        console.log('📍 Web: 已加载', loaded.length, '个标记');
        // 为每个标记统计照片数量
        const markersWithCounts = await Promise.all(
          loaded.map(async marker => {
            const photos = await api.photos.getByMarkerId(marker.id);
            return {
              ...marker,
              photoCount: photos.length,
              firstPhoto: photos.length > 0 ? photos[0] : null
            };
          })
        );
        
        console.log('✅ Web: 标记加载完成，共', markersWithCounts.length, '个');
        setMarkers(markersWithCounts);
        setMarkersLoading(false);
      }).catch(error => {
        console.error('❌ 加载标记失败:', error);
        setMarkersLoading(false);
      });
    }
    
    // 组件卸载时停止定时清理
    return () => {
      stopPeriodicCleanup();
    };
  }, []);

  // Web 环境：添加导入/导出数据功能
  useEffect(() => {
    // 导出数据功能（Electron 和 Web 都可用）
    window.exportData = async () => {
      try {
        let allMarkers, allPhotos = [];
        
        if (window.electronAPI) {
          // Electron 环境
          allMarkers = await window.electronAPI.loadMarkers();
          // 获取每个标记的完整照片数据
          for (const marker of allMarkers) {
            const photos = await window.electronAPI.getPhotos?.(marker.id) || [];
            allPhotos.push(...photos.map(p => ({ ...p, markerId: marker.id })));
          }
        } else {
          // Web 环境
          allMarkers = await api.markers.getAll();
          for (const marker of allMarkers) {
            const photos = await api.photos.getByMarkerId(marker.id);
            allPhotos.push(...photos);
          }
        }
        
        const exportData = {
          version: '1.0.0',
          exportTime: new Date().toISOString(),
          markers: allMarkers,
          photos: allPhotos
        };
        
        // 下载为 JSON 文件
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `photo-map-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        alert(`导出成功！\n标记: ${allMarkers.length}\n照片: ${allPhotos.length}`);
      } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败: ' + error.message);
      }
    };
    
    if (!window.electronAPI) {
      // Web 环境：导入数据功能
      window.importData = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
          try {
            const file = e.target.files[0];
            if (!file) return;
            
            const text = await file.text();
            const data = JSON.parse(text);
            
            // 导入标记
            for (const marker of data.markers) {
              await api.markers.create(marker);
            }
            
            // 导入照片
            for (const photo of data.photos) {
              await api.photos.add(photo.markerId, photo);
            }
            
            // 刷新页面重新加载数据
            window.location.reload();
          } catch (error) {
            console.error('导入失败:', error);
            alert('导入失败: ' + error.message);
          }
        };
        input.click();
      };
      
      console.log('💡 Web 环境: window.exportData() 导出 | window.importData() 导入');
    } else {
      console.log('💡 Electron 环境: window.exportData() 可导出数据');
    }
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

  // 批量操作：选择/取消选择照片
  const handlePhotoSelect = useCallback((markerId, photoId, photoIndex) => {
    setSelectedPhotos(prev => {
      const exists = prev.find(p => p.markerId === markerId && p.photoId === photoId);
      if (exists) {
        return prev.filter(p => !(p.markerId === markerId && p.photoId === photoId));
      } else {
        return [...prev, { markerId, photoId, photoIndex }];
      }
    });
  }, []);


  // 批量操作：整合照片
  const handleMergePhotos = useCallback(async () => {
    if (!mergeTargetPhoto) {
      alert('请选择一个目标位置');
      return;
    }
    
    const targetMarkerId = mergeTargetPhoto.markerId;
    const targetMarker = markers.find(m => m.id === targetMarkerId);
    
    if (!targetMarker) {
      alert('目标标记不存在');
      return;
    }
    
    // 收集所有涉及的标记ID（除了目标标记）
    const markerIdsToMerge = new Set();
    selectedPhotos.forEach(selected => {
      if (selected.markerId !== targetMarkerId) {
        markerIdsToMerge.add(selected.markerId);
      }
    });
    
    if (markerIdsToMerge.size === 0) {
      alert('请选择其他标记的照片进行整合');
      return;
    }
    
    // 收集所有要移动的照片（整个标记的所有照片）
    const photosToMove = [];
    
    for (const markerId of markerIdsToMerge) {
      let marker = markers.find(m => m.id === markerId);
      
      // 如果标记没有 photos 数组（桌面版轻量数据），需要获取完整数据
      if (marker && !marker.photos && window.electronAPI?.getMarkerDetail) {
        marker = await window.electronAPI.getMarkerDetail(marker.id);
      }
      
      if (marker && marker.photos) {
        // 将该标记的所有照片都添加到移动列表
        marker.photos.forEach(photo => {
          photosToMove.push({ photo, fromMarkerId: markerId });
        });
      }
    }
    
    if (photosToMove.length === 0) {
      alert('没有需要移动的照片');
      return;
    }
    
    // 执行移动
    if (window.electronAPI && !window.electronAPI.__isWebAdapter) {
      // 桌面版：使用 API
      // 1. 将所有照片添加到目标标记
      await window.electronAPI.addPhotosToMarker({
        markerId: targetMarkerId,
        photos: photosToMove.map(p => p.photo)
      });
      
      // 2. 删除所有源标记
      for (const markerId of markerIdsToMerge) {
        if (window.electronAPI?.deleteMarker) {
          await window.electronAPI.deleteMarker(markerId);
        }
      }
      
      // 3. 重新加载标记
      const updatedMarkers = await window.electronAPI.loadMarkers();
      setMarkers(updatedMarkers);
    } else {
      // Web 版本：用 IndexedDB 操作
      const { webStorage } = await import('./api/index.js');

      // 1. 把所有照片移动到目标标记
      for (const { photo } of photosToMove) {
        await webStorage.photos.add(targetMarkerId, { ...photo, markerId: targetMarkerId });
      }

      // 2. 删除源标记的照片和标记
      for (const markerId of markerIdsToMerge) {
        const photos = await api.photos.getByMarkerId(markerId);
        for (const photo of photos) {
          await api.photos.delete(markerId, photo.id);
        }
        await api.markers.delete(markerId);
      }

      // 3. 更新目标标记的 photoCount 和 firstPhoto
      const targetPhotos = await api.photos.getByMarkerId(targetMarkerId);
      await webStorage.markers.update(targetMarkerId, {
        photoCount: targetPhotos.length,
        firstPhoto: targetPhotos[0] || null
      });

      // 4. 重新加载
      await refreshMarkers();
    }
    
    // 清理状态
    setSelectedPhotos([]);
    setMergeTargetPhoto(null);
    setShowMergeDialog(false);
    setBatchMode(false);
    
    showToast('success', `已整合 ${photosToMove.length} 张照片到目标位置，删除了 ${markerIdsToMerge.size} 个原标记`);
  }, [mergeTargetPhoto, selectedPhotos, markers, showToast]);

  // 获取地名（国内用高德，国外用 Mapbox）
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
            let place = data.features[0].place_name.replace(/\s*\d{5,6}\s*$/, '').replace(/,\s*$/, '').trim();
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
            let place = dataEn.features[0].place_name.replace(/\s*\d{5,6}\s*$/, '').replace(/,\s*$/, '').trim();
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
        maxzoom: 18,  // 允许更高缩放级别
        layout: { visibility: 'none' },
        paint: {
          // 权重：照片越多，热力越强（调小权重值）
          'heatmap-weight': [
            'interpolate', ['linear'], ['get', 'photoCount'],
            1, 0.2,   // 1张照片
            5, 0.4,   // 5张照片
            10, 0.6,  // 10张照片
            20, 0.8   // 20张及以上
          ],
          // 强度随缩放级别变化（降低整体强度）
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1.5, 5, 1.2, 10, 1.5, 15, 2],
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
  }, [mapEntered, mapboxReady]);

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
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#ff6b6b"/><circle cx="12" cy="12" r="5" fill="white"/></svg>`;
    }
    
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      mapRef.current.flyTo({ center: [m.lng, m.lat], zoom: Math.max(mapRef.current.getZoom(), 15), duration: 800 });
      setTimeout(async () => {
        const point = mapRef.current.project([m.lng, m.lat]);
        let fullMarker = m;
        
        // 加载完整的标记数据（包括所有照片）
        if (window.electronAPI?.getMarkerDetail) {
          // Electron 环境
          const detail = await window.electronAPI.getMarkerDetail(m.id);
          if (detail) fullMarker = detail;
        } else {
          // Web 环境 - 从 IndexedDB 加载完整照片数据
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

  // 渲染所有标记
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
      if (mapMarkersRef.current[m.id]) return; // 已存在，跳过
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

  // 地图加载完成后渲染标记
  useEffect(() => {
    if (mapLoaded) renderMarkers();
  }, [markers, mapLoaded, renderMarkers]);

  // 更新热力图数据
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

  // 切换热力图显示
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

  // 设为封面照片（将该照片移到 photos 数组第一位）
  const handleSetCover = useCallback(async (markerId, photo) => {
    try {
      const { webStorage } = await import('./api/index.js');
      const photos = await api.photos.getByMarkerId(markerId);
      // 把目标照片移到第一位，重新分配 order
      const reordered = [photo, ...photos.filter(p => p.id !== photo.id)];
      for (let i = 0; i < reordered.length; i++) {
        await webStorage.photos.add(markerId, { ...reordered[i], order: i, markerId });
      }
      // firstPhoto 存完整对象（含 data），地图标记缩略图才能更新
      await webStorage.markers.update(markerId, {
        firstPhoto: { ...reordered[0], order: 0 }
      });
      // 删除旧的地图标记，让 renderMarkers 重建以更新缩略图
      if (mapMarkersRef.current[markerId]) {
        mapMarkersRef.current[markerId].remove();
        delete mapMarkersRef.current[markerId];
      }
      await refreshMarkers();
      showToast('success', '已设为封面');
    } catch (e) {
      console.error('设为封面失败:', e);
      showToast('error', '操作失败');
    }
  }, [refreshMarkers, showToast]);

  // 从标记列表删除单张照片
  const handleDeletePhotoFromList = useCallback(async (markerId, photoId) => {
    if (!confirm('确定删除这张照片？')) return;
    try {
      await api.photos.delete(markerId, photoId);
      const remaining = await api.photos.getByMarkerId(markerId);
      if (remaining.length === 0) {
        await api.markers.delete(markerId);
      } else {
        const { webStorage } = await import('./api/index.js');
        await webStorage.markers.update(markerId, {
          photoCount: remaining.length,
          firstPhoto: remaining[0] || null
        });
        // 删除旧的地图标记，让 renderMarkers 重建以更新缩略图
        if (mapMarkersRef.current[markerId]) {
          mapMarkersRef.current[markerId].remove();
          delete mapMarkersRef.current[markerId];
        }
      }
      await refreshMarkers();
      showToast('success', '照片已删除');
    } catch (e) {
      console.error('删除照片失败:', e);
      showToast('error', '删除失败');
    }
  }, [refreshMarkers, showToast]);

  // 向已有标记添加照片
  const handleAddPhotoToMarker = useCallback(async (markerId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      showToast('info', '正在添加照片...', 1000);
      try {
        const photoPromises = files.map(file => new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve({ data: ev.target.result, note: '' });
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        }));
        const photosData = (await Promise.all(photoPromises)).filter(Boolean);
        if (photosData.length === 0) return;
        await api.photos.addBatch(markerId, photosData);
        const allPhotos = await api.photos.getByMarkerId(markerId);
        const { webStorage } = await import('./api/index.js');
        await webStorage.markers.update(markerId, {
          photoCount: allPhotos.length,
          firstPhoto: allPhotos[0] || null
        });
        // 删除旧的地图标记，让 renderMarkers 重建以更新缩略图
        if (mapMarkersRef.current[markerId]) {
          mapMarkersRef.current[markerId].remove();
          delete mapMarkersRef.current[markerId];
        }
        await refreshMarkers();
        showToast('success', `已添加 ${photosData.length} 张照片`);
      } catch (err) {
        console.error('添加照片失败:', err);
        showToast('error', '添加失败');
      }
    };
    input.click();
  }, [refreshMarkers, showToast]);

  // 添加照片标记（必须选择照片）
  const addPhotoMarker = async (latlng) => {
    // 立即隐藏右键菜单和预览图钉
    setContextMenu(null);
    setPreviewPin(null);

    // 生成 ID，立即放置占位标记到正确坐标
    const markerId = uuidv4();
    const placeholderMarker = {
      id: markerId,
      lat: latlng.lat,
      lng: latlng.lng,
      name: '',
      photoCount: 0,
      firstPhoto: null,
      createdAt: Date.now()
    };
    setMarkers(prev => [...prev, placeholderMarker]);
    setNewMarkerIds(prev => new Set(prev).add(markerId));
    setTimeout(() => setNewMarkerIds(prev => { const s = new Set(prev); s.delete(markerId); return s; }), 600);

    if (window.electronAPI) {
      // Electron 环境
      showToast('info', '正在打开文件选择器...', 1000);
      
      const photos = await window.electronAPI.selectPhotos();
      if (!photos || photos.length === 0) {
        // 用户取消选择，移除占位标记
        setMarkers(prev => prev.filter(m => m.id !== markerId));
        return;
      }
      
      showToast('info', '正在处理照片...', 1000);
      
      const name = await fetchPlaceName(latlng.lat, latlng.lng);
      
      const newMarker = {
        id: markerId,
        lat: latlng.lat,
        lng: latlng.lng,
        name,
        photos: photos.map(p => ({ id: p.id, data: p.data, note: '' })),
        photoCount: photos.length,
        firstPhoto: photos[0] ? { id: photos[0].id, data: photos[0].data } : null,
        createdAt: Date.now()
      };
      
      // 用完整标记替换占位标记，同时更新地图标记元素
      setMarkers(prev => prev.map(m => m.id === markerId ? newMarker : m));
      // 移除旧的占位 Mapbox marker，让 renderMarkers 重建带照片的版本
      if (mapMarkersRef.current[markerId]) {
        mapMarkersRef.current[markerId].remove();
        delete mapMarkersRef.current[markerId];
      }
      
      window.electronAPI.addMarker(newMarker);
      showToast('success', `已添加 ${photos.length} 张照片`);
    } else {
      // Web 环境
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) {
          setMarkers(prev => prev.filter(m => m.id !== markerId));
          return;
        }
        
        showToast('info', '正在处理照片...', 1000);
        
        try {
          const photoPromises = files.map(file => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({ data: e.target.result, note: '' });
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          }));
          
          const photosData = await Promise.all(photoPromises);
          const validPhotos = photosData.filter(p => p !== null);
          
          if (validPhotos.length === 0) {
            showToast('error', '没有有效的照片');
            setMarkers(prev => prev.filter(m => m.id !== markerId));
            return;
          }
          
          const name = await fetchPlaceName(latlng.lat, latlng.lng);
          
          // 直接构造标记并保存，复用已生成的 markerId
          const markerObj = {
            id: markerId,
            lat: latlng.lat,
            lng: latlng.lng,
            name,
            createdAt: Date.now(),
            photoCount: 0,
          };
          const { webStorage } = await import('./api/index.js');
          await webStorage.markers.save(markerObj);
          const savedPhotos = await api.photos.addBatch(markerId, validPhotos);
          const firstPhotoLight = savedPhotos[0] ? { id: savedPhotos[0].id, note: savedPhotos[0].note || '' } : null;
          await webStorage.markers.update(markerId, { photoCount: savedPhotos.length, firstPhoto: firstPhotoLight });
          
          const lightMarker = { ...markerObj, photoCount: savedPhotos.length, firstPhoto: savedPhotos[0] || null };
          
          // 用完整标记替换占位标记，并更新地图元素
          setMarkers(prev => prev.map(m => m.id === markerId ? lightMarker : m));
          if (mapMarkersRef.current[markerId]) {
            mapMarkersRef.current[markerId].remove();
            delete mapMarkersRef.current[markerId];
          }
          
          showToast('success', `已添加 ${savedPhotos.length} 张照片`);
        } catch (error) {
          console.error('添加照片错误:', error);
          showToast('error', '添加照片失败: ' + error.message);
          setMarkers(prev => prev.filter(m => m.id !== markerId));
        }
      };
      input.click();
    }
  };
  
  // 保存照片备注
  const savePhotoNote = async (markerId, photoIndex, note) => {
    if (window.electronAPI?.updatePhotoNote) {
      await window.electronAPI.updatePhotoNote(markerId, photoIndex, note);
      showToast('success', '备注已保存');
    } else {
      // Web 环境：需要 photoId 而不是 photoIndex
      // 暂时跳过，因为 noteEditor 功能可能已废弃
      console.warn('savePhotoNote: Web 环境暂不支持');
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
    if (!window.confirm('确定要删除这个标记点吗？\n删除后无法恢复。')) return;
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

  // 搜索词变化时重置键盘焦点
  useEffect(() => {
    setSearchFocusIndex(-1);
  }, [markerListSearch]);
  
  // 保存搜索历史
  const saveToHistory = useCallback((result) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.name !== result.name);
      const newHistory = [{ name: result.name, address: result.address, lng: result.lng, lat: result.lat }, ...filtered].slice(0, 10);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('uiThemeStyle', uiThemeStyle);
  }, [uiThemeStyle]);
  
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

  const handleOpenVillage = () => {
    if (!isOnline) {
      showToast('info', '地球村功能需要联网后使用');
      return;
    }
    if (villageTransitioning) return;
    const btn = globeVillageBtnRef.current;
    const rect = btn?.getBoundingClientRect();
    if (!rect || !btn) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let targetW = Math.min(vw * 0.92, 1080);
    let targetH = Math.min(vh * 0.82, 640);

    if (vw <= 900) {
      targetW = Math.min(vw * 0.96, 760);
      targetH = Math.min(vh * 0.9, 760);
    } else if (vw <= 1180) {
      targetW = Math.min(vw * 0.95, 920);
      targetH = Math.min(vh * 0.88, 700);
    }

    setVillageRect({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      size: Math.max(btn.offsetWidth, btn.offsetHeight),
      targetW,
      targetH,
    });

    setVillageClosing(false);
    setVillageTransitioning(true);
    setVillageReady(false);
    setShowVillageModal(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setVillageReady(true);
        setVillageTransitioning(false);
      });
    });
  };

  const handleCloseVillage = () => {
    if (villageTransitioning) return;
    setVillageTransitioning(true);
    setVillageClosing(true);
    setVillageReady(false);
    setFriendActionMenu('');
    setTimeout(() => {
      setShowVillageModal(false);
      setVillageClosing(false);
      setVillageTransitioning(false);
    }, 560);
  };

  const handleOpenMarkerList = useCallback(() => {
    if (markerListTransitioning) return;
    const btn = markerManageBtnRef.current;
    const rect = btn?.getBoundingClientRect();
    if (!rect || !btn) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let targetW = Math.min(vw * 0.9, 620);
    let targetH = Math.min(vh * 0.85, 800);

    if (vw <= 900) {
      targetW = Math.min(vw * 0.94, 760);
      targetH = Math.min(vh * 0.9, 760);
    }

    setMarkerListRect({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      size: Math.max(btn.offsetWidth, btn.offsetHeight),
      targetW,
      targetH,
    });

    setMarkerListClosing(false);
    setMarkerListTransitioning(true);
    setMarkerListContentHidden(true);
    setMarkerListReady(false);
    setMarkerListMorphDone(false);
    setShowMarkerList(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setMarkerListReady(true);
        setMarkerListContentHidden(false);
        setMarkerListTransitioning(false);
        // 变形动画结束后移除 transform，恢复文字清晰度
        setTimeout(() => setMarkerListMorphDone(true), 720);
      });
    });
  }, [markerListTransitioning]);

  const handleCloseMarkerList = () => {
    closeMarkerListWithAnimation();
  };

  const handleAddFriend = () => {
    const val = pendingFriendId.trim();
    if (!val) return;
    if (manualFriends.includes(val) || villageMembers.some(m => m.id === val)) {
      setPendingFriendId('');
      return;
    }
    setManualFriends(prev => [...prev, val]);
    setPendingFriendId('');
  };

  const handleChatFriend = (friendId) => {
    showToast('info', `暂未接入聊天服务：${friendId}`);
  };



  // 检测是否为 Web 版本 - 多重检测确保准确性
  const isWebVersion = !window.electronAPI || 
                       window.location.pathname.includes('index-web') ||
                       window.location.port === '3001' ||
                       window.location.hostname.includes('netlify') ||
                       window.location.hostname.includes('vercel');
  
  // 调试信息（仅在需要时启用）
  // console.log('App 组件渲染 - Web 版本:', isWebVersion, '已登录:', isLoggedIn, '地图已加载:', mapLoaded);
  // console.log('window.electronAPI:', window.electronAPI);
  // console.log('当前URL:', window.location.href);

  // 处理登录
  const handleLogin = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    setUserChose(true);
    setShowLoginModal(false);
    showToast('success', '登录成功！');
  };

  // 跳过登录
  const handleSkipLogin = () => {
    setIsLoggedIn(true);
    setUserChose(true);
    setShowLoginModal(false);
    showToast('info', '以游客模式继续');
  };

  const handleEnterMapFromLoader = useCallback(() => {
    if (navigator.onLine) {
      setOfflinePrompted(false);
      setMapEntered(true);
      return;
    }
    if (offlinePrompted) return;
    setOfflinePrompted(true);
    const goOffline = window.confirm('当前无网络连接。是否以离线模式进入地图？\n\n离线模式可查看/新增本地标记与照片，但地球村不可用。');
    if (goOffline) {
      setMapEntered(true);
      showToast('info', '已进入离线模式');
    }
  }, [showToast, offlinePrompted]);

  // 退出登录
  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
    setUserChose(false);
    setMapLoaded(false);
    setMapEntered(false);
    showToast('info', '已退出登录');
  };

  // 加载阶段：显示地球加载器，不显示任何按钮
  if (!mapboxReady) {
    return (
      <FilmLoader 
        onComplete={() => {
          // 进度条完成后，设置 mapboxReady 为 true
          setMapboxReady(true);
        }}
        onShowLogin={() => {}}
      />
    );
  }

  // 进度条完成后，用户未做出选择：显示登录按钮和禁用的进入地图按钮
  if (!userChose) {
    return (
      <>
        {/* 继续显示地球背景，进入地图按钮禁用 */}
        <FilmLoader 
          onComplete={() => {}}
          onShowLogin={() => {}}
          canEnter={false}
        />
        {/* 登录按钮和禁用的进入地图按钮 */}
        <LoginButtons 
          onLogin={handleLogin}
          onSkip={handleSkipLogin}
          onLogout={handleLogout}
          onEnterMap={() => {}}
          isLoggedIn={false}
          showButtons={true}
        />
      </>
    );
  }

  // 用户已做出选择，尚未进入地图：显示地球、退出按钮和可点击进入地图按钮
  if (!mapEntered) {
    return (
      <>
        {/* 地球背景，进入地图按钮可用，点击后执行飞行动画再进入 */}
        <FilmLoader 
          onComplete={() => {}}
          onShowLogin={handleEnterMapFromLoader}
          canEnter={true}
        />
        {/* 右上角退出按钮 */}
        <LoginButtons 
          onLogin={handleLogin}
          onSkip={handleSkipLogin}
          onLogout={handleLogout}
          onEnterMap={() => {}}
          isLoggedIn={true}
          showButtons={false}
        />
      </>
    );
  }

  // 进入地图后，不再显示登录按钮组件

  // Web 版本样式已在 main-web.jsx 中导入

  return (
      <div className={`app ${isWebVersion ? 'web-app' : ''} ui-theme-${uiThemeStyle}`}>
      
      {/* 无边框窗口拖拽区域 */}
      <div className="window-drag-region" />
      
      <div ref={mapContainerRef} className={`map-container ${measureMode ? 'measure-mode' : ''}`} />
      
      {/* 顶部搜索栏 */}
      {!measureMode && (
        <div className="search-bar-container">
          {/* 好友&生活按钮 - 搜索框左侧 */}
          <button
            ref={globeVillageBtnRef}
            className={`globe-village-btn ${showVillageModal ? 'active origin-hidden' : ''} ${!isOnline ? 'disabled' : ''}`}
            onClick={handleOpenVillage}
            title={isOnline ? '地球村' : '地球村（离线不可用）'}
          >
            <span className="globe-village-icon">🌍</span>
          </button>
          <div className="search-bar-wrapper">
            <label className="search-bar">
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
                <button 
                  type="button"
                  className="search-clear" 
                  onClick={(e) => {
                    e.preventDefault();
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchResults(false);
                    setSelectedResultIndex(-1);
                    searchInputRef.current?.focus();
                  }}
                >✕</button>
              )}
            </label>
            
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
          
          {/* Web 版本下载按钮 - 搜索栏右侧固定位置 */}
          {isWebVersion && isLoggedIn && (
            <div className="web-download-beside-search">
              <WebDownloadButton />
            </div>
          )}
        </div>
      )}
      
      {/* 点击其他地方关闭搜索结果 */}
      {showSearchResults && (
        <div className="search-overlay" onClick={() => setShowSearchResults(false)} />
      )}

      {/* 左上角工具栏 */}
      {!measureMode && (
        <div className="toolbar toolbar-left">
          <button onClick={goToMyLocation} data-tooltip="定位">
            <span className="main-tool-icon">🧭</span>
          </button>
          <button onClick={() => window.location.reload()} data-tooltip="刷新">
            <span className="main-tool-icon">🔄</span>
          </button>
        </div>
      )}

      {/* 右上角工具栏 */}
      {!measureMode && (
        <div className="toolbar toolbar-right">
          <button onClick={zoomIn} data-tooltip="放大">
            <span className="main-tool-icon">➕</span>
          </button>
          <button onClick={zoomOut} data-tooltip="缩小">
            <span className="main-tool-icon">➖</span>
          </button>
          <button 
            onClick={() => {
              console.log('热力图按钮被点击，当前状态:', heatmapMode);
              setHeatmapMode(!heatmapMode);
            }} 
            className={heatmapMode ? 'active' : ''}
            data-tooltip="热力图"
          >
            <span className="main-tool-icon">🔥</span>
          </button>
          <button
            onClick={() => setShowLife(true)}
            className={showLife ? 'active' : ''}
            data-tooltip="生活"
          >
            <span className="main-tool-icon">🌟</span>
          </button>
          <button onClick={async () => { 
            setTempSettings(mapSettings); 
            setShowSettings(true);
            if (window.electronAPI) {
              const stats = await window.electronAPI.getCacheStats();
              setCacheStats(stats);
            }
          }} className="settings-btn" data-tooltip="设置">
            <span className="main-tool-icon">⚙️</span>
          </button>
        </div>
      )}

      {/* 右下角标记管理按钮 */}
      {!measureMode && (
        <button 
          ref={markerManageBtnRef}
          className={`marker-count-btn ${showMarkerList ? 'active origin-hidden' : ''} ${markerBtnReveal ? 'reveal-on-close' : ''}`}
          onClick={handleOpenMarkerList}
        >
          <div className="marker-stats">
            <div className="stat-item">
              <span className="stat-icon">🖼️</span>
              <span className="stat-num">{totalPhotos}</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📍</span>
              <span className="stat-num">{markers.length}</span>
            </div>
          </div>
        </button>
      )}

      {/* 标记列表面板 */}
      {showMarkerList && (
        <div className={`marker-list-overlay ${markerListReady ? 'open' : ''} ${markerListClosing ? 'closing' : ''}`} onClick={handleCloseMarkerList}>
          <div
            className={`marker-list-panel themed-floating-panel theme-${uiThemeStyle} ${markerListReady ? 'open' : ''} ${markerListClosing ? 'closing' : ''} ${markerListContentHidden ? 'content-hidden' : ''} ${markerListMorphDone ? 'morph-done' : ''}`}
            style={markerListRect ? {
              '--origin-x': `${markerListRect.x}px`,
              '--origin-y': `${markerListRect.y}px`,
              '--origin-size': `${markerListRect.size}px`,
              '--target-w': `${markerListRect.targetW}px`,
              '--target-h': `${markerListRect.targetH}px`,
            } : undefined}
            onClick={e => {
              e.stopPropagation();
              setShowSortMenu(false);
              setShowLayoutMenu(false);
              setShowTimeFilterMenu(false);
            }}
          >
            <div className="marker-list-header">
              <h3>📍 所有标记</h3>
              <div className="header-actions">
                <button
                  className="batch-toggle-btn"
                  onClick={() => {
                    setBatchMode(!batchMode);
                    setSelectedPhotos([]);
                  }}
                  style={{ background: batchMode ? '#ef4444' : '#4a90e2' }}
                >
                  {batchMode ? '✕ 退出批量' : '📋 批量操作'}
                </button>
                <button 
                  className="panel-close" 
                  onClick={handleCloseMarkerList}
                >✕</button>
              </div>
            </div>
            <div className="marker-list-toolbar">
              <input
                type="text"
                placeholder="搜索地名、备注或图片描述..."
                value={markerListSearch}
                onChange={e => {
                  const val = e.target.value;
                  setMarkerListSearch(val);
                  // 备注搜索
                  if (val.trim()) {
                    setIsNoteSearching(true);
                    api.photos.searchNotes(val).then(results => {
                      setNoteSearchResults(results || []);
                      setIsNoteSearching(false);
                    }).catch(() => {
                      setNoteSearchResults([]);
                      setIsNoteSearching(false);
                    });
                  } else {
                    setNoteSearchResults([]);
                  }
                  // 语义搜索
                  if (val.trim()) {
                    setIsSemanticSearching(true);
                    api.photos.searchByContent(val, 20).then(results => {
                      setSemanticResults(results || []);
                      setIsSemanticSearching(false);
                    }).catch(() => {
                      setSemanticResults([]);
                      setIsSemanticSearching(false);
                    });
                  } else {
                    setSemanticResults([]);
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSearchFocusIndex(0);
                    searchResultsRef.current?.focus();
                  } else if (e.key === 'Enter' && markerListSearch.trim()) {
                    e.preventDefault();
                    setSearchFocusIndex(0);
                    searchResultsRef.current?.focus();
                  }
                }}
                className="marker-search"
              />
              <div className="toolbar-actions">
                <div className="dropdown-wrapper">
                  <button
                    className={`toolbar-btn ${showSortMenu ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSortMenu(!showSortMenu);
                      setShowLayoutMenu(false);
                      setShowTimeFilterMenu(false);
                    }}
                  >
                    排序方式 ▾
                  </button>
                  {showSortMenu && (
                    <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                      <div
                        className={`dropdown-item ${markerListSort === 'time' ? 'active' : ''}`}
                        onClick={() => { setMarkerListSort('time'); setShowSortMenu(false); }}
                      >
                        {markerListSort === 'time' ? '✓ ' : ''}时间排序
                      </div>
                      <div
                        className={`dropdown-item ${markerListSort === 'name' ? 'active' : ''}`}
                        onClick={() => { setMarkerListSort('name'); setShowSortMenu(false); }}
                      >
                        {markerListSort === 'name' ? '✓ ' : ''}地名排序
                      </div>
                    </div>
                  )}
                </div>
                <div className="dropdown-wrapper">
                  <button
                    className={`toolbar-btn ${showLayoutMenu ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLayoutMenu(!showLayoutMenu);
                      setShowSortMenu(false);
                      setShowTimeFilterMenu(false);
                    }}
                  >
                    布局方式 ▾
                  </button>
                  {showLayoutMenu && (
                    <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                      <div
                        className={`dropdown-item ${markerListLayout === 'list' ? 'active' : ''}`}
                        onClick={() => { setMarkerListLayout('list'); setShowLayoutMenu(false); }}
                      >
                        {markerListLayout === 'list' ? '✓ ' : ''}列表布局
                      </div>
                      <div
                        className={`dropdown-item ${markerListLayout === 'grid' ? 'active' : ''}`}
                        onClick={() => { setMarkerListLayout('grid'); setShowLayoutMenu(false); }}
                      >
                        {markerListLayout === 'grid' ? '✓ ' : ''}网格布局
                      </div>
                    </div>
                  )}
                </div>
                <div className="dropdown-wrapper">
                  <button
                    className={`toolbar-btn ${showTimeFilterMenu ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTimeFilterMenu(!showTimeFilterMenu);
                      setShowSortMenu(false);
                      setShowLayoutMenu(false);
                    }}
                  >
                    时间范围 ▾
                  </button>
                  {showTimeFilterMenu && (
                    <div className="dropdown-menu time-filter-menu" onClick={(e) => e.stopPropagation()}>
                      <div
                        className={`dropdown-item ${markerListTimeFilter === 'all' ? 'active' : ''}`}
                        onClick={() => { setMarkerListTimeFilter('all'); setShowTimeFilterMenu(false); }}
                      >
                        {markerListTimeFilter === 'all' ? '✓ ' : ''}全部时间
                      </div>
                      <div
                        className={`dropdown-item ${markerListTimeFilter === 'week' ? 'active' : ''}`}
                        onClick={() => { setMarkerListTimeFilter('week'); setShowTimeFilterMenu(false); }}
                      >
                        {markerListTimeFilter === 'week' ? '✓ ' : ''}最近一周
                      </div>
                      <div
                        className={`dropdown-item ${markerListTimeFilter === 'month' ? 'active' : ''}`}
                        onClick={() => { setMarkerListTimeFilter('month'); setShowTimeFilterMenu(false); }}
                      >
                        {markerListTimeFilter === 'month' ? '✓ ' : ''}最近一月
                      </div>
                      <div
                        className={`dropdown-item ${markerListTimeFilter === 'year' ? 'active' : ''}`}
                        onClick={() => { setMarkerListTimeFilter('year'); setShowTimeFilterMenu(false); }}
                      >
                        {markerListTimeFilter === 'year' ? '✓ ' : ''}最近一年
                      </div>
                      <div
                        className={`dropdown-item ${markerListTimeFilter === 'custom' ? 'active' : ''}`}
                        onClick={() => { setMarkerListTimeFilter('custom'); }}
                      >
                        {markerListTimeFilter === 'custom' ? '✓ ' : ''}自定义时间范围
                      </div>
                      {markerListTimeFilter === 'custom' && (
                        <div className="custom-date-range" onClick={(e) => e.stopPropagation()}>
                          <div className="date-field">
                            <label>从</label>
                            <input
                              type="date"
                              value={markerListTimeRange.start}
                              onChange={e => setMarkerListTimeRange(prev => ({ ...prev, start: e.target.value }))}
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                          <div className="date-field">
                            <label>至</label>
                            <input
                              type="date"
                              value={markerListTimeRange.end}
                              onChange={e => setMarkerListTimeRange(prev => ({ ...prev, end: e.target.value }))}
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {embeddingProgress && (
              <div className="embedding-progress">
                <div className="embedding-progress-bar">
                  <div className="embedding-progress-fill" style={{ width: `${embeddingProgress.percent}%` }} />
                </div>
                <span className="embedding-progress-text">
                  下载语义搜索模型 {embeddingProgress.percent}%
                </span>
              </div>
            )}

            <div className="marker-list-content">
              {(() => {
                const filteredMarkers = markers
                  .filter(m => {
                    // 搜索过滤
                    if (markerListSearch) {
                      const name = m.name || `${m.lat.toFixed(3)}°, ${m.lng.toFixed(3)}°`;
                      if (!matchMarkerName(markerListSearch, name)) return false;
                    }
                    // 时间范围过滤
                    if (markerListTimeFilter !== 'all') {
                      const t = m.createdAt || 0;
                      const now = Date.now();
                      if (markerListTimeFilter === 'week' && t < now - 7 * 24 * 60 * 60 * 1000) return false;
                      if (markerListTimeFilter === 'month' && t < now - 30 * 24 * 60 * 60 * 1000) return false;
                      if (markerListTimeFilter === 'year' && t < now - 365 * 24 * 60 * 60 * 1000) return false;
                      if (markerListTimeFilter === 'custom') {
                        const start = markerListTimeRange.start ? new Date(markerListTimeRange.start).getTime() : 0;
                        const end = markerListTimeRange.end ? new Date(markerListTimeRange.end).getTime() : Infinity;
                        if (t < start || t > end) return false;
                      }
                    }
                    return true;
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
                
                // 有搜索词时，显示标记、备注、语义分组
                if (markerListSearch) {
                  const hasMarkers = filteredMarkers.length > 0;
                  const hasNotes = noteSearchResults.length > 0;
                  // 过滤掉已在关键词结果中出现的语义结果
                  const keywordMarkerIds = new Set(filteredMarkers.map(m => m.id));
                  const noteMarkerIds = new Set(noteSearchResults.map(r => r.markerId));
                  const dedupedSemantic = semanticResults.filter(r =>
                    !keywordMarkerIds.has(r.markerId) && !noteMarkerIds.has(r.markerId)
                  );
                  const hasSemantic = dedupedSemantic.length > 0;

                  if (!hasMarkers && !hasNotes && !hasSemantic && !isNoteSearching && !isSemanticSearching) {
                    return <div className="marker-list-empty">未找到匹配 "{markerListSearch}" 的结果</div>;
                  }

                  const displayedMarkers = filteredMarkers.slice(0, 10);
                  const displayedNotes = noteSearchResults.slice(0, 10);
                  const displayedSemantic = dedupedSemantic.slice(0, 10);
                  const totalDisplayed = displayedMarkers.length + displayedNotes.length + displayedSemantic.length;

                  const handleSearchKeyDown = (e) => {
                    if (totalDisplayed === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSearchFocusIndex(prev => {
                        const next = Math.min(prev + 1, totalDisplayed - 1);
                        const el = searchResultsRef.current?.querySelector(`[data-index="${next}"]`);
                        el?.scrollIntoView({ block: 'nearest' });
                        return next;
                      });
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSearchFocusIndex(prev => {
                        if (prev <= 0) {
                          document.querySelector('.marker-search')?.focus();
                          return -1;
                        }
                        const next = prev - 1;
                        const el = searchResultsRef.current?.querySelector(`[data-index="${next}"]`);
                        el?.scrollIntoView({ block: 'nearest' });
                        return next;
                      });
                    } else if (e.key === 'Enter' && searchFocusIndex >= 0) {
                      e.preventDefault();
                      const el = searchResultsRef.current?.querySelector(`[data-index="${searchFocusIndex}"]`);
                      el?.click();
                    }
                  };

                  return (
                    <div
                      ref={searchResultsRef}
                      tabIndex={-1}
                      className="search-results-grouped"
                      onKeyDown={handleSearchKeyDown}
                    >
                      {/* 标记结果 */}
                      {hasMarkers && (
                        <div className="result-group">
                          <div className="result-group-title">📍 标记 ({filteredMarkers.length})</div>
                          {displayedMarkers.map((m, idx) => (
                            <MarkerListItem
                              key={m.id}
                              marker={m}
                              highlight={markerListSearch}
                              focused={searchFocusIndex === idx}
                              dataIndex={idx}
                              allMarkers={markers}
                              batchMode={batchMode}
                              selectedPhotos={selectedPhotos}
                              onPhotoSelect={handlePhotoSelect}
                              onClick={async () => {
                                if (batchMode) return; // 批量模式下不响应点击
                                handleCloseMarkerList();
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
                          {displayedNotes.map((result, i) => {
                            const noteIdx = displayedMarkers.length + i;
                            return (
                              <div
                                key={`note-${i}`}
                                data-index={noteIdx}
                                className={`marker-list-item note-item ${searchFocusIndex === noteIdx ? 'focused' : ''}`}
                                onClick={async () => {
                                  handleCloseMarkerList();
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
                                <LazyPhoto photo={result.data ? result : { id: result.fileId || result.id }} className="marker-list-thumb" />
                                <div className="marker-list-info">
                                  <div className="marker-list-name">"{highlightText(result.note, markerListSearch)}"</div>
                                  <div className="marker-list-meta">
                                    📍 {highlightText(result.markerName || `${result.lat.toFixed(3)}°, ${result.lng.toFixed(3)}°`, markerListSearch)}
                                  </div>
                                </div>
                              </div>
                            );}
                          )}
                          {noteSearchResults.length > 10 && (
                            <div className="result-more">还有 {noteSearchResults.length - 10} 个结果...</div>
                          )}
                        </div>
                      )}

                      {/* 语义搜索结果 */}
                      {isSemanticSearching ? (
                        <div className="result-group">
                          <div className="result-group-title">🖼️ 内容匹配</div>
                          <div className="marker-list-empty"><span className="loading-spinner"></span> 分析中...</div>
                        </div>
                      ) : hasSemantic && (
                        <div className="result-group">
                          <div className="result-group-title">🖼️ 内容匹配 ({semanticResults.length})</div>
                          {displayedSemantic.map((result, i) => {
                            const noteIdx = displayedMarkers.length + displayedNotes.length + i;
                            return (
                              <div
                                key={`semantic-${i}`}
                                data-index={noteIdx}
                                className={`marker-list-item note-item ${searchFocusIndex === noteIdx ? 'focused' : ''}`}
                                onClick={async () => {
                                  handleCloseMarkerList();
                                  if (mapRef.current) {
                                    mapRef.current.flyTo({ center: [result.lng, result.lat], zoom: 15, duration: 1000 });
                                  }
                                  if (window.electronAPI?.getMarkerDetail) {
                                    const detail = await window.electronAPI.getMarkerDetail(result.markerId);
                                    if (detail) {
                                      const photoIndex = detail.photos.findIndex(p => p.id === result.photoId);
                                      setPhotoViewer({
                                        photos: detail.photos,
                                        index: photoIndex >= 0 ? photoIndex : 0,
                                        markerId: result.markerId
                                      });
                                    }
                                  }
                                }}
                              >
                                <LazyPhoto photo={{ id: result.photoId }} className="marker-list-thumb" />
                                <div className="marker-list-info">
                                  <div className="marker-list-name">
                                    🖼️ {result.note || result.markerName || '照片'}
                                  </div>
                                  <div className="marker-list-meta">
                                    📍 {result.markerName || `${result.lat.toFixed(3)}°, ${result.lng.toFixed(3)}°`}
                                    <span className="semantic-score"> 匹配度 {Math.round(result.score * 100)}%</span>
                                  </div>
                                </div>
                              </div>
                            );}
                          )}
                          {semanticResults.length > 10 && (
                            <div className="result-more">还有 {semanticResults.length - 10} 个结果...</div>
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
                
                // 网格布局
                if (markerListLayout === 'grid') {
                  return (
                    <div className="marker-grid-container">
                      {filteredMarkers.map(m => (
                        <MarkerGridItem
                          key={m.id}
                          marker={m}
                          allMarkers={markers}
                          batchMode={batchMode}
                          selectedPhotos={selectedPhotos}
                          onPhotoSelect={handlePhotoSelect}
                          onSetCover={handleSetCover}
                          onDeletePhoto={handleDeletePhotoFromList}
                          onAddPhoto={handleAddPhotoToMarker}
                          onClick={async () => {
                            handleCloseMarkerList();
                            if (mapRef.current) {
                              mapRef.current.flyTo({ center: [m.lng, m.lat], zoom: 15, duration: 1000 });
                              setTimeout(async () => {
                                const point = mapRef.current.project([m.lng, m.lat]);
                                let fullMarker = m;
                                
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
                              }, 1050);
                            }
                          }}
                        />
                      ))}
                    </div>
                  );
                }
                
                // 列表布局（使用虚拟滚动）
                const Row = ({ index, style }) => {
                  const m = filteredMarkers[index];
                  return (
                    <div style={style}>
                      <MarkerListItem 
                        marker={m}
                        batchMode={batchMode}
                        allMarkers={markers}
                        selectedPhotos={selectedPhotos}
                        onPhotoSelect={handlePhotoSelect}
                        onSetCover={handleSetCover}
                        onDeletePhoto={handleDeletePhotoFromList}
                        onAddPhoto={handleAddPhotoToMarker}
                        onClick={async () => {
                          if (batchMode) return; // 批量模式下不响应点击
                          handleCloseMarkerList();
                          if (mapRef.current) {
                            mapRef.current.flyTo({ center: [m.lng, m.lat], zoom: 15, duration: 1000 });
                            setTimeout(async () => {
                              const point = mapRef.current.project([m.lng, m.lat]);
                              let fullMarker = m;
                              
                              // 加载完整的标记数据
                              if (window.electronAPI?.getMarkerDetail) {
                                const detail = await window.electronAPI.getMarkerDetail(m.id);
                                if (detail) fullMarker = detail;
                              } else {
                                // Web 环境
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
                            }, 1050);
                          }
                        }}
                      />
                    </div>
                  );
                };
                
                // 使用普通滚动代替虚拟滚动，以支持动态高度
                return (
                  <div className="marker-list-scroll">
                    {filteredMarkers.map(m => (
                      <MarkerListItem 
                        key={m.id}
                        marker={m}
                        allMarkers={markers}
                        batchMode={batchMode}
                        selectedPhotos={selectedPhotos}
                        onPhotoSelect={handlePhotoSelect}
                        onSetCover={handleSetCover}
                        onDeletePhoto={handleDeletePhotoFromList}
                        onAddPhoto={handleAddPhotoToMarker}
                        onClick={async () => {
                          if (batchMode) return;
                          handleCloseMarkerList();
                          if (mapRef.current) {
                            mapRef.current.flyTo({ center: [m.lng, m.lat], zoom: 15, duration: 1000 });
                            setTimeout(async () => {
                              const point = mapRef.current.project([m.lng, m.lat]);
                              let fullMarker = m;
                              
                              // 加载完整的标记数据
                              if (window.electronAPI?.getMarkerDetail) {
                                const detail = await window.electronAPI.getMarkerDetail(m.id);
                                if (detail) fullMarker = detail;
                              } else {
                                // Web 环境
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
                            }, 1050);
                          }
                        }}
                      />
                    ))}
                  </div>
                );
              })()}
            </div>
            
            {/* 批量操作栏 - 固定在底部 */}
            {batchMode && selectedPhotos.length > 0 && (
              <div className="batch-actions-bar">
                <span className="batch-count">已选 {selectedPhotos.length} 张</span>
                <div className="batch-buttons">
                  <button 
                    className="batch-btn batch-merge"
                    onClick={() => {
                      if (selectedPhotos.length < 2) {
                        alert('请至少选择2张照片进行整合');
                        return;
                      }
                      setShowMergeDialog(true);
                    }}
                    disabled={selectedPhotos.length < 2}
                  >
                    🔗 整合
                  </button>
                  <button 
                    className="batch-btn batch-delete"
                    onClick={async () => {
                      if (!confirm(`确定要删除选中的 ${selectedPhotos.length} 张照片吗？`)) return;
                      
                      try {
                        // 按标记分组
                        const photosByMarker = {};
                        selectedPhotos.forEach(p => {
                          if (!photosByMarker[p.markerId]) photosByMarker[p.markerId] = [];
                          photosByMarker[p.markerId].push(p.photoId);
                        });
                        
                        for (const [markerId, photoIds] of Object.entries(photosByMarker)) {
                          // 删除每张照片
                          for (const photoId of photoIds) {
                            await api.photos.delete(markerId, photoId);
                          }
                          // 检查该标记是否还有照片
                          const remaining = await api.photos.getByMarkerId(markerId);
                          if (remaining.length === 0) {
                            // 无照片了，删除标记
                            await api.markers.delete(markerId);
                          } else {
                            // 更新标记的 photoCount 和 firstPhoto
                            const { webStorage } = await import('./api/index.js');
                            await webStorage.markers.update(markerId, {
                              photoCount: remaining.length,
                              firstPhoto: remaining[0] || null
                            });
                          }
                        }
                        
                        // 重新加载标记
                        await refreshMarkers();
                        setSelectedPhotos([]);
                        setBatchMode(false);
                        showToast('success', `已删除 ${selectedPhotos.length} 张照片`);
                      } catch (err) {
                        console.error('批量删除失败:', err);
                        showToast('error', '删除失败: ' + err.message);
                      }
                    }}
                  >
                    🗑️ 删除
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 整合照片对话框 */}
      {showMergeDialog && (
        <div className="merge-dialog-overlay" onClick={() => setShowMergeDialog(false)}>
          <div className={`merge-dialog themed-floating-panel theme-${uiThemeStyle}`} onClick={e => e.stopPropagation()}>
            <div className="merge-dialog-header">
              <h3>🔗 整合照片</h3>
              <button className="panel-close" onClick={() => setShowMergeDialog(false)}>✕</button>
            </div>
            <div className="merge-dialog-content">
              <p className="merge-hint">
                已选择 {selectedPhotos.length} 张照片，请选择一张照片作为整合后的位置：
              </p>
              <div className="merge-photo-grid">
                {selectedPhotos.map((selected, idx) => {
                  const marker = markers.find(m => m.id === selected.markerId);
                  const photo = marker?.photos?.[selected.photoIndex] || marker?.firstPhoto || { id: selected.photoId };
                  if (!photo) return null;
                  
                  const isTarget = mergeTargetPhoto?.markerId === selected.markerId && 
                                   mergeTargetPhoto?.photoId === selected.photoId;
                  
                  return (
                    <div 
                      key={`${selected.markerId}-${selected.photoId}`}
                      className={`merge-photo-item ${isTarget ? 'target' : ''}`}
                      onClick={() => setMergeTargetPhoto(selected)}
                    >
                      <LazyPhoto photo={photo} className="merge-photo-thumb" />
                      <div className="merge-photo-info">
                        <div className="merge-photo-location">
                          {marker.name || `${marker.lat.toFixed(3)}°, ${marker.lng.toFixed(3)}°`}
                        </div>
                      </div>
                      {isTarget && <div className="merge-target-badge">📍 目标位置</div>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="merge-dialog-footer">
              <button 
                className="merge-cancel-btn"
                onClick={() => {
                  setShowMergeDialog(false);
                  setMergeTargetPhoto(null);
                }}
              >
                取消
              </button>
              <button 
                className="merge-confirm-btn"
                onClick={handleMergePhotos}
                disabled={!mergeTargetPhoto}
              >
                确认整合
              </button>
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

      {/* 地球村悬浮窗 */}
      {showVillageModal && (
        <div className="village-modal-overlay" onClick={handleCloseVillage}>
          <div
            className={`village-modal-shell ${villageReady ? 'open' : ''} ${villageClosing ? 'closing' : ''}`}
            onClick={e => e.stopPropagation()}
            style={villageRect ? {
              '--origin-x': `${villageRect.x}px`,
              '--origin-y': `${villageRect.y}px`,
              '--origin-size': `${villageRect.size}px`,
              '--target-w': `${villageRect.targetW}px`,
              '--target-h': `${villageRect.targetH}px`,
            } : undefined}
          >
            <button className="village-shell-close" onClick={handleCloseVillage}>✕</button>
            <div className="village-modal-left">
              <div className="village-modal-head">
                <h3>地球村 <span className="village-title-icon">🌍</span></h3>
              </div>

              <div className="village-social-hero">
                <div className="hero-main">
                  <strong>Village Stream</strong>
                  <span>和村友同步你们的世界轨迹</span>
                </div>
                <button className="hero-post-btn">发布动态</button>
              </div>

              {!hasVillage ? (
                <div className="village-empty-state">
                  <div className="village-empty-badge">🌌 地球村邀请中</div>
                  <h4>还没有连接到村友协作流</h4>
                  <p>加入一个已有地球村，或创建你自己的宇宙社群空间。</p>
                  <div className="village-empty-actions">
                    <button className="village-main-btn">✨ 加入地球村</button>
                    <button className="village-main-btn ghost">🚀 创建地球村</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="village-stats-grid note-style">
                    <div><strong>{villageStats.markers}</strong><span>村友新增标记</span></div>
                    <div><strong>{villageStats.photos}</strong><span>村友新增照片</span></div>
                    <div><strong>{villageStats.countries}</strong><span>新增国家</span></div>
                    <div><strong>{villageStats.regions}</strong><span>新增地区</span></div>
                  </div>

                  <div className="village-feed-card">
                    <div className="village-feed-title">村友动态</div>
                    <div className="village-feed-list">
                      {villageFeeds.length === 0 ? (
                        <div className="village-feed-empty">暂无其他村友最近更新</div>
                      ) : (
                        villageFeeds.map(feed => (
                          <div className="village-feed-item" key={feed.id}>
                            <div className="village-feed-main">
                              <strong>{feed.actorId}</strong>
                              <span>在 {feed.place} 新增 {feed.markerDelta} 个标记 · {feed.photoDelta} 张照片</span>
                            </div>
                            <small>{feed.time}</small>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button className="village-main-btn">进入地球村</button>
                </>
              )}
            </div>

            <div className="village-modal-right">
              <h4>好友列表</h4>

              <div className="village-friend-tools">
                <div className="village-friend-add">
                  <input
                    value={pendingFriendId}
                    onChange={e => setPendingFriendId(e.target.value)}
                    placeholder="输入好友ID"
                  />
                  <button onClick={handleAddFriend}>添加</button>
                </div>
                <input
                  className="village-friend-search"
                  value={friendSearchQuery}
                  onChange={e => setFriendSearchQuery(e.target.value)}
                  placeholder="搜索好友"
                />
              </div>

              <div className="village-friend-list">
                {filteredVillageMembers.length === 0 ? (
                  <div className="village-friend-empty">暂无好友数据</div>
                ) : (
                  filteredVillageMembers.map(member => (
                    <div className="village-friend-item-wrap" key={`${member.id}-friend`}>
                      <div className="village-friend-item" onClick={() => setFriendActionMenu(v => v === member.id ? '' : member.id)}>
                        <div className={`village-avatar small ${member.online ? 'online' : 'offline'}`}>{member.avatar}</div>
                        <div className="village-friend-text">
                          <strong>{member.id}{pinnedFriendIds.includes(member.id) ? ' · 置顶' : ''}</strong>
                          <span>{member.online ? '在线' : member.lastSeen}</span>
                        </div>
                      </div>

                      {friendActionMenu === member.id && (
                        <div className="village-friend-actions">
                          <button onClick={() => handleChatFriend(member.id)}>聊天</button>
                          <button onClick={() => {
                            setPinnedFriendIds(prev => prev.includes(member.id) ? prev.filter(i => i !== member.id) : [member.id, ...prev]);
                            setFriendActionMenu('');
                          }}>{pinnedFriendIds.includes(member.id) ? '取消置顶' : '置顶'}</button>
                          <button onClick={() => {
                            setHiddenFriendIds(prev => [...new Set([...prev, member.id])]);
                            setFriendActionMenu('');
                          }}>删除</button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 生活面板 */}
      {showLife && (
        <Suspense fallback={null}>
          <div className="life-panel-overlay" onClick={() => setShowLife(false)}>
            <div className={`life-panel themed-floating-panel theme-${uiThemeStyle}`} onClick={e => e.stopPropagation()}>
              <LifePanel
                markers={markers}
                totalPhotos={totalPhotos}
                user={user}
                onClose={() => setShowLife(false)}
              />
            </div>
          </div>
        </Suspense>
      )}

      {/* 好友面板 */}
      {showSocial && (
        <Suspense fallback={null}>
          <SocialPanel onClose={() => setShowSocial(false)} />
        </Suspense>
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
          <div className={`settings-panel themed-floating-panel theme-${uiThemeStyle}`} onClick={e => e.stopPropagation()}>
            {/* 左侧导航 */}
            <div className="settings-nav">
              <div className="settings-nav-header">
                <span className="nav-icon">⚙️</span>
                <span className="nav-title">设置</span>
              </div>
              <div className="settings-nav-items">
                <button className={settingsTab === 'user' ? 'active' : ''} onClick={() => setSettingsTab('user')}>
                  <span>👤</span> 个人信息
                </button>
                <button className={settingsTab === 'appearance' ? 'active' : ''} onClick={() => setSettingsTab('appearance')}>
                  <span>🎨</span> 显示设置
                </button>
                <button className={settingsTab === 'performance' ? 'active' : ''} onClick={() => setSettingsTab('performance')}>
                  <span>🚀</span> 性能优化
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
              
              {settingsTab === 'user' && (
                <div className="settings-page">
                  <h2>👤 个人信息</h2>
                  <p className="page-desc">查看和管理您的账号信息及数据</p>
                  
                  {user ? (
                    <>
                      {/* 用户信息卡片 */}
                      <div className="user-profile-card">
                        <div className="user-avatar">
                          {user.type === 'github' ? (
                            <svg width="40" height="40" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                            </svg>
                          ) : user.type === 'email' ? (
                            <span className="user-avatar-text">
                              {user.email ? user.email[0].toUpperCase() : 'U'}
                            </span>
                          ) : (
                            <span style={{fontSize:'28px'}}>👤</span>
                          )}
                        </div>
                        <div className="user-info">
                          <h3 className="user-name">
                            {user.username || user.email || '用户'}
                          </h3>
                          <div className="user-type">
                            {user.type === 'github' && <span className="badge badge-github">GitHub 账号</span>}
                            {user.type === 'email' && <span className="badge badge-email">📧 邮箱账号</span>}
                            {(!user.type || user.type === 'guest') && <span className="badge" style={{background:'#f3f4f6',color:'#6b7280'}}>👤 游客</span>}
                          </div>
                          {user.email && <div className="user-email">{user.email}</div>}
                          {user.type === 'github' && user.username && <div className="user-email">@{user.username}</div>}
                        </div>
                      </div>
                      
                      {/* 数据统计 */}
                      <div className="setting-group">
                        <h3>数据统计</h3>
                        <div className="stats-grid">
                          <div className="stat-item">
                            <div className="stat-icon">📍</div>
                            <div className="stat-value">{markers.length}</div>
                            <div className="stat-label">标记点</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-icon">📷</div>
                            <div className="stat-value">{totalPhotos}</div>
                            <div className="stat-label">照片</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-icon">📅</div>
                            <div className="stat-value">
                              {user.loginTime ? new Date(user.loginTime).toLocaleDateString('zh-CN') : '今天'}
                            </div>
                            <div className="stat-label">加入时间</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 存储管理 */}
                      <div className="setting-group">
                        <h3>💾 存储管理</h3>
                        <div className="storage-cards">
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
                        <div className="action-buttons">
                          <button className="action-btn" onClick={async () => {
                            if (window.confirm('确定清除所有瓦片缓存？这不会影响你的标记和照片。')) {
                              await window.electronAPI?.clearTileCache();
                              const stats = await window.electronAPI?.getCacheStats();
                              if (stats) setCacheStats(stats);
                            }
                          }}>
                            <span>🧹</span>
                            <div><strong>清除瓦片缓存</strong><small>释放磁盘空间，不影响标记数据</small></div>
                          </button>
                        </div>
                      </div>

                      {/* 账号操作 */}
                      <div className="setting-group">
                        <h3>账号操作</h3>
                        <div className="action-buttons">
                          <button className="action-btn danger" onClick={() => {
                            if (window.confirm('确定要退出登录吗？')) {
                              setUser(null);
                              setIsLoggedIn(false);
                              setShowSettings(false);
                              showToast('success', '已退出登录');
                            }
                          }}>
                            <span>🚪</span>
                            <div>
                              <strong>退出登录</strong>
                              <small>退出当前账号</small>
                            </div>
                          </button>
                        </div>
                      </div>
                      
                      {/* 云同步控制 */}
                      <div className="setting-group">
                        <h3>☁️ 云端同步</h3>
                        <div className="setting-row">
                          <div className="setting-label">
                            <strong>同步状态</strong>
                            <span>当前网络：{isOnline ? '在线' : '离线'}，队列：{syncQueueSize} 条</span>
                          </div>
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={cloudSyncEnabled}
                              onChange={e => {
                                const enabled = e.target.checked;
                                setCloudSyncEnabled(enabled);
                                syncService.setCloudSyncEnabled(enabled);
                                if (enabled) runCloudSync();
                              }}
                            />
                            <span className="slider"></span>
                          </label>
                        </div>
                        <div className="setting-row">
                          <div className="setting-label">
                            <strong>云端 API 地址</strong>
                            <span>默认：Java 服务 `http://localhost:8080`</span>
                          </div>
                          <input
                            style={{ width: '280px', maxWidth: '42%', minWidth: '180px', height: '34px', borderRadius: '8px', border: '1px solid #ddd', padding: '0 10px' }}
                            value={syncApiBase}
                            onChange={(e) => {
                              setSyncApiBase(e.target.value);
                              syncService.setApiBase(e.target.value);
                            }}
                          />
                        </div>
                        <div className="action-buttons">
                          <button className="action-btn" disabled={!cloudSyncEnabled || !isOnline || syncingNow} onClick={runCloudSync}>
                            <span>🔄</span>
                            <div>
                              <strong>{syncingNow ? '同步中...' : '立即同步'}</strong>
                              <small>将本地标记与照片元数据同步到云端并拉取最新数据</small>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* 数据同步提示 */}
                      <div className="setting-tip">
                        <span>💡</span>
                        <p>离线时数据仍保存在本地，可继续使用。联网后自动同步；地球村功能需联网。</p>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 未登录状态 */}
                      <div className="guest-card">
                        <div className="guest-icon">👤</div>
                        <h3>游客模式</h3>
                        <p>您当前以游客身份使用，数据仅保存在本地设备。</p>
                        <button className="login-prompt-btn" onClick={() => {
                          setShowSettings(false);
                          setIsLoggedIn(false);
                        }}>
                          <span>🔐</span>
                          <span>登录账号</span>
                        </button>
                      </div>
                      
                      {/* 登录优势 */}
                      <div className="setting-group">
                        <h3>登录后可以</h3>
                        <div className="benefits-list">
                          <div className="benefit-item">
                            <span className="benefit-icon">☁️</span>
                            <div className="benefit-text">
                              <strong>云端同步</strong>
                              <small>在多个设备间同步数据</small>
                            </div>
                          </div>
                          <div className="benefit-item">
                            <span className="benefit-icon">🔒</span>
                            <div className="benefit-text">
                              <strong>数据备份</strong>
                              <small>自动备份，永不丢失</small>
                            </div>
                          </div>
                          <div className="benefit-item">
                            <span className="benefit-icon">🌐</span>
                            <div className="benefit-text">
                              <strong>跨平台访问</strong>
                              <small>随时随地访问您的相册</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {settingsTab === 'appearance' && (
                <div className="settings-page">
                  <h2>🎨 个性化&显示效果</h2>
                  <p className="page-desc">统一调整视觉风格与地图显示体验</p>

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
              
              {settingsTab === 'about' && (
                <div className="settings-page">
                  <h2>ℹ️ 关于</h2>
                  <p className="page-desc">地图相册 - 在地图上记录你的旅行回忆</p>

                  <div className="setting-group">
                    <h3>应用信息</h3>
                    <div className="setting-row">
                      <div className="setting-label"><strong>应用名称</strong></div>
                      <span style={{color:'var(--text-secondary)',fontSize:'14px'}}>地图相册</span>
                    </div>
                    <div className="setting-row">
                      <div className="setting-label"><strong>当前版本</strong></div>
                      <span style={{color:'var(--text-secondary)',fontSize:'14px'}}>v1.0.0</span>
                    </div>
                  </div>

                  <div className="setting-group">
                    <h3>核心功能</h3>
                    <div className="feature-inline-grid">
                      <div className="feature-inline-item"><span className="fi-icon">🗺️</span><span className="fi-name">交互式地图</span></div>
                      <div className="feature-inline-item"><span className="fi-icon">📷</span><span className="fi-name">照片管理</span></div>
                      <div className="feature-inline-item"><span className="fi-icon">🔍</span><span className="fi-name">智能搜索</span></div>
                      <div className="feature-inline-item"><span className="fi-icon">💾</span><span className="fi-name">本地存储</span></div>
                      <div className="feature-inline-item"><span className="fi-icon">🔥</span><span className="fi-name">热力图</span></div>
                      <div className="feature-inline-item"><span className="fi-icon">📏</span><span className="fi-name">距离测量</span></div>
                    </div>
                  </div>

                  <div className="setting-tip">
                    <span>❤️</span>
                    <p>感谢使用地图相册！如有问题或建议，欢迎反馈。</p>
                  </div>
                </div>
              )}
              
              
              {/* 底部保存按钮 - 仅在地图和性能设置页显示 */}
              {(settingsTab === 'performance' || settingsTab === 'appearance') && (
                <div className="settings-footer">
                  <button 
                    className="save-btn"
                    disabled={JSON.stringify(tempSettings) === JSON.stringify(mapSettings)}
                    onClick={() => {
                      setMapSettings(tempSettings);
                      localStorage.setItem('mapSettings', JSON.stringify(tempSettings));
                      
                      // 提示用户设置已保存，需要刷新页面
                      if (window.confirm('设置已保存！需要刷新页面以应用新设置，是否立即刷新？')) {
                        window.location.reload();
                      }
                    }}
                  >
                    保存设置
                  </button>
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
            
            showToast('info', '正在处理照片...', 1000);
            
            // 读取图片并保存为文件
            const photos = await Promise.all(files.map(file => {
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  if (window.electronAPI) {
                    const result = await window.electronAPI.savePhotoFromBase64(ev.target.result);
                    resolve(result ? { id: result.id, data: ev.target.result, note: '' } : null);
                  } else {
                    resolve({ data: ev.target.result, note: '' });
                  }
                };
                reader.readAsDataURL(file);
              });
            }));
            
            const validPhotos = photos.filter(p => p);
            if (validPhotos.length === 0) return;
            
            // 添加到现有标记
            const currentMenu = markerMenu;
            if (window.electronAPI) {
              await window.electronAPI.addPhotosToMarker(currentMenu.marker.id, validPhotos);
              
              // 更新本地 markers 数组（只更新轻量版字段）
              setMarkers(prev => {
                const newMarkers = prev.map(m => 
                  m.id === currentMenu.marker.id 
                    ? {
                        ...m,
                        photoCount: (m.photoCount || 0) + validPhotos.length,
                        firstPhoto: m.firstPhoto || validPhotos[0]
                      }
                    : m
                );
                return newMarkers;
              });
              
              // 更新菜单显示（使用完整数据）
              const updatedMarker = {
                ...currentMenu.marker,
                photos: [...(currentMenu.marker.photos || []), ...validPhotos],
                photoCount: (currentMenu.marker.photos?.length || 0) + validPhotos.length,
                firstPhoto: currentMenu.marker.photos?.[0] || validPhotos[0]
              };
              setMarkerMenu({ ...currentMenu, marker: updatedMarker });
              
              showToast('success', `已添加 ${validPhotos.length} 张照片`);
            } else {
              // Web 环境
              // 保存照片到数据库
              const savedPhotos = await api.photos.addBatch(currentMenu.marker.id, validPhotos);
              
              // 更新标记数据
              const updatedMarker = {
                ...currentMenu.marker,
                photos: [...(currentMenu.marker.photos || []), ...savedPhotos],
                photoCount: (currentMenu.marker.photos?.length || 0) + savedPhotos.length,
                firstPhoto: currentMenu.marker.photos?.[0] || savedPhotos[0]
              };
              
              // 更新 IndexedDB 中的标记
              await api.markers.update(updatedMarker.id, {
                photoCount: updatedMarker.photoCount,
                firstPhoto: updatedMarker.firstPhoto
              });
              
              // 更新本地 markers 数组（只更新轻量版字段）
              setMarkers(prev => prev.map(m => 
                m.id === updatedMarker.id 
                  ? {
                      ...m,
                      photoCount: updatedMarker.photoCount,
                      firstPhoto: updatedMarker.firstPhoto
                    }
                  : m
              ));
              
              // 更新菜单显示
              setMarkerMenu({ ...currentMenu, marker: updatedMarker });
              
              showToast('success', `已添加 ${savedPhotos.length} 张照片`);
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
                  const currentMenu = markerMenu;
                  
                  if (window.electronAPI) {
                    // Electron 环境
                    showToast('info', '正在打开文件选择器...', 1000);
                    const photos = await window.electronAPI.selectPhotos();
                    
                    if (photos?.length > 0) {
                      showToast('info', '正在处理照片...', 1000);
                      
                      // 添加照片到标记
                      await window.electronAPI.addPhotosToMarker(
                        currentMenu.marker.id,
                        photos.map(p => ({ 
                          id: p.id,
                          note: '' 
                        }))
                      );
                      
                      // 手动更新标记数据（只更新轻量版字段）
                      const newPhotos = photos.map(p => ({ id: p.id, data: p.data, note: '' }));
                      
                      // 更新本地 markers 数组（保持轻量版格式）
                      setMarkers(prev => {
                        const newMarkers = prev.map(m => 
                          m.id === currentMenu.marker.id 
                            ? {
                                ...m,
                                photoCount: (m.photoCount || 0) + photos.length,
                                firstPhoto: m.firstPhoto || newPhotos[0]
                              }
                            : m
                        );
                        return newMarkers;
                      });
                      
                      // 更新菜单显示（使用完整数据）
                      const updatedMarker = {
                        ...currentMenu.marker,
                        photos: [...(currentMenu.marker.photos || []), ...newPhotos],
                        photoCount: (currentMenu.marker.photos?.length || 0) + photos.length,
                        firstPhoto: currentMenu.marker.photos?.[0] || newPhotos[0]
                      };
                      setMarkerMenu({ ...currentMenu, marker: updatedMarker });
                      
                      showToast('success', `已添加 ${photos.length} 张照片`);
                    }
                  } else {
                    // Web 环境
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.multiple = true;
                    input.onchange = async (e) => {
                      const files = Array.from(e.target.files);
                      if (files.length === 0) return;
                      
                      showToast('info', '正在处理照片...', 1000);
                      
                      try {
                        // 读取文件为 base64
                        const photoPromises = files.map(file => {
                          return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              resolve({
                                data: e.target.result,
                                note: ''
                              });
                            };
                            reader.readAsDataURL(file);
                          });
                        });
                        
                        const photosData = await Promise.all(photoPromises);
                        
                        // 调用 Web API 保存到数据库
                        const savedPhotos = await api.photos.addBatch(currentMenu.marker.id, photosData);
                        
                        // 更新标记数据
                        const updatedMarker = {
                          ...currentMenu.marker,
                          photos: [...(currentMenu.marker.photos || []), ...savedPhotos],
                          photoCount: (currentMenu.marker.photos?.length || 0) + savedPhotos.length,
                          firstPhoto: currentMenu.marker.photos?.[0] || savedPhotos[0]
                        };
                        
                        // 更新 IndexedDB 中的标记
                        await api.markers.update(updatedMarker.id, {
                          photoCount: updatedMarker.photoCount,
                          firstPhoto: updatedMarker.firstPhoto
                        });
                        
                        // 更新本地 markers 数组（只更新轻量版字段）
                        setMarkers(prev => {
                          const newMarkers = prev.map(m => 
                            m.id === updatedMarker.id 
                              ? {
                                  ...m,
                                  photoCount: updatedMarker.photoCount,
                                  firstPhoto: updatedMarker.firstPhoto
                                }
                              : m
                          );
                          return newMarkers;
                        });
                        
                        // 更新菜单显示
                        setMarkerMenu({ ...currentMenu, marker: updatedMarker });
                        
                        showToast('success', `已添加 ${savedPhotos.length} 张照片`);
                      } catch (error) {
                        showToast('error', '添加照片失败');
                        console.error('添加照片错误:', error);
                      }
                    };
                    input.click();
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
          batchMode={batchMode}
          selectedPhotos={selectedPhotos}
          onPhotoSelect={handlePhotoSelect}
          onSetCover={handleSetCover}
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
                      // 批量更新照片备注
                      const photos = markers.find(m => m.id === notesPanel.markerId)?.photos || [];
                      for (let i = 0; i < Math.min(editingNotes.length, photos.length); i++) {
                        const note = editingNotes[i] || '';
                        try {
                          await api.photos.update(notesPanel.markerId, photos[i].id, { note });
                        } catch (e) {
                          console.warn('备注更新失败', e);
                        }
                      }
                      setNotesEditing(false);
                      setEditingNotes([]);
                      showToast('success', '备注已保存');
                      // 刷新当前面板的标记数据
                      let detail = null;
                      if (window.electronAPI?.getMarkerDetail) {
                        detail = await window.electronAPI.getMarkerDetail(notesPanel.markerId);
                      } else {
                        const marker = await api.markers.getById(notesPanel.markerId);
                        if (marker) {
                          const photos = await api.photos.getByMarkerId(notesPanel.markerId);
                          const sorted = [...photos].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
                          detail = { ...marker, photos: sorted, photoCount: sorted.length };
                        }
                      }
                      if (detail) {
                        setNotesPanel(prev => ({ ...prev, marker: detail }));
                        setMarkers(prev => prev.map(m => m.id === detail.id ? detail : m));
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
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;

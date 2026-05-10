import { useState, useEffect, useRef, useCallback, useMemo, memo, lazy, Suspense, useDeferredValue } from 'react';
import { startPeriodicCleanup, stopPeriodicCleanup } from './utils/memoryManager.ts';
import PhotoViewer from './components/PhotoViewer.jsx';
import PhotoEditor from './components/PhotoEditor.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useSEO } from './utils/seoManager.js';
import { useAnalytics } from './utils/webAnalytics.js';
import { usePWA } from './utils/pwaManager.js';
import api from './api/index.js';
import syncService from './services/syncService.js';
import LoginButtons from './components/LoginButtons.jsx';
import WebDownloadButton from './components/WebDownloadButton.jsx';
import LazyPhoto from './components/LazyPhoto.jsx';
import { useMarkers } from './hooks/useMarkers.js';
import { usePhotos } from './hooks/usePhotos.js';
import { useSearch } from './hooks/useSearch.js';
import { useMap } from './hooks/useMap.js';
import { useAuth } from './hooks/useAuth.js';
import { useMarkerListUI } from './hooks/useMarkerListUI.js';
import { useSync } from './hooks/useSync.js';
import { useVillage } from './hooks/useVillage.js';
import { useSettings } from './hooks/useSettings.js';
import SearchBar from './components/map/SearchBar.jsx';
import Toolbar from './components/map/Toolbar.jsx';
import NoteEditor from './components/panels/NoteEditor.jsx';
import MarkerListPanel from './components/panels/MarkerListPanel.jsx';
import NotesPanel from './components/panels/NotesPanel.jsx';
import MarkerContextMenu from './components/markers/MarkerContextMenu.jsx';
import MergeDialog from './components/panels/MergeDialog.jsx';
import VillageModal from './components/panels/VillageModal.jsx';
import Toast from './components/Toast.jsx';
import SettingsContent from './components/SettingsContent.jsx';
import { usePhotoOperations } from './hooks/usePhotoOperations.js';

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

  // 标记管理 Hook
  const {
    markers, markersLoading, newMarkerIds, markersStateRef,
    setMarkers, setMarkersLoading, setNewMarkerIds, refreshMarkers, deleteMarkerById: deleteMarkerByIdBase
  } = useMarkers();

  // 照片管理 Hook
  const {
    photoViewer, currentPhotoUrl, photoInfo, photoEditor, noteEditor, notesPanel,
    getPhotoUrl, getPhotoUrlSync, getPhotoNote,
    setPhotoViewer, setCurrentPhotoUrl, setPhotoInfo, setPhotoEditor, setNoteEditor, setNotesPanel,
  } = usePhotos();

  // 用于传递延迟定义的值给 useMap hook
  const mapSettingsRef = useRef(null);
  const fetchPlaceNameRef = useRef(null);

  // 地图管理 Hook
  const {
    mapboxReady, mapEntered, heatmapMode,
    measureMode, measureStart, measureLines,
    mapContainerRef, mapRef, mapMarkersRef, userLocationRef,
    setMapboxReady, setMapEntered, setMapLoaded,
    setHeatmapMode,
    goToMyLocation, zoomIn, zoomOut,
    toggleMeasureMode, exitMeasureMode, clearMeasureLines,
  } = useMap({
    markers,
    newMarkerIds,
    mapSettingsRef,
    getPhotoUrl,
    fetchPlaceNameRef,
    previewPin,
    setPreviewPin,
    setContextMenu,
    setPlaceName,
    setMarkerMenu,
  });

  const { settingsTab, mapSettings, tempSettings, uiThemeStyle, cacheStats,
    setSettingsTab, setTempSettings, setUiThemeStyle, setCacheStats,
    saveSettings, saveTheme } = useSettings();
  mapSettingsRef.current = mapSettings;

  const [contextMenu, setContextMenu] = useState(null);
  const [markerMenu, setMarkerMenu] = useState(null);
  const [previewPin, setPreviewPin] = useState(null);
  const [placeName, setPlaceName] = useState('');
  const [locateProgress, setLocateProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showLife, setShowLife] = useState(false);
  const {
    showMarkerList, markerListReady, markerListClosing, markerListRect,
    markerListContentHidden, markerBtnReveal, markerManageBtnRef,
    handleOpenMarkerList, handleCloseMarkerList, closeMarkerListWithAnimation,
  } = useMarkerListUI();
  const [showPhotoInfo, setShowPhotoInfo] = useState(false); // 是否显示照片信息面板
  const [notesEditing, setNotesEditing] = useState(false); // 备注面板是否处于编辑模式
  const [editingNotes, setEditingNotes] = useState([]); // 编辑中的备注临时数据
  const [photoTransformed, setPhotoTransformed] = useState(false); // 照片是否被缩放/拖动
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
  const [toast, setToast] = useState(null);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(() => syncService.isCloudSyncEnabled());

  const showToast = useCallback((type, message, duration = 2500) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), duration);
  }, []);

  const { handlePhotoSelect, handleMergePhotos, handleSetCover, handleDeletePhotoFromList, handleAddPhotoToMarker, addPhotoMarker, savePhotoNote, rotatePhoto, cropPhoto } = usePhotoOperations(
    markers, setMarkers, showToast, refreshMarkers,
    selectedPhotos, mergeTargetPhoto, setSelectedPhotos, setMergeTargetPhoto,
    setShowMergeDialog, setBatchMode, mapMarkersRef,
    setContextMenu, setPreviewPin, setNewMarkerIds, fetchPlaceName, setNoteEditor
  );

  const {
    isOnline, syncingNow, syncQueueSize, syncApiBase,
    setSyncingNow, setSyncQueueSize, setSyncApiBase,
    runCloudSync,
  } = useSync({ showToast, setMarkers, cloudSyncEnabled });

  const handleCloudSyncChange = useCallback((enabled) => {
    setCloudSyncEnabled(enabled);
    syncService.setCloudSyncEnabled(enabled);
    if (enabled) runCloudSync();
  }, [setCloudSyncEnabled, runCloudSync]);

  const handleSyncApiBaseChange = useCallback((url) => {
    setSyncApiBase(url);
    syncService.setApiBase(url);
  }, [setSyncApiBase]);

  const handleClearTileCache = useCallback(async () => {
    if (window.confirm('确定清除所有瓦片缓存？这不会影响你的标记和照片。')) {
      await window.electronAPI?.clearTileCache();
      const stats = await window.electronAPI?.getCacheStats();
      if (stats) setCacheStats(stats);
    }
  }, [setCacheStats]);

  // 搜索功能 Hook
  const {
    searchQuery, deferredSearchQuery, searchResults, showSearchResults,
    isSearching, searchHistory, selectedResultIndex, searchInputRef,
    setSearchQuery, setSearchResults, setShowSearchResults, setSelectedResultIndex,
    searchPlace, selectSearchResult, clearSearchHistory,
    handleSearchInput, handleSearchFocus, handleSearchKeyDown,
  } = useSearch(mapRef);

  // 清除搜索内容
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setSelectedResultIndex(-1);
  }, [setSearchQuery, setSearchResults, setShowSearchResults, setSelectedResultIndex]);

  // 监听语义搜索模型下载进度
  useEffect(() => {
    // 先检查模型是否已加载（之前会话已下载过）
    api.photos.getEmbeddingStatus?.().then(status => {
      if (status?.isLoaded) {
        setEmbeddingProgress(null);
        return;
      }
    }).catch(() => {});

    let hideTimer = null;
    const unsubscribe = api.photos.onEmbeddingProgress?.((data) => {
      if (data.percent >= 100) {
        // 下载完成，2秒后隐藏
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => setEmbeddingProgress(null), 2000);
        return;
      }
      if (typeof data.percent === 'number' && Number.isFinite(data.percent)) {
        setEmbeddingProgress(data);
      }
    });
    return () => {
      unsubscribe?.();
      clearTimeout(hideTimer);
    };
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

  // 认证管理 Hook
  const {
    isLoggedIn, userChose, user, showLoginModal, offlinePrompted,
    setIsLoggedIn, setUserChose, setUser, setShowLoginModal, setOfflinePrompted,
    handleLogin, handleSkipLogin, handleLogout: handleLogoutBase, handleEnterMapFromLoader,
  } = useAuth(showToast);

  const handleSettingsLogout = useCallback(() => {
    if (window.confirm('确定要退出登录吗？')) {
      setUser(null);
      setIsLoggedIn(false);
      setShowSettings(false);
      showToast('success', '已退出登录');
    }
  }, [setUser, setIsLoggedIn, setShowSettings, showToast]);

  // Village（地球村/好友）管理 Hook
  const {
    showVillageModal, villageReady, villageRect, villageTransitioning, villageClosing,
    friendSearchQuery, pendingFriendId, manualFriends, hiddenFriendIds, pinnedFriendIds,
    friendActionMenu, globeVillageBtnRef,
    villageMembers, hasVillage, villageStats, villageFeeds, filteredVillageMembers,
    setShowVillageModal, setVillageReady, setVillageRect, setVillageTransitioning, setVillageClosing,
    setFriendSearchQuery, setPendingFriendId, setManualFriends, setHiddenFriendIds, setPinnedFriendIds,
    setFriendActionMenu,
    handleAddFriend, handleChatFriend,
  } = useVillage(markers, user, showToast);

  // 包装 handleLogout，添加地图状态重置
  const handleLogout = useCallback(() => {
    handleLogoutBase();
    setMapLoaded(false);
    setMapEntered(false);
  }, [handleLogoutBase, setMapLoaded, setMapEntered]);

  // 包装 deleteMarkerById 添加 toast 提示
  const deleteMarkerById = useCallback(async (id) => {
    const success = await deleteMarkerByIdBase(id);
    if (success) {
      showToast('success', '标记已删除');
    }
  }, [deleteMarkerByIdBase, showToast]);

  useEffect(() => {
    if (isOnline) setOfflinePrompted(false);
  }, [isOnline]);




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
        if (measureMode) { exitMeasureMode(); return; }
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
          toggleMeasureMode();
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
  fetchPlaceNameRef.current = fetchPlaceName; // 同步 ref 供 useMap hook 使用

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

    const btnW = btn.offsetWidth;
    const btnH = btn.offsetHeight;

    setVillageRect({
      dx: (rect.left + rect.width / 2) - vw / 2,
      dy: (rect.top + rect.height / 2) - vh / 2,
      startScale: Math.max(targetW, targetH) > 0
        ? Math.max(btnW, btnH) / Math.max(targetW, targetH)
        : 0.05,
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
    const btn = globeVillageBtnRef.current;
    const rect = btn?.getBoundingClientRect();
    if (rect && btn) {
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
      const btnW = btn.offsetWidth;
      const btnH = btn.offsetHeight;
      setVillageRect(prev => ({
        ...prev,
        dx: (rect.left + rect.width / 2) - vw / 2,
        dy: (rect.top + rect.height / 2) - vh / 2,
        startScale: Math.max(targetW, targetH) > 0
          ? Math.max(btnW, btnH) / Math.max(targetW, targetH)
          : 0.05,
      }));
    }
    setVillageTransitioning(true);
    setVillageClosing(true);
    setVillageReady(false);
    setFriendActionMenu('');
    setTimeout(() => {
      setShowVillageModal(false);
      setVillageClosing(false);
      setVillageTransitioning(false);
    }, 480);
  };


  // MarkerListPanel callback functions
  const handleMarkerListSearch = useCallback((val) => {
    setMarkerListSearch(val);
    // Note search
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
    // Semantic search
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
  }, []);

  const handleMarkerListSort = useCallback((sortType) => {
    setMarkerListSort(sortType);
  }, []);

  const handleMarkerListLayout = useCallback((layoutType) => {
    setMarkerListLayout(layoutType);
  }, []);

  const handleMarkerListTimeFilter = useCallback((filter) => {
    setMarkerListTimeFilter(filter);
  }, []);

  const handleMarkerListTimeRangeChange = useCallback((range) => {
    setMarkerListTimeRange(range);
  }, []);

  const handleMarkerListBatchToggle = useCallback(() => {
    setBatchMode(!batchMode);
    setSelectedPhotos([]);
  }, [batchMode]);

  const handleMarkerListSortMenuToggle = useCallback((show) => {
    setShowSortMenu(show);
  }, []);

  const handleMarkerListLayoutMenuToggle = useCallback((show) => {
    setShowLayoutMenu(show);
  }, []);

  const handleMarkerListTimeFilterMenuToggle = useCallback((show) => {
    setShowTimeFilterMenu(show);
  }, []);

  const handleMarkerListSearchFocusIndexChange = useCallback((indexOrFn) => {
    if (typeof indexOrFn === 'function') {
      setSearchFocusIndex(indexOrFn);
    } else {
      setSearchFocusIndex(indexOrFn);
    }
  }, []);

  const handleMarkerListMarkerClick = useCallback(async (m) => {
    if (batchMode) return; // Batch mode doesn't respond to clicks
    handleCloseMarkerList();
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [m.lng, m.lat], zoom: 15, duration: 1000 });
      setTimeout(async () => {
        const point = mapRef.current.project([m.lng, m.lat]);
        let fullMarker = m;

        // Load complete marker data
        if (window.electronAPI?.getMarkerDetail) {
          const detail = await window.electronAPI.getMarkerDetail(m.id);
          if (detail) fullMarker = detail;
        } else {
          // Web environment
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
  }, [batchMode]);

  const handleMarkerListNoteClick = useCallback(async (result) => {
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
  }, []);

  const handleMarkerListSemanticClick = useCallback(async (result) => {
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
  }, []);

  const handleMarkerListBatchDelete = useCallback(async () => {
    if (!confirm(`确定要删除选中的 ${selectedPhotos.length} 张照片吗？`)) return;

    try {
      // Group by marker
      const photosByMarker = {};
      selectedPhotos.forEach(p => {
        if (!photosByMarker[p.markerId]) photosByMarker[p.markerId] = [];
        photosByMarker[p.markerId].push(p.photoId);
      });

      for (const [markerId, photoIds] of Object.entries(photosByMarker)) {
        // Delete each photo
        for (const photoId of photoIds) {
          await api.photos.delete(markerId, photoId);
        }
        // Check if marker still has photos
        const remaining = await api.photos.getByMarkerId(markerId);
        if (remaining.length === 0) {
          // No photos left, delete marker
          await api.markers.delete(markerId);
        } else {
          // Update marker's photoCount and firstPhoto
          const { webStorage } = await import('./api/index.js');
          await webStorage.markers.update(markerId, {
            photoCount: remaining.length,
            firstPhoto: remaining[0] || null
          });
        }
      }

      // Reload markers
      await refreshMarkers();
      setSelectedPhotos([]);
      setBatchMode(false);
      showToast('success', `已删除 ${selectedPhotos.length} 张照片`);
    } catch (err) {
      console.error('批量删除失败:', err);
      showToast('error', '删除失败: ' + err.message);
    }
  }, [selectedPhotos, refreshMarkers, showToast]);

  const handleMarkerListBatchMerge = useCallback(() => {
    if (selectedPhotos.length < 2) {
      alert('请至少选择2张照片进行整合');
      return;
    }
    setShowMergeDialog(true);
  }, [selectedPhotos]);

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
          onShowLogin={() => handleEnterMapFromLoader(setMapEntered)}
          canEnter={true}
        />
        {/* 右上角退出按钮 */}
        <LoginButtons
          onLogin={handleLogin}
          onSkip={handleSkipLogin}
          onLogout={handleLogout}
          user={user}
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
          <SearchBar
            searchQuery={searchQuery}
            searchResults={searchResults}
            showSearchResults={showSearchResults}
            selectedResultIndex={selectedResultIndex}
            isSearching={isSearching}
            searchHistory={searchHistory}
            searchInputRef={searchInputRef}
            onInputChange={handleSearchInput}
            onFocus={handleSearchFocus}
            onKeyDown={handleSearchKeyDown}
            onSelectResult={selectSearchResult}
            onClear={handleClearSearch}
            onClearHistory={clearSearchHistory}
            onSelectedResultIndexChange={setSelectedResultIndex}
          />
          
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

      {/* 工具栏 */}
      <Toolbar
        measureMode={measureMode}
        heatmapMode={heatmapMode}
        showLife={showLife}
        onLocate={goToMyLocation}
        onRefresh={() => window.location.reload()}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onToggleHeatmap={() => {
          console.log('热力图按钮被点击，当前状态:', heatmapMode);
          setHeatmapMode(!heatmapMode);
        }}
        onOpenLife={() => setShowLife(true)}
        onOpenSettings={async () => {
          setTempSettings(mapSettings);
          setShowSettings(true);
          if (window.electronAPI) {
            const stats = await window.electronAPI.getCacheStats();
            setCacheStats(stats);
          }
        }}
      />

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
      <MarkerListPanel
        markers={markers}
        show={showMarkerList}
        batchMode={batchMode}
        selectedPhotos={selectedPhotos}
        markerListSearch={markerListSearch}
        markerListSort={markerListSort}
        markerListLayout={markerListLayout}
        markerListTimeFilter={markerListTimeFilter}
        markerListTimeRange={markerListTimeRange}
        uiThemeStyle={uiThemeStyle}
        markersLoading={markersLoading}
        noteSearchResults={noteSearchResults}
        semanticResults={semanticResults}
        isNoteSearching={isNoteSearching}
        isSemanticSearching={isSemanticSearching}
        embeddingProgress={embeddingProgress}
        searchFocusIndex={searchFocusIndex}
        markerListReady={markerListReady}
        markerListClosing={markerListClosing}
        markerListContentHidden={markerListContentHidden}
        markerListRect={markerListRect}
        showSortMenu={showSortMenu}
        showLayoutMenu={showLayoutMenu}
        showTimeFilterMenu={showTimeFilterMenu}
        onClose={handleCloseMarkerList}
        onSearch={handleMarkerListSearch}
        onSort={handleMarkerListSort}
        onLayout={handleMarkerListLayout}
        onTimeFilter={handleMarkerListTimeFilter}
        onTimeRangeChange={handleMarkerListTimeRangeChange}
        onBatchToggle={handleMarkerListBatchToggle}
        onPhotoSelect={handlePhotoSelect}
        onSetCover={handleSetCover}
        onDeletePhoto={handleDeletePhotoFromList}
        onAddPhoto={handleAddPhotoToMarker}
        onMarkerClick={handleMarkerListMarkerClick}
        onNoteClick={handleMarkerListNoteClick}
        onSemanticClick={handleMarkerListSemanticClick}
        onSortMenuToggle={handleMarkerListSortMenuToggle}
        onLayoutMenuToggle={handleMarkerListLayoutMenuToggle}
        onTimeFilterMenuToggle={handleMarkerListTimeFilterMenuToggle}
        onSearchFocusIndexChange={handleMarkerListSearchFocusIndexChange}
        onBatchDelete={handleMarkerListBatchDelete}
        onBatchMerge={handleMarkerListBatchMerge}
      />

{/* 整合照片对话框 */}
      <MergeDialog
        show={showMergeDialog}
        selectedPhotos={selectedPhotos}
        mergeTargetPhoto={mergeTargetPhoto}
        uiThemeStyle={uiThemeStyle}
        markers={markers}
        onSelectTarget={(selected) => setMergeTargetPhoto(selected)}
        onClose={() => setShowMergeDialog(false)}
        onCancel={() => {
          setShowMergeDialog(false);
          setMergeTargetPhoto(null);
        }}
        onMerge={handleMergePhotos}
      />

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

      <VillageModal
        show={showVillageModal}
        villageReady={villageReady}
        villageClosing={villageClosing}
        villageRect={villageRect}
        hasVillage={hasVillage}
        villageStats={villageStats}
        villageFeeds={villageFeeds}
        pendingFriendId={pendingFriendId}
        friendSearchQuery={friendSearchQuery}
        filteredVillageMembers={filteredVillageMembers}
        friendActionMenu={friendActionMenu}
        pinnedFriendIds={pinnedFriendIds}
        onClose={handleCloseVillage}
        onPendingFriendIdChange={setPendingFriendId}
        onFriendSearchChange={setFriendSearchQuery}
        onFriendActionToggle={(id) => setFriendActionMenu(v => v === id ? '' : id)}
        onAddFriend={handleAddFriend}
        onChatFriend={handleChatFriend}
        onSetPinnedFriendIds={setPinnedFriendIds}
        onSetHiddenFriendIds={setHiddenFriendIds}
      />

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
            
            <SettingsContent
              settingsTab={settingsTab}
              user={user}
              mapSettings={mapSettings}
              tempSettings={tempSettings}
              cacheStats={cacheStats}
              markersCount={markers.length}
              totalPhotos={totalPhotos}
              isOnline={isOnline}
              syncQueueSize={syncQueueSize}
              cloudSyncEnabled={cloudSyncEnabled}
              syncingNow={syncingNow}
              syncApiBase={syncApiBase}
              onLogout={handleSettingsLogout}
              onTempSettingsChange={setTempSettings}
              onSaveSettings={saveSettings}
              onCloseSettings={() => setShowSettings(false)}
              onCloudSyncChange={handleCloudSyncChange}
              onSyncApiBaseChange={handleSyncApiBaseChange}
              onRunCloudSync={runCloudSync}
              onClearTileCache={handleClearTileCache}
            />
          </div>
        </div>
      )}

      <MarkerContextMenu
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        markerMenu={markerMenu}
        setMarkerMenu={setMarkerMenu}
        placeName={placeName}
        setPlaceName={setPlaceName}
        setPreviewPin={setPreviewPin}
        setNewMarkerIds={setNewMarkerIds}
        setMarkers={setMarkers}
        refreshMarkers={refreshMarkers}
        deleteMarkerById={deleteMarkerById}
        addPhotoMarker={addPhotoMarker}
        fetchPlaceName={fetchPlaceName}
        showToast={showToast}
        setPhotoViewer={setPhotoViewer}
        setNotesPanel={setNotesPanel}
        closeContextMenu={closeContextMenu}
      />

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
      <NoteEditor
        noteEditor={noteEditor}
        onNoteChange={note => setNoteEditor({ ...noteEditor, note })}
        onClose={() => {
          if (noteEditor.returnToViewer) {
            setPhotoViewer(noteEditor.returnToViewer);
          } else if (noteEditor.returnToMenu) {
            const marker = markers.find(m => m.id === noteEditor.markerId);
            if (marker) {
              setMarkerMenu({ ...noteEditor.returnToMenu, marker });
            }
          }
          setNoteEditor(null);
        }}
        onSave={() => {
          savePhotoNote(noteEditor.markerId, noteEditor.photoIndex, noteEditor.note);
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
        }}
      />

      {/* 备注管理面板 */}
      <NotesPanel
        notesPanel={notesPanel}
        markers={markers}
        editing={notesEditing}
        editingNotes={editingNotes}
        getPhotoNote={getPhotoNote}
        onClose={async () => {
          if (!notesEditing) {
            if (notesPanel?.returnToMenu) {
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
        }}
        onEdit={() => {
          const photos = markers.find(m => m.id === notesPanel.markerId)?.photos || [];
          setEditingNotes(photos.map(p => getPhotoNote(p)));
          setNotesEditing(true);
        }}
        onSave={async (updatedNotes, isStateUpdate) => {
          if (isStateUpdate) {
            // 仅更新编辑状态，不保存到数据库
            setEditingNotes(updatedNotes);
            return;
          }
          // 批量更新照片备注
          const photos = markers.find(m => m.id === notesPanel.markerId)?.photos || [];
          for (let i = 0; i < Math.min(updatedNotes.length, photos.length); i++) {
            const note = updatedNotes[i] || '';
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
        }}
        onCancel={() => {
          setNotesEditing(false);
          setEditingNotes([]);
        }}
      />

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
      <Toast toast={toast} />

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

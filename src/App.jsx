import { useState, useEffect, useRef, useCallback, useMemo, memo, lazy, Suspense, useDeferredValue } from 'react';
import { startPeriodicCleanup, stopPeriodicCleanup, clearAllImageCaches } from './utils/memoryManager.ts';
import PhotoViewer from './components/photos/PhotoViewer.jsx';
import PhotoEditor from './components/photos/PhotoEditor.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useSEO } from './utils/seoManager.js';
import { useAnalytics } from './utils/webAnalytics.js';
import './utils/pwaManager.js';
import api from './api/index.js';
import { savePhotoNotes } from './api/photoNotes.js';
import syncService from './api/syncService.js';
import { getCurrentUser } from './api/auth.js';
import { loadLocalMarkerSnapshots } from './api/localMarkerSnapshots.js';
import LoginButtons from './components/LoginButtons.jsx';
import MapHeader from './components/map/MapHeader.jsx';
import AlbumButton from './components/map/AlbumButton.jsx';
import MapIcon from './components/map/MapIcon.jsx';
import LazyPhoto from './components/photos/LazyPhoto.jsx';
import { useMarkers } from './hooks/useMarkers.js';
import { usePhotos } from './hooks/usePhotos.js';
import { useSearch } from './hooks/useSearch.js';
import { useMap } from './hooks/useMap.js';
import { useAuth } from './hooks/useAuth.js';
import { useMarkerListUI } from './hooks/useMarkerListUI.js';
import { useSync } from './hooks/useSync.js';
import { useVillage } from './hooks/useVillage.js';
import { useSettings } from './hooks/useSettings.js';
import Toolbar from './components/map/Toolbar.jsx';
import NoteEditor from './components/panels/NoteEditor.jsx';
import MarkerListPanel from './components/panels/MarkerListPanel.jsx';
import NotesPanel from './components/panels/NotesPanel.jsx';
import MarkerContextMenu from './components/MarkerContextMenu.jsx';
import MergeDialog from './components/panels/MergeDialog.jsx';
import VillageModal from './components/panels/VillageModal.jsx';
import Toast from './components/Toast.jsx';
import SettingsContent from './components/panels/SettingsContent.jsx';
import { usePhotoOperations } from './hooks/usePhotoOperations.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import { useDialogFocus } from './hooks/useDialogFocus.js';

import { createPortal } from 'react-dom';
import MinimalLoader from './components/MinimalLoader.jsx';

// 简洁优雅的加载动画
const FilmLoader = ({ onComplete, onShowLogin, canEnter, isWebVersion, children }) => {
  return (
    <MinimalLoader
      onComplete={onComplete}
      onShowLogin={onShowLogin || (() => {})}
      canEnter={canEnter}
      isWebVersion={isWebVersion}
    >
      {children}
    </MinimalLoader>
  );
};

// 懒加载组件 - 减少首屏 JS 体积，按需加载
const SettingsPanel = lazy(() => import('./components/panels/SettingsPanel.jsx'));
const SocialPanel = lazy(() => import('./components/panels/SocialPanel.jsx'));
const LifePanel = lazy(() => import('./components/panels/LifePanel.jsx'));

function App() {
  // Web 优化功能 Hooks
  const seo = useSEO();
  const analytics = useAnalytics();
  // 标记管理 Hook
  const {
    markers, markersLoading, newMarkerIds, markersStateRef,
    setMarkers, setMarkersLoading, setNewMarkerIds, refreshMarkers, deleteMarkerById: deleteMarkerByIdBase
  } = useMarkers();

  // 照片管理 Hook
  const {
    photoViewer, currentPhotoUrl, photoLoadError, photoInfo, photoEditor, noteEditor, notesPanel,
    getPhotoUrl, getPhotoUrlSync, getPhotoNote,
    setPhotoViewer, setCurrentPhotoUrl, setPhotoInfo, setPhotoEditor, setNoteEditor, setNotesPanel,
  } = usePhotos();

  // 用于传递延迟定义的值给 useMap hook
  const mapSettingsRef = useRef(null);

  // 这些状态被 useMap 和后续 hook 依赖，必须在所有 hook 之前声明
  const [contextMenu, setContextMenu] = useState(null);
  const [markerMenu, setMarkerMenu] = useState(null);
  const [previewPin, setPreviewPin] = useState(null);
  const [placeName, setPlaceName] = useState('');

  // 地图管理 Hook
  const {
    mapboxAvailable, mapEntered, mapLoaded, heatmapMode,
    measureMode, measureStart, measureLines,
    mapContainerRef, mapRef, mapMarkersRef, userLocationRef,
    setMapEntered, setMapLoaded,
    setHeatmapMode,
    fetchPlaceName,
    goToMyLocation, zoomIn, zoomOut,
    toggleMeasureMode, exitMeasureMode, clearMeasureLines,
  } = useMap({
    markers,
    newMarkerIds,
    mapSettingsRef,
    getPhotoUrl,
    previewPin,
    setPreviewPin,
    setContextMenu,
    setPlaceName,
    markerMenu,
    setMarkerMenu,
  });

  const { settingsTab, mapSettings, tempSettings, uiThemeStyle, cacheStats,
    setSettingsTab, setMapSettings, setTempSettings, setUiThemeStyle, setCacheStats,
    saveSettings, saveTheme } = useSettings();
  mapSettingsRef.current = mapSettings;
  const [locateProgress, setLocateProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showLife, setShowLife] = useState(false);
  const [showPhotoInfo, setShowPhotoInfo] = useState(false);
  const [notesEditing, setNotesEditing] = useState(false);
  const [editingNotes, setEditingNotes] = useState([]);
  const [photoTransformed, setPhotoTransformed] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeTargetPhoto, setMergeTargetPhoto] = useState(null);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    setMarkerMenu(null);
    setPreviewPin(null);
  }, []);

  const [toast, setToast] = useState(null);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(() => syncService.isCloudSyncEnabled());
  const [storageReady, setStorageReady] = useState(false);
  const [guestImportDone, setGuestImportDone] = useState(() => {
    const accountId = getCurrentUser()?.id;
    try { return accountId ? localStorage.getItem(`guestImportDone:${accountId}`) === '1' : false; }
    catch { return false; }
  });

  const showToast = useCallback((type, message, duration = 2500) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), duration);
  }, []);

  const {
    showMarkerList, markerListReady, markerListClosing, markerListRect,
    markerListContentHidden, markerBtnReveal, markerManageBtnRef,
    handleOpenMarkerList, handleCloseMarkerList, closeMarkerListWithAnimation,
    markerListSort, markerListLayout, showSortMenu, showLayoutMenu,
    markerListSearch, noteSearchResults, isNoteSearching,
    semanticResults, isSemanticSearching,
    searchFocusIndex, markerListTimeFilter, markerListTimeRange, showTimeFilterMenu,
    handleMarkerListSearch, handleMarkerListSort, handleMarkerListLayout,
    handleMarkerListTimeFilter, handleMarkerListTimeRangeChange,
    handleMarkerListBatchToggle,
    handleMarkerListSortMenuToggle, handleMarkerListLayoutMenuToggle,
    handleMarkerListTimeFilterMenuToggle, handleMarkerListSearchFocusIndexChange,
    handleMarkerListMarkerClick, handleMarkerListNoteClick, handleMarkerListSemanticClick,
    handleMarkerListBatchDelete, handleMarkerListBatchMerge,
  } = useMarkerListUI({
    batchMode, setBatchMode, selectedPhotos, setSelectedPhotos,
    showToast, setPhotoViewer, mapRef, setMarkerMenu,
    refreshMarkers, setShowMergeDialog,
  });

  const { handlePhotoSelect, handleMergePhotos, handleSetCover, handleDeletePhotoFromList, handleAddPhotoToMarker, addPhotoMarker, savePhotoNote, rotatePhoto, cropPhoto } = usePhotoOperations(
    markers, setMarkers, showToast, refreshMarkers,
    selectedPhotos, mergeTargetPhoto, setSelectedPhotos, setMergeTargetPhoto,
    setShowMergeDialog, setBatchMode, mapMarkersRef,
    setContextMenu, setPreviewPin, setNewMarkerIds, fetchPlaceName, setNoteEditor
  );

  const {
    isOnline, syncingNow, syncConflictCount, syncApiBase,
    setSyncApiBase,
    runCloudSync,
  } = useSync({ showToast, setMarkers, cloudSyncEnabled, storageReady });

  const handleCloudSyncChange = useCallback(enabled => {
    const accountId = getCurrentUser()?.id;
    if (!accountId) return;
    setCloudSyncEnabled(enabled);
    syncService.setCloudSyncEnabled(enabled, accountId);
    if (enabled) runCloudSync();
  }, [setCloudSyncEnabled, runCloudSync]);

  const handleSyncApiBaseChange = useCallback(url => {
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

  // 计算总照片数 - 使用 useMemo 避免重复计算
  // 数据库版本使用 photoCount 字段，旧版本使用 photos.length
  const totalPhotos = useMemo(() => 
    markers.reduce((sum, m) => sum + (m.photoCount ?? m.photos?.length ?? 0), 0), 
  [markers]
  );

  // 认证管理 Hook
  const {
    isLoggedIn, userChose, user, showLoginModal, offlinePrompted,
    setIsLoggedIn, setUserChose, setUser, setShowLoginModal, setOfflinePrompted,
    handleLogin: handleLoginBase, handleSkipLogin, handleLogout: handleLogoutBase, handleEnterMapFromLoader,
  } = useAuth(showToast);

  const handleLogin = useCallback(async userData => {
    try {
      if (window.electronAPI?.switchAccountStorage) await window.electronAPI.switchAccountStorage(userData.id);
      const accountMarkers = await loadLocalMarkerSnapshots();
      clearAllImageCaches();
      setMarkers(accountMarkers);
      try { setGuestImportDone(localStorage.getItem(`guestImportDone:${userData.id}`) === '1'); }
      catch { setGuestImportDone(false); }
      syncService.setCloudSyncEnabled(true, userData.id);
      setCloudSyncEnabled(true);
      handleLoginBase(userData);
    } catch (error) {
      showToast('error', `切换账户数据空间失败：${error.message || '本地存储不可用'}`);
    }
  }, [handleLoginBase, setMarkers, showToast]);

  const handleImportGuestData = useCallback(async () => {
    if (!user?.id || guestImportDone) return;
    if (!window.confirm('将此设备游客空间中的地点、备注和照片复制到当前账户并同步到云端？原游客数据会保留。')) return;

    let guestMarkers = [];
    const localFiles = [];
    try {
      if (window.electronAPI?.switchAccountStorage) {
        await window.electronAPI.switchAccountStorage(null);
        try {
          guestMarkers = await loadLocalMarkerSnapshots();
          for (const marker of guestMarkers) {
            for (const photo of marker.photos || []) {
              const file = await window.electronAPI.readPhotoFile(photo.id);
              if (file?.bytes) localFiles.push({ photoId: photo.id, bytes: file.bytes });
            }
          }
        } finally {
          await window.electronAPI.switchAccountStorage(user.id);
        }
      } else if (window.electronAPI?.loadGuestData) {
        guestMarkers = await window.electronAPI.loadGuestData();
      }

      const existing = await api.markers.getAll();
      const existingIds = new Set(existing.map(marker => marker.id));
      const importable = guestMarkers.filter(marker => !existingIds.has(marker.id));
      for (const marker of importable) await api.markers.upsertSnapshot(marker);
      for (const file of localFiles) await window.electronAPI.savePhotoFile(file.photoId, file.bytes);

      localStorage.setItem(`guestImportDone:${user.id}`, '1');
      setGuestImportDone(true);
      setMarkers(await loadLocalMarkerSnapshots());
      if (!guestMarkers.length) showToast('info', '游客空间没有可导入的地点');
      else showToast('success', `已导入 ${importable.length} 个地点，游客原数据仍保留`);
      await runCloudSync();
    } catch (error) {
      showToast('error', `导入游客数据失败：${error.message || '本地存储不可用'}`);
    }
  }, [user?.id, guestImportDone, setMarkers, showToast, runCloudSync]);

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
  const handleLogout = useCallback(async message => {
    clearAllImageCaches();
    handleLogoutBase(message);
    setCloudSyncEnabled(false);
    setGuestImportDone(false);
    try {
      if (window.electronAPI?.switchAccountStorage) await window.electronAPI.switchAccountStorage(null);
      const guestMarkers = await loadLocalMarkerSnapshots();
      setMarkers(guestMarkers);
    } catch (error) {
      showToast('error', `切换游客数据空间失败：${error.message || '本地存储不可用'}`);
    }
    setMapLoaded(false);
    setMapEntered(false);
  }, [handleLogoutBase, setMarkers, showToast, setMapLoaded, setMapEntered]);

  const handleSettingsLogout = useCallback(() => {
    if (!window.confirm('确定要退出登录吗？')) return;
    setShowSettings(false);
    handleLogout();
  }, [handleLogout, setShowSettings]);

  // 包装 deleteMarkerById 添加 toast 提示
  const deleteMarkerById = useCallback(async id => {
    const success = await deleteMarkerByIdBase(id);
    if (success) {
      showToast('success', '标记已删除');
    }
  }, [deleteMarkerByIdBase, showToast]);

  useEffect(() => {
    if (isOnline) setOfflinePrompted(false);
  }, [isOnline]);




  // 全局快捷键
  useKeyboard({
    photoViewer, photoEditor, showSettings, showMarkerList, markerMenu, contextMenu, measureMode,
    searchInputRef, markerManageBtnRef, mapRef, userLocationRef,
    setPhotoViewer, setPhotoEditor, setShowSettings, setMarkerMenu, setContextMenu, setPreviewPin,
    setPhotoTransformed, setHeatmapMode,
    closeMarkerListWithAnimation, exitMeasureMode, toggleMeasureMode,
  });
  const closeSettings = () => {
    if (JSON.stringify(tempSettings) !== JSON.stringify(mapSettings)) {
      if (window.confirm('设置已更改但未保存，是否保存？')) saveSettings(tempSettings);
      else setTempSettings(mapSettings);
    }
    setShowSettings(false);
  };
  useDialogFocus(showSettings, '.settings-panel', closeSettings);

  useEffect(() => {
    let active = true;
    // 启动定时内存清理
    startPeriodicCleanup();
    setMarkersLoading(true);
    const initializeStorage = async () => {
      const accountId = getCurrentUser()?.id;
      if (window.electronAPI?.switchAccountStorage) await window.electronAPI.switchAccountStorage(accountId || null);
      const loaded = await loadLocalMarkerSnapshots();
      if (!active) return;
      setMarkers(loaded);
      setCloudSyncEnabled(syncService.isCloudSyncEnabled());
      try {
        const currentUser = getCurrentUser();
        setGuestImportDone(currentUser?.id ? localStorage.getItem(`guestImportDone:${currentUser.id}`) === '1' : false);
      } catch { setGuestImportDone(false); }
      setMarkersLoading(false);
      setStorageReady(true);
      if (window.electronAPI?.getCacheStats) window.electronAPI.getCacheStats().then(setCacheStats);

      if (window.electronAPI && loaded.some(marker => !marker.name)) {
        const needName = loaded.filter(marker => !marker.name);
        Promise.all(needName.map(async marker => {
          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${marker.lng},${marker.lat}.json?access_token=${window.mapboxgl?.accessToken}&language=zh&limit=1`
            );
            const data = await response.json();
            const place = data.features?.[0]?.place_name_zh || data.features?.[0]?.place_name || '';
            const name = place.replace(/\s*\d{5,6}\s*$/, '').replace(/,\s*$/, '');
            if (!name) return null;
            await window.electronAPI.updateMarker({ id: marker.id, lat: marker.lat, lng: marker.lng, name });
            return { id: marker.id, name };
          } catch { return null; }
        })).then(results => {
          const names = Object.fromEntries(results.filter(Boolean).map(result => [result.id, result.name]));
          if (Object.keys(names).length) setMarkers(current => current.map(marker => names[marker.id] ? { ...marker, name: names[marker.id] } : marker));
        });
      }
    };
    void initializeStorage().catch(error => {
      console.error('❌ 加载本地账户数据失败:', error);
      if (active) {
        setMarkersLoading(false);
        setStorageReady(false);
      }
    });

    // 组件卸载时停止定时清理
    return () => {
      active = false;
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
        input.onchange = async e => {
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
    fetch('https://restapi.amap.com/v3/ip?key=9fb3c3f43537ecacd6d0a082958a883c', { signal: controller.signal })
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
    if (!isOnline) { showToast('info', '地球村功能需要联网后使用'); return; }
    setVillageReady(true);
    setVillageClosing(false);
    setShowVillageModal(true);
  };
  const handleCloseVillage = () => {
    setShowVillageModal(false);
    setVillageReady(false);
    setFriendActionMenu('');
  };

  // 检测是否为 Web 版本 - 多重检测确保准确性
  const isWebVersion = !window.electronAPI ||
                       window.electronAPI.__isWebAdapter ||
                       window.location.pathname.includes('index-web') ||
                       window.location.port === '3001' ||
                       window.location.hostname.includes('netlify') ||
                       window.location.hostname.includes('vercel');
  
  // 调试信息（仅在需要时启用）
  // console.log('App 组件渲染 - Web 版本:', isWebVersion, '已登录:', isLoggedIn, '地图已加载:', mapLoaded);
  // console.log('window.electronAPI:', window.electronAPI);
  // console.log('当前URL:', window.location.href);

  // 进度条完成后，用户未做出选择：显示登录按钮和禁用的进入地图按钮
  if (!userChose) {
    return (
      <>
        {/* 继续显示地球背景，进入地图按钮禁用 */}
        <FilmLoader 
          onComplete={() => {}}
          onShowLogin={() => {}}
          canEnter={false}
          isWebVersion={isWebVersion}
        >
        {/* 登录按钮和禁用的进入地图按钮 */}
        <LoginButtons
          onLogin={handleLogin}
          onSkip={handleSkipLogin}
          onLogout={handleLogout}
          isLoggedIn={false}
          showButtons
          landingLayout
        />
        </FilmLoader>
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
          canEnter
          isWebVersion={isWebVersion}
        >
        {/* 右上角退出按钮 */}
        <LoginButtons
          onLogin={handleLogin}
          onSkip={handleSkipLogin}
          onLogout={handleLogout}
          user={user}
          isLoggedIn
          showButtons={false}
        />
        </FilmLoader>
      </>
    );
  }

  // 进入地图后，不再显示登录按钮组件

  // Web 版本样式已在 main-web.jsx 中导入

  return (
    <div className={`app ${isWebVersion ? 'web-app' : ''} ui-theme-${uiThemeStyle}`}>
      
      {/* 无边框窗口拖拽区域 */}
      {!isWebVersion && <div className="window-drag-region" />}
      
      <div ref={mapContainerRef} className={`map-container ${measureMode ? 'measure-mode' : ''}`} />
      {!mapboxAvailable && (
        <div className="map-unavailable" role="status">
          地图服务未加载，您仍可使用相册。
          <button type="button" onClick={() => window.location.reload()}>重新加载</button>
        </div>
      )}
      
      {/* 顶部搜索栏 */}
      {!measureMode && (
        <MapHeader
          villageButtonRef={globeVillageBtnRef} showVillage={showVillageModal}
          isOnline={isOnline} onOpenVillage={handleOpenVillage}
          isWeb={isWebVersion}
          searchProps={{
            searchQuery, searchResults, showSearchResults, selectedResultIndex,
            isSearching, searchHistory, searchInputRef,
            onInputChange: handleSearchInput, onFocus: handleSearchFocus,
            onKeyDown: handleSearchKeyDown, onSelectResult: selectSearchResult,
            onClear: handleClearSearch, onClearHistory: clearSearchHistory,
            onSelectedResultIndexChange: setSelectedResultIndex,
          }}
        />
      )}
      
      {/* 点击其他地方关闭搜索结果 */}
      {showSearchResults && (
        <div className="search-overlay" onClick={() => setShowSearchResults(false)} />
      )}

      {/* 工具栏 */}
      <Toolbar
        mapReady={mapLoaded}
        measureMode={measureMode}
        heatmapMode={heatmapMode}
        onLocate={goToMyLocation}
        onRefresh={() => window.location.reload()}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onToggleHeatmap={() => {
          console.log('热力图按钮被点击，当前状态:', heatmapMode);
          setHeatmapMode(value => !value);
        }}
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
        <AlbumButton buttonRef={markerManageBtnRef} show={showMarkerList} reveal={markerBtnReveal}
          onClick={handleOpenMarkerList} totalPhotos={totalPhotos} totalPlaces={markers.length}
          showLife={showLife} onOpenLife={() => setShowLife(value => !value)} />
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
        onSelectTarget={selected => setMergeTargetPhoto(selected)}
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
            <MapIcon name="ruler" />
            <span>测量模式 · {measureStart ? '点击选择终点' : '点击选择起点'}</span>
          </div>
          <div className="measure-toolbar">
            {measureLines.length > 0 && (
              <button type="button" onClick={clearMeasureLines} className="measure-btn" data-action="clear-measure">
                <MapIcon name="trash" />
                <span>清除测量</span>
              </button>
            )}
            <button type="button" onClick={exitMeasureMode} className="measure-btn exit" data-action="exit-measure">
              <MapIcon name="close" />
              <span>退出测量模式</span>
            </button>
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
        onFriendActionToggle={id => setFriendActionMenu(v => v === id ? '' : id)}
        onAddFriend={handleAddFriend}
        onChatFriend={handleChatFriend}
        onSetPinnedFriendIds={setPinnedFriendIds}
        onSetHiddenFriendIds={setHiddenFriendIds}
      />

      {/* 生活面板 */}
      {showLife && (
        <Suspense fallback={null}>
          <div className="life-panel-overlay" onClick={() => setShowLife(false)}>
            <div role="dialog" aria-modal="true" aria-label="生活足迹" tabIndex={-1} className={`life-panel themed-floating-panel theme-${uiThemeStyle}`} onClick={e => e.stopPropagation()}>
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
        <div className="settings-overlay" onClick={closeSettings}>
          <div className={`settings-panel themed-floating-panel theme-${uiThemeStyle}`} onClick={e => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label="设置" tabIndex={-1}>
            {/* 左侧导航 */}
            <div className="settings-nav">
              <div className="settings-nav-header">
                <MapIcon name="settings" className="nav-icon" />
                <span className="nav-title">设置</span>
              </div>
              <div className="settings-nav-items">
                <button type="button" className={settingsTab === 'user' ? 'active' : ''} onClick={() => setSettingsTab('user')}>
                  <MapIcon name="user" /> 个人信息
                </button>
                <button type="button" className={settingsTab === 'appearance' ? 'active' : ''} onClick={() => setSettingsTab('appearance')}>
                  <MapIcon name="palette" /> 显示设置
                </button>
                <button type="button" className={settingsTab === 'performance' ? 'active' : ''} onClick={() => setSettingsTab('performance')}>
                  <MapIcon name="performance" /> 性能优化
                </button>
                <button type="button" className={settingsTab === 'about' ? 'active' : ''} onClick={() => setSettingsTab('about')}>
                  <MapIcon name="info" /> 关于
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
              syncConflictCount={syncConflictCount}
              cloudSyncEnabled={cloudSyncEnabled}
              guestImportDone={guestImportDone}
              syncingNow={syncingNow}
              syncApiBase={syncApiBase}
              onLogout={handleSettingsLogout}
              onOpenLogin={() => { setShowSettings(false); handleLogout(); }}
              onTempSettingsChange={setTempSettings}
              onSaveSettings={saveSettings}
              onCloseSettings={closeSettings}
              onCloudSyncChange={handleCloudSyncChange}
              onSyncApiBaseChange={handleSyncApiBaseChange}
              onRunCloudSync={runCloudSync}
              onImportGuestData={handleImportGuestData}
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
          photoLoadError={photoLoadError}
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
        onSave={async () => {
          await savePhotoNote(noteEditor.markerId, noteEditor.photoIndex, noteEditor.note);
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
          if (notesEditing && !window.confirm('放弃尚未保存的备注更改？')) return;
          setNotesEditing(false);
          setEditingNotes([]);
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
        }}
        onEdit={() => {
          const photos = (notesPanel.marker || markers.find(m => m.id === notesPanel.markerId))?.photos || [];
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
          const photos = (notesPanel.marker || markers.find(m => m.id === notesPanel.markerId))?.photos || [];
          await savePhotoNotes(notesPanel.markerId, photos, updatedNotes);
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
          setNotesEditing(false);
          setEditingNotes([]);
          showToast('success', '备注已保存');
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

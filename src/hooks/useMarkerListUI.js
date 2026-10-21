import { useState, useCallback, useRef, useEffect } from 'react';
import api, { webStorage } from '../api/index.js';

export function useMarkerListUI({
  batchMode,
  setBatchMode,
  selectedPhotos,
  setSelectedPhotos,
  showToast,
  setPhotoViewer,
  mapRef,
  setMarkerMenu,
  refreshMarkers,
  setShowMergeDialog,
} = {}) {
  // --- Animation state ---
  const [showMarkerList, setShowMarkerList] = useState(false);
  const [markerListReady, setMarkerListReady] = useState(false);
  const [markerListClosing, setMarkerListClosing] = useState(false);
  const [markerListRect, setMarkerListRect] = useState(null);
  const [markerListTransitioning, setMarkerListTransitioning] = useState(false);
  const [markerListContentHidden, setMarkerListContentHidden] = useState(false);
  const [markerBtnReveal, setMarkerBtnReveal] = useState(false);
  const markerManageBtnRef = useRef(null);

  // --- Marker list UI state ---
  const [markerListSort, setMarkerListSort] = useState('time');
  const [markerListLayout, setMarkerListLayout] = useState('list');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [markerListSearch, setMarkerListSearch] = useState('');
  const [noteSearchResults, setNoteSearchResults] = useState([]);
  const [isNoteSearching, setIsNoteSearching] = useState(false);
  const semanticResults = [];
  const isSemanticSearching = false;
  const [searchFocusIndex, setSearchFocusIndex] = useState(-1);
  const searchResultsRef = useRef(null);
  const [markerListTimeFilter, setMarkerListTimeFilter] = useState('all');
  const [markerListTimeRange, setMarkerListTimeRange] = useState({ start: '', end: '' });
  const [showTimeFilterMenu, setShowTimeFilterMenu] = useState(false);

  // CSS owns entry motion; one tracked timer owns delayed unmount.
  const closeTimer = useRef(null);
  const markerOpenRequest = useRef(0);
  const cancelMapWait = useRef(null);
  const searchRequest = useRef(0);
  useEffect(() => () => {
    clearTimeout(closeTimer.current);
    ++markerOpenRequest.current;
    cancelMapWait.current?.();
  }, []);
  const closeMarkerListWithAnimation = useCallback(() => {
    if (closeTimer.current) return;
    setMarkerListClosing(true);
    setMarkerListTransitioning(true);
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
    closeTimer.current = setTimeout(() => {
      setShowMarkerList(false);
      setMarkerListReady(false);
      setMarkerListClosing(false);
      setMarkerListTransitioning(false);
      closeTimer.current = null;
    }, duration);
  }, []);
  const handleOpenMarkerList = useCallback(() => {
    if (closeTimer.current) return;
    ++markerOpenRequest.current;
    cancelMapWait.current?.();
    setShowMarkerList(true);
    setMarkerListReady(true);
    setMarkerListContentHidden(false);
  }, []);
  const handleCloseMarkerList = closeMarkerListWithAnimation;

  // --- Handler callbacks ---
  const handleMarkerListSearch = useCallback(val => setMarkerListSearch(val), []);
  useEffect(() => {
    const request = ++searchRequest.current;
    const query = markerListSearch.trim();
    setNoteSearchResults([]);
    setIsNoteSearching(!!query);
    if (!query) return;
    const timer = setTimeout(() => {
      api.photos.searchNotes(query).then(results => {
        if (request === searchRequest.current) setNoteSearchResults(results || []);
      }).catch(() => {}).finally(() => {
        if (request === searchRequest.current) setIsNoteSearching(false);
      });
    }, 350);
    return () => {
      clearTimeout(timer);
      ++searchRequest.current;
    };
  }, [markerListSearch]);

  const handleMarkerListSort = useCallback(sortType => {
    setMarkerListSort(sortType);
  }, []);

  const handleMarkerListLayout = useCallback(layoutType => {
    setMarkerListLayout(layoutType);
  }, []);

  const handleMarkerListTimeFilter = useCallback(filter => {
    setMarkerListTimeFilter(filter);
  }, []);

  const handleMarkerListTimeRangeChange = useCallback(range => {
    setMarkerListTimeRange(range);
  }, []);

  const handleMarkerListBatchToggle = useCallback(() => {
    setBatchMode(!batchMode);
    setSelectedPhotos([]);
  }, [batchMode]);

  const handleMarkerListSortMenuToggle = useCallback(show => {
    setShowSortMenu(show);
  }, []);

  const handleMarkerListLayoutMenuToggle = useCallback(show => {
    setShowLayoutMenu(show);
  }, []);

  const handleMarkerListTimeFilterMenuToggle = useCallback(show => {
    setShowTimeFilterMenu(show);
  }, []);

  const handleMarkerListSearchFocusIndexChange = useCallback(indexOrFn => {
    if (typeof indexOrFn === 'function') {
      setSearchFocusIndex(indexOrFn);
    } else {
      setSearchFocusIndex(indexOrFn);
    }
  }, []);

  const handleMarkerListMarkerClick = useCallback(
    async marker => {
      if (batchMode) return;
      const request = ++markerOpenRequest.current;
      cancelMapWait.current?.();
      mapRef.current?.jumpTo?.({ center: [marker.lng, marker.lat], zoom: 15, preloadOnly: true });
      try {
        const detail = window.electronAPI?.getMarkerDetail
          ? await window.electronAPI.getMarkerDetail(marker.id)
          : null;
        const photos = detail?.photos || (await api.photos.getByMarkerId(marker.id));
        if (request !== markerOpenRequest.current) return;
        const sorted = [...photos].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
        const fullMarker = { ...marker, ...detail, photos: sorted, photoCount: sorted.length };
        const map = mapRef.current;
        setMarkerMenu(null);
        handleCloseMarkerList();
        if (map) {
          map.stop();
          // Register before flyTo: reduced motion can complete synchronously.
          await new Promise(resolve => {
            const finish = () => {
              map.off('moveend', finish);
              if (cancelMapWait.current === finish) cancelMapWait.current = null;
              resolve();
            };
            cancelMapWait.current = finish;
            map.once('moveend', finish);
            map.flyTo({ center: [marker.lng, marker.lat], zoom: 15, duration: 1000 });
          });
        }
        if (request !== markerOpenRequest.current || map !== mapRef.current) return;
        const point = map?.project([marker.lng, marker.lat]);
        setMarkerMenu({
          x: point?.x ?? window.innerWidth / 2 - 140,
          y: point?.y ?? window.innerHeight / 2 - 160,
          marker: fullMarker,
        });
      } catch {
        if (request === markerOpenRequest.current) {
          cancelMapWait.current?.();
          showToast('error', '地点详情加载失败，请重试');
        }
      }
    },
    [batchMode, handleCloseMarkerList, mapRef, setMarkerMenu, showToast]
  );

  const handleMarkerListNoteClick = useCallback(async result => {
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
          markerId: result.markerId,
        });
      }
    }
  }, []);

  const handleMarkerListSemanticClick = useCallback(async result => {
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
          markerId: result.markerId,
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
          await webStorage.markers.update(markerId, {
            photoCount: remaining.length,
            firstPhoto: remaining[0] || null,
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

  return {
    // Animation state
    showMarkerList,
    markerListReady,
    markerListClosing,
    markerListRect,
    markerListTransitioning,
    markerListContentHidden,
    markerBtnReveal,
    markerManageBtnRef,
    setShowMarkerList,
    setMarkerListReady,
    setMarkerListClosing,
    setMarkerListRect,
    setMarkerListTransitioning,
    setMarkerListContentHidden,
    setMarkerBtnReveal,
    handleOpenMarkerList,
    handleCloseMarkerList,
    closeMarkerListWithAnimation,
    // Marker list UI state
    markerListSort,
    markerListLayout,
    showSortMenu,
    showLayoutMenu,
    markerListSearch,
    noteSearchResults,
    isNoteSearching,
    semanticResults,
    isSemanticSearching,
    searchFocusIndex,
    searchResultsRef,
    markerListTimeFilter,
    markerListTimeRange,
    showTimeFilterMenu,
    // Handler callbacks
    handleMarkerListSearch,
    handleMarkerListSort,
    handleMarkerListLayout,
    handleMarkerListTimeFilter,
    handleMarkerListTimeRangeChange,
    handleMarkerListBatchToggle,
    handleMarkerListSortMenuToggle,
    handleMarkerListLayoutMenuToggle,
    handleMarkerListTimeFilterMenuToggle,
    handleMarkerListSearchFocusIndexChange,
    handleMarkerListMarkerClick,
    handleMarkerListNoteClick,
    handleMarkerListSemanticClick,
    handleMarkerListBatchDelete,
    handleMarkerListBatchMerge,
  };
}

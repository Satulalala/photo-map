import { useState, useCallback, useRef } from 'react';
import api from '../api/index.js';

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
  const [semanticResults, setSemanticResults] = useState([]);
  const [isSemanticSearching, setIsSemanticSearching] = useState(false);
  const [embeddingProgress, setEmbeddingProgress] = useState(null);
  const [searchFocusIndex, setSearchFocusIndex] = useState(-1);
  const searchResultsRef = useRef(null);
  const [markerListTimeFilter, setMarkerListTimeFilter] = useState('all');
  const [markerListTimeRange, setMarkerListTimeRange] = useState({ start: '', end: '' });
  const [showTimeFilterMenu, setShowTimeFilterMenu] = useState(false);

  // --- Animation callbacks ---
  const closeMarkerListWithAnimation = useCallback(() => {
    if (markerListTransitioning) return;
    const btn = markerManageBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setMarkerListRect(prev => ({
      ...(prev || {}),
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      size: Math.max(btn.offsetWidth, btn.offsetHeight),
    }));
    setMarkerListClosing(true);
    setMarkerListTransitioning(true);
    setTimeout(() => {
      setShowMarkerList(false);
      setMarkerListReady(false);
      setMarkerListClosing(false);
      setMarkerListTransitioning(false);
      setMarkerBtnReveal(true);
      setTimeout(() => setMarkerBtnReveal(false), 600);
    }, 400);
  }, [markerListTransitioning]);

  const handleOpenMarkerList = useCallback(() => {
    if (markerListTransitioning) return;
    const btn = markerManageBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // 计算面板位置
    setMarkerListRect({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      size: Math.max(btn.offsetWidth, btn.offsetHeight),
      targetW: Math.min(1200, vw - 80),
      targetH: Math.min(800, vh - 120),
      dx: (vw / 2) - (rect.left + rect.width / 2),
      dy: (vh / 2) - (rect.top + rect.height / 2),
      startScale: Math.max(btn.offsetWidth, btn.offsetHeight) / Math.min(1200, vw - 80),
    });
    setMarkerListTransitioning(true);
    setShowMarkerList(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setMarkerListReady(true);
        setMarkerListContentHidden(false);
        setMarkerListTransitioning(false);
      });
    });
  }, [markerListTransitioning]);

  const handleCloseMarkerList = useCallback(() => {
    closeMarkerListWithAnimation();
  }, [closeMarkerListWithAnimation]);

  // --- Handler callbacks ---
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
          const { webStorage } = await import('../api/index.js');
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

  return {
    // Animation state
    showMarkerList, markerListReady, markerListClosing, markerListRect,
    markerListTransitioning, markerListContentHidden, markerBtnReveal,
    markerManageBtnRef,
    setShowMarkerList, setMarkerListReady, setMarkerListClosing,
    setMarkerListRect, setMarkerListTransitioning, setMarkerListContentHidden,
    setMarkerBtnReveal,
    handleOpenMarkerList, handleCloseMarkerList, closeMarkerListWithAnimation,
    // Marker list UI state
    markerListSort, markerListLayout, showSortMenu, showLayoutMenu,
    markerListSearch, noteSearchResults, isNoteSearching,
    semanticResults, isSemanticSearching,
    embeddingProgress, setEmbeddingProgress,
    searchFocusIndex, searchResultsRef,
    markerListTimeFilter, markerListTimeRange, showTimeFilterMenu,
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

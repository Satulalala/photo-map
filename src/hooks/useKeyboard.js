import { useEffect } from 'react';

export function useKeyboard({
  // State values
  photoViewer, photoEditor, showSettings, showMarkerList, markerMenu, contextMenu, measureMode,
  // Refs
  searchInputRef, markerManageBtnRef, mapRef, userLocationRef,
  // Setters and callbacks
  setPhotoViewer, setPhotoEditor, setShowSettings, setMarkerMenu, setContextMenu, setPreviewPin,
  setPhotoTransformed, setHeatmapMode,
  closeMarkerListWithAnimation, exitMeasureMode, toggleMeasureMode,
}) {
  useEffect(() => {
    const handleKeyDown = e => {
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
  }, [photoViewer, photoEditor, showSettings, showMarkerList, markerMenu, contextMenu, measureMode,
    searchInputRef, markerManageBtnRef, mapRef, userLocationRef,
    setPhotoViewer, setPhotoEditor, setShowSettings, setMarkerMenu, setContextMenu, setPreviewPin,
    setPhotoTransformed, setHeatmapMode,
    closeMarkerListWithAnimation, exitMeasureMode, toggleMeasureMode]);
}

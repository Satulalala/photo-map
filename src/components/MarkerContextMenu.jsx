import { useState } from 'react';
import useMarkerMenuDrop from '../hooks/useMarkerMenuDrop.js';
import api from '../api/index.js';
import MapIcon from './map/MapIcon.jsx';
import LazyPhoto from './photos/LazyPhoto.jsx';
import { useDialogFocus } from '../hooks/useDialogFocus.js';
import { usePresenceTransition } from '../hooks/usePresenceTransition.js';

function getPopoverPlacement(x, y, width, height) {
  if (typeof window === 'undefined') {
    return { left: x, top: y, origin: 'tl' };
  }
  const left = Math.max(12, Math.min(x, window.innerWidth - width - 12));
  const top = Math.max(12, Math.min(y, window.innerHeight - height - 12));
  const horizontal = x > window.innerWidth - width - 24 ? 'r' : 'l';
  const vertical = y > window.innerHeight - height - 24 ? 'b' : 't';
  return { left, top, origin: `${vertical}${horizontal}` };
}

function MarkerCollage({ photos, placeTitle, onOpenPhoto }) {
  if (!photos?.length) return null;
  const previewPhotos = photos.slice(0, 3);
  const extraCount = Math.max(0, photos.length - 3);

  return (
    <div className="marker-collage" data-count={previewPhotos.length}>
      {previewPhotos.map((photo, index) => (
        <button
          key={photo.id || index}
          type="button"
          className="marker-collage-cell"
          aria-label={`查看 ${placeTitle} 第 ${index + 1} 张照片`}
          onClick={() => onOpenPhoto(index)}
        >
          <LazyPhoto
            photo={photo}
            className="marker-collage-img"
            alt={`${placeTitle} 照片 ${index + 1}`}
          />
          {index === 2 && extraCount > 0 && (
            <span className="marker-collage-more">+{extraCount}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default function MarkerContextMenu({
  contextMenu,
  setContextMenu,
  markerMenu,
  setMarkerMenu,
  placeName,
  setPlaceName,
  setPreviewPin,
  setNewMarkerIds,
  setMarkers,
  refreshMarkers,
  deleteMarkerById,
  addPhotoMarker,
  fetchPlaceName,
  showToast,
  setPhotoViewer,
  setNotesPanel,
  closeContextMenu,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMarkerDragOver, setIsMarkerDragOver] = useState(false);

  const contextPresence = usePresenceTransition(contextMenu, 160);
  const markerPresence = usePresenceTransition(markerMenu, 160);
  useDialogFocus(Boolean(contextMenu || markerMenu), '.context-menu', closeContextMenu);

  const { handleContextDrop, handleMarkerDrop, processing } = useMarkerMenuDrop({
    contextMenu,
    setContextMenu,
    markerMenu,
    setMarkerMenu,
    setPreviewPin,
    setNewMarkerIds,
    setMarkers,
    refreshMarkers,
    fetchPlaceName,
    showToast,
    setIsDragOver,
    setIsMarkerDragOver,
  });

  if (!contextPresence.mounted && !markerPresence.mounted) return null;

  const activeContext = contextPresence.snapshot;
  const activeMarkerMenu = markerPresence.snapshot;
  const contextPlacement = activeContext
    ? getPopoverPlacement(activeContext.x, activeContext.y, 284, 216)
    : null;
  const markerPhotos = activeMarkerMenu?.marker?.photos || [];
  const hasPhotos = markerPhotos.length > 0;
  const markerPlacement = activeMarkerMenu
    ? getPopoverPlacement(activeMarkerMenu.x, activeMarkerMenu.y, 304, hasPhotos ? 404 : 264)
    : null;
  const markerTitle = activeMarkerMenu
    ? activeMarkerMenu.marker.name ||
      `${activeMarkerMenu.marker.lat.toFixed(3)}°, ${activeMarkerMenu.marker.lng.toFixed(3)}°`
    : '';

  const openViewerAt = index => {
    if (!activeMarkerMenu) return;
    setPhotoViewer({
      photos: markerPhotos,
      index,
      markerId: activeMarkerMenu.marker.id,
      returnToMenu: activeMarkerMenu,
    });
    setMarkerMenu(null);
  };

  const handleAddMarkerPhotos = async () => {
    const currentMenu = activeMarkerMenu;
    if (!currentMenu) return;

    if (window.electronAPI) {
      showToast('info', '正在打开文件选择器...', 1000);
      const photos = await window.electronAPI.selectPhotos();
      if (!photos?.length) return;
      showToast('info', '正在处理照片...', 1000);

      await window.electronAPI.addPhotosToMarker(
        currentMenu.marker.id,
        photos.map(p => ({ id: p.id, note: '' }))
      );

      const newPhotos = photos.map(p => ({ id: p.id, data: p.data, note: '' }));
      setMarkers(prev =>
        prev.map(m =>
          m.id === currentMenu.marker.id
            ? {
                ...m,
                photoCount: (m.photoCount || 0) + photos.length,
                firstPhoto: m.firstPhoto || newPhotos[0],
              }
            : m
        )
      );

      const updatedMarker = {
        ...currentMenu.marker,
        photos: [...(currentMenu.marker.photos || []), ...newPhotos],
        photoCount: (currentMenu.marker.photos?.length || 0) + photos.length,
        firstPhoto: currentMenu.marker.photos?.[0] || newPhotos[0],
      };
      setMarkerMenu({ ...currentMenu, marker: updatedMarker });
      showToast('success', `已添加 ${photos.length} 张照片`);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async e => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      showToast('info', '正在处理照片...', 1000);

      try {
        const photosData = await Promise.all(
          files.map(
            file =>
              new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = ev => resolve({ data: ev.target.result, note: '' });
                reader.readAsDataURL(file);
              })
          )
        );
        const savedPhotos = await api.photos.addBatch(currentMenu.marker.id, photosData);
        const updatedMarker = {
          ...currentMenu.marker,
          photos: [...(currentMenu.marker.photos || []), ...savedPhotos],
          photoCount: (currentMenu.marker.photos?.length || 0) + savedPhotos.length,
          firstPhoto: currentMenu.marker.photos?.[0] || savedPhotos[0],
        };
        await api.markers.update(updatedMarker.id, {
          photoCount: updatedMarker.photoCount,
          firstPhoto: updatedMarker.firstPhoto,
        });
        setMarkers(prev =>
          prev.map(m =>
            m.id === updatedMarker.id
              ? {
                  ...m,
                  photoCount: updatedMarker.photoCount,
                  firstPhoto: updatedMarker.firstPhoto,
                }
              : m
          )
        );
        setMarkerMenu({ ...currentMenu, marker: updatedMarker });
        showToast('success', `已添加 ${savedPhotos.length} 张照片`);
      } catch (error) {
        showToast('error', '添加照片失败');
        console.error('添加照片错误:', error);
      }
    };
    input.click();
  };

  return (
    <>
      {contextPresence.mounted && activeContext && contextPlacement && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="添加地点照片"
          tabIndex={-1}
          aria-busy={processing}
          data-origin={contextPlacement.origin}
          className={`context-menu photo-add-menu ${isDragOver ? 'drag-over' : ''} ${contextPresence.exiting ? 'closing' : ''}`}
          style={{ left: contextPlacement.left, top: contextPlacement.top }}
          onDragEnter={e => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(true);
          }}
          onDragOver={e => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            setIsDragOver(true);
          }}
          onDragLeave={e => {
            e.preventDefault();
            e.stopPropagation();
            if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false);
          }}
          onDrop={handleContextDrop}
        >
          <button
            type="button"
            aria-label="关闭地点菜单"
            className="menu-close"
            onClick={closeContextMenu}
          >
            <MapIcon name="close" />
          </button>
          <div className="context-menu-header">
            <p className="photo-add-label">添加照片</p>
            <div className="place-name">
              <MapIcon name="pin" />
              <span className="photo-add-place" title={placeName}>
                {placeName}
              </span>
            </div>
            <div className="coords">
              <MapIcon name="globe" />
              <span>
                {activeContext.latlng.lat.toFixed(3)}°, {activeContext.latlng.lng.toFixed(3)}°
              </span>
            </div>
          </div>
          <div className="menu-actions">
            <button
              type="button"
              disabled={processing}
              className={`add-photo-zone ${isDragOver ? 'drag-active' : ''}`}
              onClick={() => addPhotoMarker(activeContext.latlng)}
            >
              <span className="zone-icon">
                <MapIcon name={isDragOver ? 'download' : 'photo'} />
              </span>
              <span className="photo-add-copy">
                <span className="zone-text">
                  {processing ? '正在添加照片…' : isDragOver ? '松开即可添加' : '点击选择照片'}
                </span>
                <span className="zone-hint">
                  {processing ? '请稍候' : isDragOver ? '照片会保存到此地点' : '或将照片拖到这里'}
                </span>
              </span>
            </button>
          </div>
        </div>
      )}

      {markerPresence.mounted && activeMarkerMenu && markerPlacement && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="地点详情"
          tabIndex={-1}
          aria-busy={processing}
          data-origin={markerPlacement.origin}
          className={`context-menu marker-detail-card ${hasPhotos ? 'has-collage' : ''} ${isMarkerDragOver ? 'drag-over' : ''} ${markerPresence.exiting ? 'closing' : ''}`}
          style={{ left: markerPlacement.left, top: markerPlacement.top }}
          onDragEnter={e => {
            e.preventDefault();
            e.stopPropagation();
            setIsMarkerDragOver(true);
          }}
          onDragOver={e => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            setIsMarkerDragOver(true);
          }}
          onDragLeave={e => {
            e.preventDefault();
            e.stopPropagation();
            if (!e.currentTarget.contains(e.relatedTarget)) setIsMarkerDragOver(false);
          }}
          onDrop={handleMarkerDrop}
        >
          <button
            type="button"
            aria-label="关闭地点菜单"
            className={`menu-close ${hasPhotos ? 'on-collage' : ''}`}
            onClick={() => setMarkerMenu(null)}
          >
            <MapIcon name="close" />
          </button>

          <MarkerCollage
            photos={markerPhotos}
            placeTitle={markerTitle}
            onOpenPhoto={openViewerAt}
          />

          <div className="context-menu-header">
            <div className="place-name" title={markerTitle}>
              <MapIcon name="pin" />
              <span>{markerTitle}</span>
            </div>
            <div className="meta-row">
              <span className="coords">
                {activeMarkerMenu.marker.lat.toFixed(3)}°,{' '}
                {activeMarkerMenu.marker.lng.toFixed(3)}°
              </span>
              <span className="photo-count">
                <MapIcon name="photo" /> {markerPhotos.length} 张
              </span>
            </div>
          </div>

          <div className="menu-actions">
            <div className={`menu-actions-primary ${!hasPhotos ? 'single' : ''}`}>
              {hasPhotos && (
                <button
                  type="button"
                  className="menu-btn primary view"
                  onClick={() => openViewerAt(0)}
                >
                  <span className="btn-icon">
                    <MapIcon name="photo" />
                  </span>
                  <span>查看照片</span>
                </button>
              )}
              <button
                type="button"
                className={`menu-btn primary add ${isMarkerDragOver ? 'drag-active' : ''}`}
                onClick={handleAddMarkerPhotos}
              >
                <span className="btn-icon">
                  <MapIcon name={isMarkerDragOver ? 'download' : 'plus'} />
                </span>
                <span>添加照片</span>
              </button>
            </div>

            <div className={`menu-actions-secondary ${!hasPhotos ? 'single' : ''}`}>
              {hasPhotos && (
                <button
                  type="button"
                  className="menu-btn note"
                  onClick={() => {
                    setNotesPanel({
                      markerId: activeMarkerMenu.marker.id,
                      marker: activeMarkerMenu.marker,
                      returnToMenu: activeMarkerMenu,
                    });
                    setMarkerMenu(null);
                  }}
                >
                  <span className="btn-icon">
                    <MapIcon name="edit" />
                  </span>
                  <span>备注</span>
                </button>
              )}
              <button
                type="button"
                className="menu-btn danger"
                onClick={() => {
                  deleteMarkerById(activeMarkerMenu.marker.id);
                  setMarkerMenu(null);
                }}
              >
                <span className="btn-icon">
                  <MapIcon name="trash" />
                </span>
                <span>删除标记</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {(contextMenu || markerMenu) && (
        <div className="context-overlay" onClick={closeContextMenu} />
      )}
    </>
  );
}

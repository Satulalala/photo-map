import { useState } from 'react';
import useMarkerMenuDrop from '../hooks/useMarkerMenuDrop.js';
import api from '@/api/index.js';
import MapIcon from './map/MapIcon.jsx';
import { useDialogFocus } from '../hooks/useDialogFocus.js';

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

  if (!contextMenu && !markerMenu) return null;

  return (
    <>
      {contextMenu && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="添加地点照片"
          tabIndex={-1}
          aria-busy={processing}
          className={`context-menu photo-add-menu ${isDragOver ? 'drag-over' : ''}`}
          style={{
            left: Math.max(12, Math.min(contextMenu.x, window.innerWidth - 292)),
            top: Math.max(12, Math.min(contextMenu.y, window.innerHeight - 220)),
          }}
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
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setIsDragOver(false);
            }
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
                {contextMenu.latlng.lat.toFixed(3)}°, {contextMenu.latlng.lng.toFixed(3)}°
              </span>
            </div>
          </div>
          <div className="menu-actions">
            <button
              type="button"
              disabled={processing}
              className={`add-photo-zone ${isDragOver ? 'drag-active' : ''}`}
              onClick={() => addPhotoMarker(contextMenu.latlng)}
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

      {markerMenu && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="地点详情"
          tabIndex={-1}
          aria-busy={processing}
          className={`context-menu ${isMarkerDragOver ? 'drag-over' : ''}`}
          style={{
            left: Math.max(12, Math.min(markerMenu.x, window.innerWidth - 292)),
            top: Math.max(12, Math.min(markerMenu.y, window.innerHeight - 340)),
          }}
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
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setIsMarkerDragOver(false);
            }
          }}
          onDrop={handleMarkerDrop}
        >
          <button
            type="button"
            aria-label="关闭地点菜单"
            className="menu-close"
            onClick={() => setMarkerMenu(null)}
          >
            <MapIcon name="close" />
          </button>
          <div className="context-menu-header">
            <div className="place-name">
              <MapIcon name="pin" />{' '}
              {markerMenu.marker.name ||
                `${markerMenu.marker.lat.toFixed(3)}°, ${markerMenu.marker.lng.toFixed(3)}°`}
            </div>
            <div className="meta-row">
              <span className="coords">
                {markerMenu.marker.lat.toFixed(3)}°, {markerMenu.marker.lng.toFixed(3)}°
              </span>
              <span className="photo-count">
                <MapIcon name="photo" /> {markerMenu.marker.photos?.length || 0} 张
              </span>
            </div>
          </div>
          <div className="menu-actions">
            <div className="menu-actions-primary">
              {markerMenu.marker.photos?.length > 0 && (
                <button
                  className="menu-btn primary view"
                  onClick={() => {
                    setPhotoViewer({
                      photos: markerMenu.marker.photos,
                      index: 0,
                      markerId: markerMenu.marker.id,
                      returnToMenu: markerMenu,
                    });
                    setMarkerMenu(null);
                  }}
                >
                  <span className="btn-icon">
                    <MapIcon name="photo" />
                  </span>
                  <span>查看照片</span>
                </button>
              )}
              <button
                className={`menu-btn primary add ${isMarkerDragOver ? 'drag-active' : ''}`}
                onClick={async () => {
                  const currentMenu = markerMenu;

                  if (window.electronAPI) {
                    showToast('info', '正在打开文件选择器...', 1000);
                    const photos = await window.electronAPI.selectPhotos();

                    if (photos?.length > 0) {
                      showToast('info', '正在处理照片...', 1000);

                      await window.electronAPI.addPhotosToMarker(
                        currentMenu.marker.id,
                        photos.map(p => ({
                          id: p.id,
                          note: '',
                        }))
                      );

                      const newPhotos = photos.map(p => ({ id: p.id, data: p.data, note: '' }));

                      setMarkers(prev => {
                        const newMarkers = prev.map(m =>
                          m.id === currentMenu.marker.id
                            ? {
                                ...m,
                                photoCount: (m.photoCount || 0) + photos.length,
                                firstPhoto: m.firstPhoto || newPhotos[0],
                              }
                            : m
                        );
                        return newMarkers;
                      });

                      const updatedMarker = {
                        ...currentMenu.marker,
                        photos: [...(currentMenu.marker.photos || []), ...newPhotos],
                        photoCount: (currentMenu.marker.photos?.length || 0) + photos.length,
                        firstPhoto: currentMenu.marker.photos?.[0] || newPhotos[0],
                      };
                      setMarkerMenu({ ...currentMenu, marker: updatedMarker });

                      showToast('success', `已添加 ${photos.length} 张照片`);
                    }
                  } else {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.multiple = true;
                    input.onchange = async e => {
                      const files = Array.from(e.target.files);
                      if (files.length === 0) return;

                      showToast('info', '正在处理照片...', 1000);

                      try {
                        const photoPromises = files.map(file => {
                          return new Promise(resolve => {
                            const reader = new FileReader();
                            reader.onload = e => {
                              resolve({
                                data: e.target.result,
                                note: '',
                              });
                            };
                            reader.readAsDataURL(file);
                          });
                        });

                        const photosData = await Promise.all(photoPromises);

                        const savedPhotos = await api.photos.addBatch(
                          currentMenu.marker.id,
                          photosData
                        );

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

                        setMarkers(prev => {
                          const newMarkers = prev.map(m =>
                            m.id === updatedMarker.id
                              ? {
                                  ...m,
                                  photoCount: updatedMarker.photoCount,
                                  firstPhoto: updatedMarker.firstPhoto,
                                }
                              : m
                          );
                          return newMarkers;
                        });

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
                <span className="btn-icon">
                  <MapIcon name={isMarkerDragOver ? 'download' : 'plus'} />
                </span>
                <span>添加照片</span>
              </button>
            </div>
            {markerMenu.marker.photos?.length > 0 && (
              <button
                className="menu-btn note"
                onClick={() => {
                  setNotesPanel({
                    markerId: markerMenu.marker.id,
                    marker: markerMenu.marker,
                    returnToMenu: markerMenu,
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
              className="menu-btn danger"
              onClick={() => {
                deleteMarkerById(markerMenu.marker.id);
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
      )}

      {(contextMenu || markerMenu) && (
        <div className="context-overlay" onClick={closeContextMenu} />
      )}
    </>
  );
}

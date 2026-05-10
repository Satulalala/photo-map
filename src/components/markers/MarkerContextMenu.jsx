import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import api from '@/api/index.js';

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

  if (!contextMenu && !markerMenu) return null;

  return (
    <>
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

            const name = await fetchPlaceName(contextMenu.latlng.lat, contextMenu.latlng.lng);

            const newMarker = {
              id: uuidv4(),
              lat: contextMenu.latlng.lat,
              lng: contextMenu.latlng.lng,
              name,
              photos: validPhotos,
              createdAt: Date.now()
            };
            if (window.electronAPI) await window.electronAPI.addMarker(newMarker);
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

            const currentMenu = markerMenu;
            if (window.electronAPI) {
              await window.electronAPI.addPhotosToMarker(currentMenu.marker.id, validPhotos);

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

              const updatedMarker = {
                ...currentMenu.marker,
                photos: [...(currentMenu.marker.photos || []), ...validPhotos],
                photoCount: (currentMenu.marker.photos?.length || 0) + validPhotos.length,
                firstPhoto: currentMenu.marker.photos?.[0] || validPhotos[0]
              };
              setMarkerMenu({ ...currentMenu, marker: updatedMarker });

              showToast('success', `已添加 ${validPhotos.length} 张照片`);
            } else {
              const savedPhotos = await api.photos.addBatch(currentMenu.marker.id, validPhotos);

              const updatedMarker = {
                ...currentMenu.marker,
                photos: [...(currentMenu.marker.photos || []), ...savedPhotos],
                photoCount: (currentMenu.marker.photos?.length || 0) + savedPhotos.length,
                firstPhoto: currentMenu.marker.photos?.[0] || savedPhotos[0]
              };

              await api.markers.update(updatedMarker.id, {
                photoCount: updatedMarker.photoCount,
                firstPhoto: updatedMarker.firstPhoto
              });

              setMarkers(prev => prev.map(m =>
                m.id === updatedMarker.id
                  ? {
                      ...m,
                      photoCount: updatedMarker.photoCount,
                      firstPhoto: updatedMarker.firstPhoto
                    }
                  : m
              ));

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
                    showToast('info', '正在打开文件选择器...', 1000);
                    const photos = await window.electronAPI.selectPhotos();

                    if (photos?.length > 0) {
                      showToast('info', '正在处理照片...', 1000);

                      await window.electronAPI.addPhotosToMarker(
                        currentMenu.marker.id,
                        photos.map(p => ({
                          id: p.id,
                          note: ''
                        }))
                      );

                      const newPhotos = photos.map(p => ({ id: p.id, data: p.data, note: '' }));

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
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.multiple = true;
                    input.onchange = async (e) => {
                      const files = Array.from(e.target.files);
                      if (files.length === 0) return;

                      showToast('info', '正在处理照片...', 1000);

                      try {
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

                        const savedPhotos = await api.photos.addBatch(currentMenu.marker.id, photosData);

                        const updatedMarker = {
                          ...currentMenu.marker,
                          photos: [...(currentMenu.marker.photos || []), ...savedPhotos],
                          photoCount: (currentMenu.marker.photos?.length || 0) + savedPhotos.length,
                          firstPhoto: currentMenu.marker.photos?.[0] || savedPhotos[0]
                        };

                        await api.markers.update(updatedMarker.id, {
                          photoCount: updatedMarker.photoCount,
                          firstPhoto: updatedMarker.firstPhoto
                        });

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
    </>
  );
}

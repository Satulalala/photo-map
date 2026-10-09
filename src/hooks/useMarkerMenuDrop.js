import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import api from '../api/index.js';
async function readPhotos(files, includeData) {
  return Promise.all(
    files.map(async file => {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('无法读取照片'));
        reader.readAsDataURL(file);
      });
      if (!window.electronAPI) return { data, note: '' };
      const result = await window.electronAPI.savePhotoFromBase64(data);
      return result ? { id: result.id, note: '', ...(includeData ? { data } : {}) } : null;
    })
  );
}

export default function useMarkerMenuDrop({
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
}) {
  const [processing, setProcessing] = useState(false);
  const pending = useRef(false);
  const handleContextDrop = async e => {
    e.preventDefault();
    e.stopPropagation();
    if (pending.current) return;
    pending.current = true;
    setProcessing(true);
    try {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length === 0) return;

      const photos = await readPhotos(files, false);

      const validPhotos = photos.filter(p => p);
      if (validPhotos.length === 0) return;

      const name = await fetchPlaceName(contextMenu.latlng.lat, contextMenu.latlng.lng);

      const newMarker = {
        id: uuidv4(),
        lat: contextMenu.latlng.lat,
        lng: contextMenu.latlng.lng,
        name,
        photos: validPhotos,
        createdAt: Date.now(),
      };
      if (window.electronAPI) await window.electronAPI.addMarker(newMarker);
      else {
        const saved = await api.markers.create(newMarker);
        newMarker.id = saved.id;
        await api.photos.addBatch(saved.id, validPhotos);
      }
      setNewMarkerIds(prev => new Set(prev).add(newMarker.id));
      setTimeout(
        () =>
          setNewMarkerIds(prev => {
            const s = new Set(prev);
            s.delete(newMarker.id);
            return s;
          }),
        600
      );
      refreshMarkers();
      setContextMenu(null);
      setPreviewPin(null);
    } catch {
      showToast('error', '照片处理失败，请重试');
    } finally {
      pending.current = false;
      setProcessing(false);
    }
  };
  const handleMarkerDrop = async e => {
    e.preventDefault();
    e.stopPropagation();
    if (pending.current) return;
    pending.current = true;
    setProcessing(true);
    try {
      e.preventDefault();
      e.stopPropagation();
      setIsMarkerDragOver(false);

      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length === 0) return;

      showToast('info', '正在处理照片...', 1000);

      const photos = await readPhotos(files, true);

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
                  firstPhoto: m.firstPhoto || validPhotos[0],
                }
              : m
          );
          return newMarkers;
        });

        const updatedMarker = {
          ...currentMenu.marker,
          photos: [...(currentMenu.marker.photos || []), ...validPhotos],
          photoCount: (currentMenu.marker.photos?.length || 0) + validPhotos.length,
          firstPhoto: currentMenu.marker.photos?.[0] || validPhotos[0],
        };
        setMarkerMenu({ ...currentMenu, marker: updatedMarker });

        showToast('success', `已添加 ${validPhotos.length} 张照片`);
      } else {
        const savedPhotos = await api.photos.addBatch(currentMenu.marker.id, validPhotos);

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
      }
    } catch {
      showToast('error', '照片处理失败，请重试');
    } finally {
      pending.current = false;
      setProcessing(false);
    }
  };
  return { handleContextDrop, handleMarkerDrop, processing };
}

import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import api from '../api/index.js';
import { photoUrlCache, thumbnailCache } from '../utils/LRUCache.ts';

export function usePhotoOperations(
  markers,
  setMarkers,
  showToast,
  refreshMarkers,
  selectedPhotos,
  mergeTargetPhoto,
  setSelectedPhotos,
  setMergeTargetPhoto,
  setShowMergeDialog,
  setBatchMode,
  mapMarkersRef,
  setContextMenu,
  setPreviewPin,
  setNewMarkerIds,
  fetchPlaceName,
  setNoteEditor,
) {
  // 选择/取消选择照片（批量操作）
  const handlePhotoSelect = useCallback((markerId, photoId, photoIndex) => {
    setSelectedPhotos(prev => {
      const exists = prev.find(p => p.markerId === markerId && p.photoId === photoId);
      if (exists) {
        return prev.filter(p => !(p.markerId === markerId && p.photoId === photoId));
      } else {
        return [...prev, { markerId, photoId, photoIndex }];
      }
    });
  }, [setSelectedPhotos]);

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
      const { webStorage } = await import('../api/index.js');

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
  }, [mergeTargetPhoto, selectedPhotos, markers, showToast, setMarkers, setSelectedPhotos, setMergeTargetPhoto, setShowMergeDialog, setBatchMode, refreshMarkers]);

  // 设为封面照片（将该照片移到 photos 数组第一位）
  const handleSetCover = useCallback(async (markerId, photo) => {
    try {
      const { webStorage } = await import('../api/index.js');
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
  }, [refreshMarkers, showToast, mapMarkersRef]);

  // 从标记列表删除单张照片
  const handleDeletePhotoFromList = useCallback(async (markerId, photoId) => {
    if (!confirm('确定删除这张照片？')) return;
    try {
      await api.photos.delete(markerId, photoId);
      const remaining = await api.photos.getByMarkerId(markerId);
      if (remaining.length === 0) {
        await api.markers.delete(markerId);
      } else {
        const { webStorage } = await import('../api/index.js');
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
  }, [refreshMarkers, showToast, mapMarkersRef]);

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
        const { webStorage } = await import('../api/index.js');
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
          const { webStorage } = await import('../api/index.js');
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

  return {
    handlePhotoSelect,
    handleMergePhotos,
    handleSetCover,
    handleDeletePhotoFromList,
    handleAddPhotoToMarker,
    addPhotoMarker,
    savePhotoNote,
    rotatePhoto,
    cropPhoto,
  };
}
